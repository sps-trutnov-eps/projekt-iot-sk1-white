const mqtt = require('mqtt');
const MeasurementService = require('../models/Reading/MeasurementService');

class MqttHandler {
    
    static init() {

        const BROKER_URL = 'mqtt://192.168.1.100:1883'; 
        const TOPIC = 'sensor/data';

        console.log(`Připojuji se k MQTT: ${BROKER_URL}`);
        
        const client = mqtt.connect(BROKER_URL);

        client.on('connect', () => {
            console.log("MQTT: Broker připojen.");
            
            client.subscribe(TOPIC, (err) => {
                if (!err) {
                    console.log(`Odebírám téma: ${TOPIC}`);
                } else {
                    console.error("MQTT Subscribe Error:", err);
                }
            });
        });

        client.on('message', (topic, message) => {
            if (topic === TOPIC) {
                try {
                    // Parsujeme raw buffer na JSON
                    const payload = JSON.parse(message.toString());
                    
                    MeasurementService.processPayload(payload);

                } catch (e) {
                    console.error("MQTT Error: Neplatný formát JSON:", e.message);
                }
            }
        });

        client.on('error', (err) => {
            console.error("MQTT Connection Error:", err.message);
        });


        console.log("⏱️ Spouštím minutový časovač agregace...");
        
        setInterval(() => {
            MeasurementService.processMinuteAggregation();
        }, 60000);
    }
}

module.exports = MqttHandler;