// mqtt/MqttHandler.js (nebo kde máš soubor uložený)
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
            
            // Odběr pro senzory (původní)
            this.client.subscribe('sensor/data');
            
            // Odběr pro výsledky spuštěných příkazů (NOVÉ)
            this.client.subscribe('server/results'); 
        });

        // Zpracování všech příchozích zpráv
        this.client.on('message', async (topic, message) => {
            
            // 1. Zpracování dat ze senzorů
            if (topic === 'sensor/data') {
                try {
                    const payload = JSON.parse(message.toString());
                    await MeasurementService.processPayload(payload);
                } catch (error) {
                    console.error('[MQTT] Chyba při zpracování zprávy senzoru:', error.message);
                }
            }
            
            // 2. Zpracování výsledků od Linuxového skriptu (NOVÉ)
            if (topic === 'server/results') {
                try {
                    const payload = JSON.parse(message.toString());
                    
                    // Zajímá nás to jen v případě, že to má history_id (spouštěl to náš web)
                    if (payload.history_id) {
                        // Requirujeme Service až tady uvnitř, abychom zabránili tzv. "cyclic dependency" 
                        // (kdy by se soubory načítaly navzájem do nekonečna)
                        const CommandHistoryService = require('../services/CommandHistoryService');
                        
                        // Updatneme záznam v databázi podle ID
                        CommandHistoryService.updateExecution(
                            payload.history_id, 
                            payload.status,        // 'success' nebo 'error'
                            payload.output,        // standardní výstup (stdout)
                            payload.error_output   // chybový výstup (stderr)
                        );
                        
                        console.log(`[MQTT] Zapsán výsledek pro historii ID: ${payload.history_id} (Stav: ${payload.status})`);
                    }
                } catch (error) {
                    console.error('[MQTT] Chyba při uložení výsledku příkazu:', error.message);
                }
            }
        });

        this.client.on('error', (err) => {
            console.error('[MQTT] Chyba připojení:', err.message);
        });
    }

    // NOVÁ METODA PRO ODESÍLÁNÍ PŘÍKAZŮ
    static publishCommand(topic, payload) {
        if (this.client && this.client.connected) {
            this.client.publish(topic, JSON.stringify(payload));
            console.log(`[MQTT] Odeslán příkaz na ${topic}:`, payload);
        } else {
            console.error("[MQTT] Nelze odeslat příkaz: MQTT klient není připojen k brokeru.");
            throw new Error("MQTT klient není připojen k brokeru.");
        }
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
            // retain: true zajistí, že si broker zprávu pamatuje a pošle ji agentovi hned po jeho připojení
            this.client.publish(topic, JSON.stringify(payload), { retain: true });
            console.log(`[MQTT] Odeslána konfigurace (Retained) na ${topic}:`, payload);
        } else {
            console.error("[MQTT] Nelze odeslat konfiguraci: MQTT klient není připojen.");
        }
    }
}

module.exports = MqttHandler;