const MCUService = require('../services/mcuService');
const SensorService = require('../services/SensorService');
const SocketService = require('../sockets/socketService');
const ReadingRepository = require('../repositories/ReadingRepository'); 
const EventService = require('../services/EventService');

class MeasurementService {
    
    static buffers = {}; 
    static thresholdStates = {};
    
    // NOVÉ: Paměť pro rychlé hlídání stavů bez zatěžování databáze
    static mcuStates = {}; 

    static startAggregationWorker() {
        console.log('[MeasurementService] Startuji worker pro minutovou agregaci dat...');
        setInterval(() => {
            this.processMinuteAggregation();
        }, 60000); 

        // NOVÉ: Spuštění našeho rychlého hlídače spojení
    }

    /**
     * Hlavní metoda volaná z MQTT Controlleru
     */
    static async processPayload(data) {
        console.log("!!! MQTT DATA DORAZILA DO SERVERU !!!", data)
        try {
            if (!data.apiKey) return;
            
            const mcu = await MCUService.validateAndGetDevice(data.apiKey);
            if (!mcu) return;

            // Zápis do DB (aktualizuje timestamp)
            await MCUService.updateLastSeen(mcu.id);
            console.log("Čas last_seen v databázi byl úspěšně aktualizován pro ID:", mcu.id);

            // NOVÉ: Aktualizace vnitřní paměti pro Watchdog
            const now = Date.now();
            const mcuIdStr = String(mcu.id);

            if (!this.mcuStates[mcuIdStr]) {
                // Pokud MCU vidíme poprvé po startu serveru
                this.mcuStates[mcuIdStr] = { lastSeen: now, status: 1 };
            } else {
                this.mcuStates[mcuIdStr].lastSeen = now;
                // Pokud bylo MCU předtím Offline (0) nebo Passive (2), "probudíme" ho do Online (1)
                if (this.mcuStates[mcuIdStr].status !== 1) {
                    this.mcuStates[mcuIdStr].status = 1;
                    
                    if (SocketService.io) {
                        SocketService.io.emit('mcu_status', { 
                            mcuId: mcu.id, 
                            status: 1, 
                            lastSeen: new Date().toISOString() 
                        });
                    }
                    
                    // TIP: Stejně tak tady můžeš zavolat MCUService.updateStatus(mcu.id, 1);
                }
            }

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
        if (channel.min_value === null && channel.max_value === null) return;

        const channelId = channel.id;
        
        if (!this.thresholdStates[channelId]) {
            this.thresholdStates[channelId] = { isExceeded: false };
        }

        const state = this.thresholdStates[channelId];
        let isCurrentlyExceeded = false;
        let reason = "";

        if (channel.min_value !== null && value < channel.min_value) {
            isCurrentlyExceeded = true;
            reason = `klesla pod limitní minimum (${channel.min_value} ${channel.unit || ''})`;
        } else if (channel.max_value !== null && value > channel.max_value) {
            isCurrentlyExceeded = true;
            reason = `stoupla nad limitní maximum (${channel.max_value} ${channel.unit || ''})`;
        }

        if (isCurrentlyExceeded && !state.isExceeded) {
            state.isExceeded = true;
            this.logEvent(mcuId, 'alert', `Hodnota ${channel.type} (${value} ${channel.unit || ''}) ${reason}.`);
        } 
        else if (!isCurrentlyExceeded && state.isExceeded) {
            state.isExceeded = false;
            this.logEvent(mcuId, 'info', `Hodnota ${channel.type} se úspěšně vrátila do normálu (${value} ${channel.unit || ''}).`);
        }
    }

    /**
     * Pomocná metoda pro zápis rovnou do tabulky event_logs
     */
    static logEvent(mcuId, type, message) {
        try {
            EventService.logEvent(mcuId, type, message);
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