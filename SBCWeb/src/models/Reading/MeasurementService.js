const MCUService = require('../MCU/MCUService');
const SensorService = require('../Sensor/SensorService');
const SocketService = require('../socketService')
const ReadingRepository = require('./ReadingRepository'); 

class MeasurementService {
    
    // Buffer pro data: { 'channelId': [hodnoty...] }
    static buffers = {}; 

    /**
     * Hlavní metoda volaná z MQTT Controlleru
     */
    static async processPayload(data) {
        try {
            // ... (Validace API Key a MCU zůstává stejná) ...
            if (!data.apiKey){
                 return;
            } 
            const mcu = await MCUService.validateAndGetDevice(data.apiKey);
            if (!mcu){
                 return;
            }

            // Update času
            MCUService.updateLastSeen(mcu.id).catch(err => console.error(err));
            
            // Načtení senzorů
            const sensors = await SensorService.getSensorsByDevice(mcu.id);

            const keyMap = {
                'temp': 'temperature',
                'hum': 'humidity',
                'press': 'pressure',
                'volt': 'voltage',
                'co2': 'generic',
                'rssi': 'signal'
            };

            // Zpracování dat
            for (const [jsonKey, value] of Object.entries(data)) {
                if (['apiKey', 'mac'].includes(jsonKey)) continue;

                const targetType = keyMap[jsonKey];
                if (!targetType) continue; 

                let targetChannelId = null;
                
                // Hledání ID kanálu (Vaše logika)
                if (sensors && Array.isArray(sensors)) {
                    for (const sensor of sensors) {
                        if (sensor.channels) {
                            const channel = sensor.channels.find(ch => ch.type === targetType);
                            if (channel) {
                                targetChannelId = channel.id;
                                break;
                            }
                        }
                    }
                }

                // POKUD JSME NAŠLI KANÁL, ULOŽÍME A ODESLEME
                if (targetChannelId) {
                    const parsedValue = parseFloat(value);
                    
                    // A) Uložit do bufferu pro DB (původní logika)
                    this.addToBuffer(targetChannelId, parsedValue);

                    // B) ODESLAT DO SOCKETŮ (Live data) <--- TOTO TAM CHYBĚLO
                    //console.log(`Posílám do Socketu: Kanál ${targetChannelId}, Hodnota ${parsedValue}`);
                SocketService.broadcastReading(mcu.id, targetChannelId, parsedValue);
                }
            }

        } catch (error) {
            console.error("MeasurementService Error:", error.message);
        }
    }

    static addToBuffer(channelId, value) {
        if (!this.buffers[channelId]) this.buffers[channelId] = [];
        this.buffers[channelId].push(value);
    }

    /**
     * Agregace dat (minuta) - voláno z Controlleru
     */
    static processMinuteAggregation() {
    for (const channelId in this.buffers) {
        const values = this.buffers[channelId];
        
        // Pokud nejsou data, funkce tiše pokračuje dál - ŽÁDNÝ SPAM
        if (!values || values.length === 0) continue;

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        
        ReadingRepository.save({
            channelId: parseInt(channelId),
            avg: avg.toFixed(2),
            min: min.toFixed(2),
            max: max.toFixed(2)
        });

        // Reset bufferu
        this.buffers[channelId] = [];
    }
}




    /**
     * Získá data pro graf podle rozsahu
     * @param {number} channelId 
     * @param {string} range - 'now', '1h', '24h', '7d'
     */
    static getReadingsHistory(channelId, range) {
        // 1. Validace - existuje kanál? (volitelné, ale dobré)
        // const channel = SensorRepository.findChannelById(channelId); // Pokud máš takovou metodu
        // if (!channel) throw new Error("Kanál neexistuje");

        // 2. Business Logika - Překlad rozsahu
        let modifier;
        switch (range) {
            case 'now': 
                modifier = '-30 minutes'; // "Teď" ukáže posledních 30 minut
                break;
            case '1h':  
                modifier = '-1 hour'; 
                break;
            case '24h': 
                modifier = '-24 hours'; 
                break;
            case '7d':  
                modifier = '-7 days'; 
                break;
            default:    
                modifier = '-24 hours'; // Default
        }

        // 3. Volání repozitáře
        return ReadingRepository.getHistory(channelId, modifier);
    }



}

module.exports = MeasurementService;