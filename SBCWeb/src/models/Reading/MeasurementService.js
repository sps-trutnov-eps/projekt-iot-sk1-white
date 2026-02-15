const MCUService = require('../MCU/MCUService');
const SensorService = require('../Sensor/SensorService');

const ReadingRepository = require('./ReadingRepository'); 

class MeasurementService {
    
    // Buffer pro data: { 'channelId': [hodnoty...] }
    static buffers = {}; 

    /**
     * Hlavní metoda volaná z MQTT Controlleru
     */
    static async processPayload(data) {
        try {
            // 1. Validace vstupu
            if (!data.apiKey) {
                console.warn("MQTT: Data bez API klíče.");
                return;
            }

            // 2. Volání MCUService (Místo Repa)
            // Service se postará o validaci a vrácení objektu zařízení
            const mcu = await MCUService.validateAndGetDevice(data.apiKey);
            
            if (!mcu) {
                console.warn(`MQTT: Neznámé zařízení (API Key: ${data.apiKey})`);
                return;
            }

            // 3. Volání MCUService pro update času (Fire & Forget)
            MCUService.updateLastSeen(mcu.id).catch(err => console.error(err));

            // 4. Volání SensorService (Místo Repa)
            // Získáme konfiguraci senzorů pro toto zařízení
            const sensors = await SensorService.getSensorsByDevice(mcu.id);

            // 5. Mapování (Pico klíč -> DB Typ)
            const keyMap = {
                'temp': 'temperature',
                'hum': 'humidity',
                'press': 'pressure',
                'volt': 'voltage',
                'co2': 'generic',
                'rssi': 'signal'
            };

            // 6. Zpracování a bufferování
            for (const [jsonKey, value] of Object.entries(data)) {
                if (['apiKey', 'mac'].includes(jsonKey)) continue;

                const targetType = keyMap[jsonKey];
                if (!targetType) continue; 

                // Hledání ID kanálu v datech, která nám vrátil SensorService
                let targetChannelId = null;
                
                // Iterujeme přes senzory a jejich kanály
                if (sensors && Array.isArray(sensors)) {
                    for (const sensor of sensors) {
                        if (sensor.channels && Array.isArray(sensor.channels)) {
                            const channel = sensor.channels.find(ch => ch.type === targetType);
                            if (channel) {
                                targetChannelId = channel.id;
                                break;
                            }
                        }
                    }
                }

                // Přidání do bufferu
                if (targetChannelId) {
                    this.addToBuffer(targetChannelId, parseFloat(value));
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
        // console.log("⏱️ Agregace...");
        
        for (const channelId in this.buffers) {
            const values = this.buffers[channelId];
            if (!values || values.length === 0) continue;

            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            // Uložení statistiky přes vlastní Repository
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