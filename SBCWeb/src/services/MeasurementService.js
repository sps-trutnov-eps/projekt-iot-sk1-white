// services/MeasurementService.js
const MCUService = require('../services/mcuService');
const SensorService = require('../services/SensorService');
const SocketService = require('../sockets/socketService');
const ReadingRepository = require('../repositories/ReadingRepository'); 
const EventService = require('../services/EventService');

class MeasurementService {
    
    static buffers = {}; 
    static thresholdStates = {};
    static mcuStates = {}; 

    static startAggregationWorker() {
        console.log('[MeasurementService] Startuji worker pro minutovou agregaci dat...');
        setInterval(() => {
            this.processMinuteAggregation();
        }, 60000); 
    }

    /**
     * Hlavní metoda volaná z MQTT Controlleru
     */
    static async processPayload(data) {
        // console.log("!!! MQTT DATA DORAZILA DO SERVERU !!!", data);
        try {
            if (!data.apiKey) return;
            
            const mcu = await MCUService.validateAndGetDevice(data.apiKey);
            if (!mcu) return;

            // Zápis do DB (aktualizuje timestamp, nastaví online stav a případně loguje připojení)
            await MCUService.updateLastSeen(mcu.id);

            // Načtení senzorů (včetně min_value a max_value)
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
                    
                    // --- KONTROLA THRESHOLDŮ (ALERTŮ) ---
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
        // Pokud nemá kanál nastavené žádné limity, nic se neděje
        if (channel.min_value === null && channel.max_value === null) return;

        const channelId = channel.id;
        
        // Inicializace paměti pro daný kanál, abychom nespamovali logy každou vteřinu
        if (!this.thresholdStates[channelId]) {
            this.thresholdStates[channelId] = { isExceeded: false };
        }

        const state = this.thresholdStates[channelId];
        let isCurrentlyExceeded = false;
        let reason = "";

        // Kontrola minima
        if (channel.min_value !== null && value < channel.min_value) {
            isCurrentlyExceeded = true;
            reason = `klesla na ${value} ${channel.unit || ''} (Limit: min ${channel.min_value} ${channel.unit || ''})`;
        } 
        // Kontrola maxima
        else if (channel.max_value !== null && value > channel.max_value) {
            isCurrentlyExceeded = true;
            reason = `stoupla na ${value} ${channel.unit || ''} (Limit: max ${channel.max_value} ${channel.unit || ''})`;
        }

        // Pokud to PRÁVĚ TEĎ překročilo limit a předtím to bylo OK
        if (isCurrentlyExceeded && !state.isExceeded) {
            state.isExceeded = true;
            
            // Voláme PŘÍMO EventService pro uložení a rozeslání notifikace
            EventService.logEvent(
                mcuId, 
                'alert', 
                `Kritická hodnota! Senzor "${channel.type}" ${reason}.`
            );
            
            console.log(`[ALERT] MCU ${mcuId} | ${channel.type} překročil limit!`);
        } 
        // Pokud se to PRÁVĚ TEĎ vrátilo do normálu a předtím to hlásilo chybu
        else if (!isCurrentlyExceeded && state.isExceeded) {
            state.isExceeded = false;
            
            EventService.logEvent(
                mcuId, 
                'info', 
                `Hodnota senzoru "${channel.type}" se úspěšně vrátila do normálu (${value} ${channel.unit || ''}).`
            );
            
            console.log(`[ALERT VYŘEŠEN] MCU ${mcuId} | ${channel.type} je zpět v normě.`);
        }
    }

    static addToBuffer(channelId, value) {
        if (!this.buffers[channelId]) this.buffers[channelId] = [];
        this.buffers[channelId].push(value);
    }

    /**
     * Agregace dat (minuta) - voláno z Controlleru (nebo Workru)
     */
    static processMinuteAggregation() {
        const SocketService = require('../sockets/socketService');
        let wasDbUpdated = false;

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
            wasDbUpdated = true;
            this.buffers[channelId] = [];
        }

        if (wasDbUpdated && SocketService.io) {
            SocketService.io.to('all_data').emit('db_changed');
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

    static getTodayReadingsCount() {
        return ReadingRepository.countTodayReadings();
    }
}

module.exports = MeasurementService;