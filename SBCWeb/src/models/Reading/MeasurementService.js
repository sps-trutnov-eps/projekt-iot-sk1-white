const MCUService = require('../MCU/MCUService');
const SensorService = require('../Sensor/SensorService');
const SocketService = require('../socketService');
const ReadingRepository = require('./ReadingRepository'); 
// 1. Zkontroluj cestu, aby správně odkazovala na tvůj EventService soubor
const EventService = require('../Event/EventService');

class MeasurementService {
    
    // Buffer pro data: { 'channelId': [hodnoty...] }
    static buffers = {}; 
    
    // Paměť pro stavy limitů: { 'channelId': { isExceeded: boolean } }
    static thresholdStates = {};

    /**
     * Hlavní metoda volaná z MQTT Controlleru
     */
    static async processPayload(data) {
        try {
            if (!data.apiKey) return;
            
            const mcu = await MCUService.validateAndGetDevice(data.apiKey);
            if (!mcu) return;

            // Načtení senzorů (nyní by měly obsahovat i min_value a max_value)
            const sensors = await SensorService.getSensorsByDevice(mcu.id);

            const keyMap = {
                'temp': 'temperature',
                'hum': 'humidity',
                'press': 'pressure',
                'volt': 'voltage',
                'co2': 'generic',
                'rssi': 'signal'
            };

            for (const [jsonKey, value] of Object.entries(data)) {
                if (['apiKey', 'mac'].includes(jsonKey)) continue;

                const targetType = keyMap[jsonKey];
                if (!targetType) continue; 

                let targetChannel = null;
                
                // Hledání celého OBJEKTU kanálu
                if (sensors && Array.isArray(sensors)) {
                    for (const sensor of sensors) {
                        if (sensor.channels) {
                            targetChannel = sensor.channels.find(ch => ch.type === targetType);
                            if (targetChannel) break;
                        }
                    }
                }

                // POKUD JSME NAŠLI KANÁL
                if (targetChannel) {
                    const parsedValue = parseFloat(value);
                    
                    // --- NOVÁ LOGIKA: KONTROLA THRESHOLDŮ ---
                    this.checkThreshold(mcu.id, targetChannel, parsedValue);

                    // A) Uložit do bufferu pro minutový průměr DB
                    this.addToBuffer(targetChannel.id, parsedValue);

                    // B) ODESLAT DO SOCKETŮ (Live data)
                    SocketService.broadcastReading(mcu.id, targetChannel.id, parsedValue);
                }
            }

        } catch (error) {
            console.error("MeasurementService Error:", error.message);
        }
    }

    /**
     * Zkontroluje, zda hodnota překročila limity, a uloží to do DB pouze jednou (dokud se nevrátí do normálu)
     */
    static checkThreshold(mcuId, channel, value) {
        // Pokud kanál nemá nastavené žádné limity, přeskočíme
        if (channel.min_value === null && channel.max_value === null) return;

        const channelId = channel.id;
        
        // Inicializace stavu v paměti při prvním průchodu
        if (!this.thresholdStates[channelId]) {
            this.thresholdStates[channelId] = { isExceeded: false };
        }

        const state = this.thresholdStates[channelId];
        let isCurrentlyExceeded = false;
        let reason = "";

        // Zjištění, zda je aktuální hodnota mimo meze
        if (channel.min_value !== null && value < channel.min_value) {
            isCurrentlyExceeded = true;
            reason = `klesla pod limitní minimum (${channel.min_value} ${channel.unit || ''})`;
        } else if (channel.max_value !== null && value > channel.max_value) {
            isCurrentlyExceeded = true;
            reason = `stoupla nad limitní maximum (${channel.max_value} ${channel.unit || ''})`;
        }

        // 1. Změna z Normálu -> Došlo k překročení
        if (isCurrentlyExceeded && !state.isExceeded) {
            state.isExceeded = true;
            this.logEvent(mcuId, 'alert', `Hodnota ${channel.type} (${value} ${channel.unit || ''}) ${reason}.`);
        } 
        // 2. Změna z Překročení -> Návrat do normálu
        else if (!isCurrentlyExceeded && state.isExceeded) {
            state.isExceeded = false;
            this.logEvent(mcuId, 'info', `Hodnota ${channel.type} se úspěšně vrátila do normálu (${value} ${channel.unit || ''}).`);
        }
        // V ostatních případech (stále překročeno nebo stále normál) neděláme nic -> nespamujeme DB!
    }

    /**
     * Pomocná metoda pro zápis rovnou do tabulky event_logs
     */
    static logEvent(mcuId, type, message) {
        try {
            // ZMĚNA 2: Voláme tvou skvěle připravenou metodu, která zapíše do DB a přes Socket.io pošle event 'new_event' na frontend
            EventService.logEvent(mcuId, type, message);
            
            // Volitelně si to můžeš logovat i do serverové konzole:
            console.log(`[EVENT LOG] MCU ${mcuId} | ${type.toUpperCase()}: ${message}`);
        } catch (e) {
            console.error("Chyba při zápisu do event_logs přes EventService:", e);
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

            this.buffers[channelId] = [];
        }
    }

    static getReadingsHistory(channelId, range) {
        let modifier;
        switch (range) {
            case 'now': modifier = '-30 minutes'; break;
            case '1h':  modifier = '-1 hour'; break;
            case '24h': modifier = '-24 hours'; break;
            case '7d':  modifier = '-7 days'; break;
            default:    modifier = '-24 hours';
        }
        return ReadingRepository.getHistory(channelId, modifier);
    }
}

module.exports = MeasurementService;