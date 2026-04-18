// services/MeasurementService.js
const config = require('../config/config');
const SensorService = require('../services/SensorService');
const SocketService = require('../sockets/socketService');
const ReadingRepository = require('../repositories/ReadingRepository'); 
const EventService = require('../services/EventService');

class MeasurementService {
    
    static buffers = {}; 
    static thresholdStates = {};
    static mcuStates = {}; 

    static startAggregationWorker() {
        setInterval(() => {
            this.processMinuteAggregation();
        }, config.measurement_aggregation_interval); 
    }


    

    /**
     * Hlavní metoda volaná z MQTT Controlleru
     */
    static async processPayload(data) {
        const MCUService = require('../services/mcuService');
        const MCURepository = require('../repositories/MCURepository');
        
        try {
            let mcu = null;

            // 1. POKUS O VALIDACI PŘES API KEY (novější firmware)
            if (data.apiKey) {
                mcu = await MCUService.validateAndGetDevice(data.apiKey);
            }

            // 2. FALLBACK: Pokud nemáme apiKey lub nenašli jsme MCU, zkusíme MAC adresu (starší firmware)
            if (!mcu && data.mac) {
                const mcuRow = MCURepository.findByMac(data.mac);
                if (mcuRow && mcuRow.device_id) {
                    mcu = MCURepository.findById(mcuRow.device_id);
                    if (mcu) {
                        console.log(`[MeasurementService] MCU nalezeno podle MAC: ${data.mac} -> ID: ${mcu.id}`);
                    }
                }
            }

            // Pokud jsme STÁLE nenašli MCU, vrátíme se
            if (!mcu) {
                console.warn(`[MeasurementService] MCU nenalezeno pro payload:`, data);
                return;
            }

            // Zápis do DB (aktualizuje timestamp, nastaví online stav a případně loguje připojení)
            await MCUService.updateLastSeen(mcu.id);

            // Načtení senzorů (včetně min_value a max_value)
            const sensors = await SensorService.getSensorsByDevice(mcu.id);

            const keyMap = {
                'temp':     'temperature',
                'hum':      'humidity',
                'press':    'pressure',
                'volt':     'voltage',
                'curr':     'current',      
                'power':    'power',        
                'energy':   'energy',       
                'rpm':      'fan',          
                'fan':      'fan',          
                'rssi':     'signal',
                'co2':      'co2',
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

                    // C) ODESLAT NA DASHBOARD MCU (MQTT live topic)
                    try {
                        const MqttHandler = require('../sockets/mqttHandler');
                        if (MqttHandler.client && MqttHandler.client.connected) {
                            MqttHandler.client.publish(
                                `dashboard/live/${mcu.apiKey}/${targetChannel.type}`,
                                JSON.stringify({
                                    value: parsedValue,
                                    unit: targetChannel.unit || '',
                                    name: targetChannel.type,
                                    mcuName: mcu.name,
                                    ts: Math.floor(Date.now() / 1000)
                                })
                            );
                        }
                    } catch (mqttErr) {
                        // Tiché selhání – dashboard není kritická funkce
                    }
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
        let criticalKey = null;
        let criticalParams = {};

        // Kontrola minima
        if (channel.min_value !== null && value < channel.min_value) {
            isCurrentlyExceeded = true;
            criticalKey = 'criticalValueMin';
            criticalParams = { sensorType: channel.type, value, unit: channel.unit || '', limit: channel.min_value };
        }
        // Kontrola maxima
        else if (channel.max_value !== null && value > channel.max_value) {
            isCurrentlyExceeded = true;
            criticalKey = 'criticalValueMax';
            criticalParams = { sensorType: channel.type, value, unit: channel.unit || '', limit: channel.max_value };
        }

        // Pokud to PRÁVĚ TEĎ překročilo limit a předtím to bylo OK
        if (isCurrentlyExceeded && !state.isExceeded) {
            state.isExceeded = true;
            EventService.logEvent(mcuId, 'alert', criticalKey, criticalParams);
        }
        // Pokud se to PRÁVĚ TEĎ vrátilo do normálu a předtím to hlásilo chybu
        else if (!isCurrentlyExceeded && state.isExceeded) {
            state.isExceeded = false;
            EventService.logEvent(mcuId, 'info', 'valueNormal', {
                sensorType: channel.type,
                value,
                unit: channel.unit || ''
            });
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


    static async recordMeasurement(mcuId, channel, value) {
        const parsedValue = parseFloat(value);

        // 1. Tady se děje to kouzlo - KONTROLA LIMITŮ
        this.checkThreshold(mcuId, channel, parsedValue);

        // 2. Uložení do bufferu pro grafy (minutová agregace)
        this.addToBuffer(channel.id, parsedValue);

        // 3. Odeslání do prohlížeče (Live data)
        SocketService.broadcastReading(mcuId, channel.id, parsedValue);
    }

}

module.exports = MeasurementService;