const mqtt = require('mqtt');
const MeasurementService = require('../models/Reading/MeasurementService');

class MqttHandler {
    
    static init() {

        const BROKER_URL = 'mqtt://127.0.0.1:1883'; 
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
    // TÍMTO ZJISTÍME, JESTLI VŮBEC NĚCO CHODÍ A NA JAKÉ TÉMA

    if (topic === TOPIC) {
        try {
            const payload = JSON.parse(message.toString());
           MeasurementService.processPayload(payload);
        } catch (e) {
            console.error("MQTT Error: Neplatný formát JSON:", e.message);
        }
    } else {
        // Tímto odhalíme, pokud se téma o kousek liší
        console.log(`Téma se neshoduje! Očekáváno: "${TOPIC}", ale přišlo: "${topic}"`);
    }
});

        client.on('error', (err) => {
            console.error("MQTT Connection Error:", err.message);
        });
        
        setInterval(() => {
            MeasurementService.processMinuteAggregation();
        }, 5000);
    }
}

module.exports = MqttHandler;