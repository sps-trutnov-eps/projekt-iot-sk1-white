// mqtt/MqttHandler.js
const mqtt = require('mqtt');
const MeasurementService = require('../services/MeasurementService');
const SettingService = require('../services/SettingsService');

class MqttHandler {
    static client = null;
    static currentIp = null;

    static init() {
        this.connect();

        SettingService.events.on('settingsUpdated', (newSettings) => {
            if (newSettings.mqtt_broker_ip && newSettings.mqtt_broker_ip !== this.currentIp) {
                console.log(`[MQTT] Detekována změna IP adresy brokeru z ${this.currentIp} na ${newSettings.mqtt_broker_ip}. Přepojuji...`);
                this.reconnect();
            }
        });
    }

    static connect() {
        this.currentIp = SettingService.getSettingValue('mqtt_broker_ip', '127.0.0.1');
        const BROKER_URL = `mqtt://${this.currentIp}:1883`;

        console.log(`[MQTT] Připojuji se k brokeru na: ${BROKER_URL}`);

        this.client = mqtt.connect(BROKER_URL);

        this.client.on('connect', () => {
            console.log('[MQTT] Úspěšně připojeno k brokeru.');

            // Odběr pro senzory
            this.client.subscribe('sensor/data');

            // Odběr pro výsledky spuštěných příkazů
            this.client.subscribe('server/+/status');

            // Odběr pro dashboard config request
            this.client.subscribe('dashboard/request/config');
            console.log('[MQTT] Subscribováno na dashboard/request/config');

            // Odběr pro WOL status zprávy od všech MCU
            this.client.subscribe('mcu/+/wol/status');
            console.log('[MQTT] Subscribováno na mcu/+/wol/status');

            // Pushni retenované konfigurace hned po připojení
            setTimeout(() => { this.pushAllConfigs(); }, 500);
        });

        this.client.on('message', async (topic, message) => {
            console.log(`[DEBUG MQTT] Přišla zpráva na topic: ${topic}`);

            // 1. Data ze senzorů
            if (topic === 'sensor/data') {
                try {
                    const payload = JSON.parse(message.toString());
                    await MeasurementService.processPayload(payload);
                } catch (error) {
                    console.error('[MQTT] Chyba při zpracování zprávy senzoru:', error.message);
                }
            }

            // 2. Požadavek o konfiguraci od Dashboard MCU
            if (topic === 'dashboard/request/config') {
                this.pushDashboardConfig();
            }

            // 3. Výsledky od Linuxového skriptu
            if (topic.startsWith('server/') && topic.endsWith('/status')) {
                try {
                    const payload = JSON.parse(message.toString());

                    if (payload.history_id) {
                        const CommandHistoryService = require('../services/CommandHistoryService');

                        CommandHistoryService.updateExecution(
                            payload.history_id,
                            payload.status,
                            payload.log,
                            null
                        );

                        console.log(`[MQTT] Zapsán výsledek pro historii ID: ${payload.history_id} (Stav: ${payload.status})`);
                    }
                } catch (error) {
                    console.error('[MQTT] Chyba při uložení výsledku příkazu:', error.message);
                }
            }

            // 4. WOL status zprávy od MCU (Pico)
            //    Topic format: mcu/{mcuId}/wol/status
            //    Payload: { mac, success, history_id?, error? }
            if (topic.startsWith('mcu/') && topic.endsWith('/wol/status')) {
                try {
                    const payload = JSON.parse(message.toString());
                    const mcuId = topic.split('/')[1];

                    console.log(`[MQTT] WOL status od MCU ${mcuId}: mac=${payload.mac}, success=${payload.success}`);

                    if (payload.history_id) {
                        const CommandHistoryService = require('../services/CommandHistoryService');

                        CommandHistoryService.updateExecution(
                            payload.history_id,
                            payload.success ? 'success' : 'error',
                            payload.success
                                ? `WOL magic packet úspěšně odeslán na ${payload.mac}`
                                : `WOL selhalo pro ${payload.mac}: ${payload.error || 'neznámá chyba'}`,
                            null
                        );

                        console.log(`[MQTT] WOL výsledek zapsán pro historii ID: ${payload.history_id}`);
                    }
                } catch (error) {
                    console.error('[MQTT] Chyba při zpracování WOL statusu:', error.message);
                }
            }
        });

        this.client.on('error', (err) => {
            console.error('[MQTT] Chyba připojení:', err.message);
        });
    }

    static pushDashboardConfig() {
        try {
            const ServerService = require('../services/ServerService');
            const CommandService = require('../services/commandService');
            const MCUService = require('../services/mcuService');
            const SensorService = require('../services/SensorService');

            console.log('[MQTT] Building and pushing dashboard config...');

            const serversRaw = ServerService.getAllServersWithCommands();
            const servers = serversRaw.map(s => ({
                id: s.id,
                name: s.name,
                ip: s.ip,
                status: s.status
            }));

            const commandsRaw = CommandService.getAllCommands();
            const commands = commandsRaw.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                server_id: c.server_id || c.serverId,
                // MAC adresa se přidá pouze u WOL příkazů — Pico ji potřebuje znát
                // MAC je uložená v c.command (stejné pole jako shell příkaz)
                ...(c.type === 'wol' && c.command ? { mac: c.command.trim() } : {})
            }));

            const mcusRaw = MCUService.getAllMCUs();
            const mcus = [];
            for (const mcu of mcusRaw) {
                const sensors = SensorService.getSensorsByDevice(mcu.id);
                const channels = [];
                if (sensors && Array.isArray(sensors)) {
                    for (const sensor of sensors) {
                        if (sensor.channels && Array.isArray(sensor.channels)) {
                            for (const ch of sensor.channels) {
                                channels.push({ id: ch.id, type: ch.type, unit: ch.unit || '' });
                            }
                        }
                    }
                }
                mcus.push({
                    id: mcu.id,
                    name: mcu.name,
                    apiKey: mcu.apiKey,
                    isOnline: mcu.is_online || 0,
                    channels
                });
            }

            const configPayload = { servers, commands, mcus, ts: Math.floor(Date.now() / 1000) };
            this.publishConfig('dashboard/config', configPayload);
            console.log(`[MQTT] Dashboard config odeslána (${mcus.length} MCU, ${servers.length} serverů, ${commands.length} příkazů).`);
        } catch (error) {
            console.error('[MQTT] Chyba při sestavení dashboard config:', error.message);
        }
    }

    /**
     * Odešle obecný příkaz (shell) na server.
     * Pro WOL používej publishWolCommand().
     *
     * @param {string} topic    - např. 'server/3/run'
     * @param {object} payload  - { command, history_id }
     */
    static publishCommand(topic, payload) {
        if (!this.client || !this.client.connected) {
            console.error('[MQTT] Nelze odeslat příkaz: MQTT klient není připojen k brokeru.');
            throw new Error('MQTT klient není připojen k brokeru.');
        }

        this.client.publish(topic, JSON.stringify(payload));
        console.log(`[MQTT] Odeslán příkaz na ${topic}:`, payload);
    }

    /**
     * Odešle WOL příkaz přes MCU (Pico).
     * MCU přijme zprávu na topic mcu/{mcuId}/command a odešle magic packet broadcastem.
     * Výsledek pošle zpátky na mcu/{mcuId}/wol/status.
     *
     * @param {number|string} mcuId     - ID MCU, které provede broadcast
     * @param {string}        mac       - MAC adresa cílového zařízení, formát 'AA:BB:CC:DD:EE:FF'
     * @param {number|null}   historyId - ID záznamu v historii příkazů (pro zpětný callback)
     */
    static publishWolCommand(mcuId, mac, historyId = null) {
        if (!this.client || !this.client.connected) {
            console.error('[MQTT] Nelze odeslat WOL příkaz: MQTT klient není připojen k brokeru.');
            throw new Error('MQTT klient není připojen k brokeru.');
        }

        const topic = `mcu/${mcuId}/command`;
        const payload = {
            action: 'wol',
            mac,
            ...(historyId !== null ? { history_id: historyId } : {})
        };

        this.client.publish(topic, JSON.stringify(payload));
        console.log(`[MQTT] WOL příkaz odeslán na ${topic}:`, payload);
    }

    static reconnect() {
        if (this.client) {
            this.client.end(true, () => {
                console.log('[MQTT] Staré připojení ukončeno.');
                this.connect();
            });
        } else {
            this.connect();
        }
    }

    static publishConfig(topic, payload) {
        if (this.client && this.client.connected) {
            this.client.publish(topic, JSON.stringify(payload), { retain: true });
            console.log(`[MQTT] Odeslána konfigurace (Retained) na ${topic}:`, payload);
        } else {
            console.error('[MQTT] Nelze odeslat konfiguraci: MQTT klient není připojen.');
        }
    }

    /**
     * Pushne retenované konfigurace pro všechny servery (whitelist příkazů) a
     * pro MCU dashboard (seznam serverů, příkazů, MCU).
     * Voláno automaticky při každém připojení k brokeru.
     */
    static pushAllConfigs() {
        try {
            const ServerService = require('../services/ServerService');

            // 1. Per-server command whitelist pro debian_executor.py
            const servers = ServerService.getAllServersWithCommands();
            for (const server of servers) {
                const commandMap = {};
                server.commands.forEach(cmd => {
                    commandMap[cmd.name] = cmd.value.split(' ').filter(Boolean);
                });
                this.publishConfig(`server/${server.id}/config`, { commands: commandMap });
            }

            // 2. Dashboard config pro MCU dashboard (Pico)
            this.pushDashboardConfig();

            console.log(`[MQTT] Počáteční sync dokončen (${servers.length} serverů).`);
        } catch (error) {
            console.error('[MQTT] Chyba při počátečním syncu konfigurací:', error.message);
        }
    }
}

module.exports = MqttHandler;
