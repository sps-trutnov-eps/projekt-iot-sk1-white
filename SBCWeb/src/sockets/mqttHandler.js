const mqtt = require('mqtt');
const MeasurementService = require('../services/MeasurementService');
const SettingService = require('../services/SettingsService');

class MqttHandler {
    static client = null;      // Zde budeme držet aktivní připojení
    static currentIp = null;   // Zde si pamatujeme aktuální IP

    static init() {
        // 1. První připojení při startu
        this.connect();

        // 2. Nastražíme uši na změnu nastavení
        SettingService.events.on('settingsUpdated', (newSettings) => {
            // Zajímá nás to jen tehdy, pokud se v payloadu poslala mqtt_broker_ip 
            // a pokud se liší od té, na kterou jsme aktuálně připojeni.
            if (newSettings.mqtt_broker_ip && newSettings.mqtt_broker_ip !== this.currentIp) {
                console.log(`[MQTT] Detekována změna IP adresy brokeru z ${this.currentIp} na ${newSettings.mqtt_broker_ip}. Přepojuji...`);
                this.reconnect();
            }
        });
    }

    static connect() {
        // Vytáhneme IP (výchozí localhost)
        this.currentIp = SettingService.getSettingValue('mqtt_broker_ip', '127.0.0.1');
        const BROKER_URL = `mqtt://${this.currentIp}:1883`; 
        
        console.log(`[MQTT] Připojuji se k brokeru na: ${BROKER_URL}`);
        
        // Připojíme se a uložíme si instanci
        this.client = mqtt.connect(BROKER_URL);

        this.client.on('connect', () => {
            console.log('[MQTT] Úspěšně připojeno k brokeru.');
            this.client.subscribe('sensor/data');
            // Zde máš zřejmě další logiku...
        });

        // Ošetření chyb, ať nám nespadne celá aplikace, když je IP špatná
        this.client.on('error', (err) => {
            console.error('[MQTT] Chyba připojení:', err.message);
        });
    }

    static reconnect() {
        if (this.client) {
            // Bezpečně ukončíme staré připojení (force = true) a v callbacku zavoláme connect
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