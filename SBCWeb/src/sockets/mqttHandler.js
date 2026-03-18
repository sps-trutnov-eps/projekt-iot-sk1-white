// mqtt/MqttHandler.js
const mqtt = require('mqtt');
const MeasurementService = require('../services/MeasurementService');
const SettingService = require('../services/SettingsService');
const config = require('../config/config');

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
        const BROKER_URL = `mqtt://${this.currentIp}:${config.mqtt_broker_port}`;

        console.log(`[MQTT] Připojuji se k brokeru na: ${BROKER_URL}`);

        this.client = mqtt.connect(BROKER_URL);

        this.client.on('connect', () => {
            console.log('[MQTT] Úspěšně připojeno k brokeru.');

            // Odběr pro senzory
            this.client.subscribe('sensor/data');

            // Odběr pro výsledky spuštěných příkazů
            this.client.subscribe('server/+/status');

            // Odběr pro dashboard config request (wildcard pro individuální decky)
            this.client.subscribe('dashboard/+/request/config');
            console.log('[MQTT] Subscribováno na dashboard/+/request/config');

            // Odběr pro WOL status zprávy od všech MCU
            this.client.subscribe('mcu/+/wol/status');
            console.log('[MQTT] Subscribováno na mcu/+/wol/status');

            // Pushni retenované konfigurace hned po připojení
            setTimeout(() => { this.pushAllConfigs(); }, config.mqtt_push_delay);
        });

        this.client.on('message', async (topic, message) => {
            // 1. Data ze senzorů
            if (topic === 'sensor/data') {
                try {
                    const payload = JSON.parse(message.toString());
                    await MeasurementService.processPayload(payload);
                } catch (error) {
                    console.error('[MQTT] Chyba při zpracování zprávy senzoru:', error.message);
                }
            }

            // 2. Požadavek o konfiguraci od Dashboard MCU (per-deck)
            //    Topic: dashboard/{apiKey}/request/config
            if (topic.startsWith('dashboard/') && topic.endsWith('/request/config')) {
                const parts = topic.split('/');
                if (parts.length === 4) {
                    const apiKey = parts[1];
                    this.pushDeckConfigByApiKey(apiKey);
                }
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

    /**
     * Pushne konfiguraci na všechny deck MCU (individuálně podle apiKey).
     */
    static pushDashboardConfig() {
        try {
            const MCUService = require('../services/mcuService');
            const allMcus = MCUService.getAllMCUs();
            const decks = allMcus.filter(m => m.role === 'deck' && m.apiKey);

            for (const deck of decks) {
                this.pushDeckConfig(deck.id);
            }

            if (decks.length === 0) {
                console.log('[MQTT] Žádné deck MCU pro push konfigurace.');
            }
        } catch (error) {
            console.error('[MQTT] Chyba při push dashboard config:', error.message);
        }
    }

    /**
     * Pushne filtrovanou konfiguraci na konkrétní deck (podle MCU ID).
     */
    static pushDeckConfig(deckId) {
        try {
            const DeckAssignmentService = require('../services/DeckAssignmentService');
            const MCURepository = require('../repositories/MCURepository');

            const deck = MCURepository.findById(deckId);
            if (!deck || !deck.apiKey) return;

            const configPayload = DeckAssignmentService.getFilteredConfig(deckId);
            const topic = `dashboard/${deck.apiKey}/config`;
            this.publishConfig(topic, configPayload);
            console.log(`[MQTT] Konfigurace odeslána na ${topic}`);
        } catch (error) {
            console.error(`[MQTT] Chyba při push deck config (ID ${deckId}):`, error.message);
        }
    }

    /**
     * Pushne konfiguraci na deck identifikovaný API klíčem (voláno z MQTT request).
     */
    static pushDeckConfigByApiKey(apiKey) {
        try {
            const MCURepository = require('../repositories/MCURepository');
            const deck = MCURepository.findByApiKey(apiKey);

            if (!deck) {
                console.warn(`[MQTT] Neznámý API klíč pro deck request: ${apiKey}`);
                return;
            }

            const deckId = deck.id || deck.device_id;
            this.pushDeckConfig(deckId);
        } catch (error) {
            console.error(`[MQTT] Chyba při push deck config by API key:`, error.message);
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
