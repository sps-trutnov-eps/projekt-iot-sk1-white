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
            this.client.subscribe('sensor/data');
        });

        // ---------------------------------------------------------
        // TATO ČÁST CHYBĚLA: Poslech a zpracování příchozích dat
        // ---------------------------------------------------------
        this.client.on('message', async (topic, message) => {
            if (topic === 'sensor/data') {
                try {
                    const payload = JSON.parse(message.toString());
                    // console.log(`[MQTT] Přijata data:`, payload); // Odkomentuj pro debug
                    
                    // Odeslání do MeasurementService pro agregaci a uložení
                    await MeasurementService.processPayload(payload);
                    
                } catch (error) {
                    console.error('[MQTT] Chyba při zpracování zprávy:', error.message);
                }
            }
        });

        this.client.on('error', (err) => {
            console.error('[MQTT] Chyba připojení:', err.message);
        });
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
}

module.exports = MqttHandler;