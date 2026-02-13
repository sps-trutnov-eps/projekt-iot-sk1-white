// src/controllers/mqttHandler.js
const mqtt = require('mqtt');
const MeasurementService = require('../models/Measurement/MeasurementService');

class MqttHandler {
    static init() {
        const client = mqtt.connect('mqtt://192.168.1.100:1883');

        client.on('connect', () => {
            console.log("✅ MQTT: Broker připojen, odebírám sensor/data");
            client.subscribe('sensor/data');
        });

        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                console.log(data);
                // Sypeme data do statické service
                MeasurementService.addValue(data.mac, data.temp);
            } catch (e) {
                console.error("MQTT: Chyba formátu JSON");
            }
        });

        // Spuštění agregace každých 60 sekund
        setInterval(() => {
            MeasurementService.processMinuteAggregation();
        }, 5000);
    }
}

module.exports = MqttHandler;