const SensorService = require('../models/Sensor/SensorService');
const SocketService = require('../models/socketService');
module.exports = {

    /**
     * POST /api/sensors
     * Vytvoří nový senzor (a volitelně i jeho kanály)
     */
    createSensor: (req, res) => {
        try {
            const newSensor = SensorService.createSensor(req.body);
            
            res.status(201).json({
                success: true,
                message: 'Senzor byl úspěšně vytvořen.',
                sensor: newSensor
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    /**
     * GET /api/sensors/:id
     * Získá detail senzoru podle ID
     */
    getSensorById: (req, res) => {
        try {
            const id = req.params.id;
            const sensor = SensorService.getSensorById(id);
            
            res.status(200).json({
                success: true,
                message: 'Senzor nalezen.',
                sensor: sensor
            });
        } catch (error) {
            res.status(404).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    /**
     * GET /api/devices/:deviceId/sensors
     * Získá všechny senzory připojené k jednomu MCU
     */
    /**
     * GET /api/devices/:deviceId/sensors
     * Získá všechny senzory připojené k jednomu MCU + aktuální LIVE hodnoty
     */
    getSensorsByDevice: (req, res) => {
        try {
            const deviceId = req.params.deviceId;
            
            // 1. Získání základní struktury z DB (Senzory a jejich kanály)
            const sensors = SensorService.getSensorsByDevice(deviceId);
            
            // 2. OBOHACENÍ O LIVE HODNOTY Z RAM
            const enrichedSensors = sensors.map(sensor => {
                
                // Zkontrolujeme, jestli má senzor nějaké kanály
                if (sensor.channels && Array.isArray(sensor.channels)) {
                    
                    const enrichedChannels = sensor.channels.map(channel => {
                        // Zeptáme se naší "RAM mezipaměti" na poslední hodnotu kanálu
                        const liveValue = SocketService.getLastValue(channel.id);
                        
                        return {
                            ...channel,
                            // Pokud máme hodnotu, vložíme ji. Pokud ne (např. po restartu serveru), dáme null
                            current_value: liveValue !== undefined ? liveValue : null
                        };
                    });

                    // Vrátíme senzor s obohacenými kanály
                    return {
                        ...sensor,
                        channels: enrichedChannels
                    };
                }

                return sensor; // Pokud nemá kanály, vrátíme ho beze změny
            });
            
            // 3. Odeslání na frontend
            res.status(200).json({
                success: true,
                message: 'Seznam senzorů načten.',
                sensors: enrichedSensors // <-- Odesíláme obohacená data!
            });
            
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    /**
     * POST /api/sensors/:id/channels
     * Přidá novou veličinu (kanál) k existujícímu senzoru
     */
    addChannel: (req, res) => {
        try {
            const sensorId = req.params.id;
            const channelData = req.body;

            const result = SensorService.addChannel(sensorId, channelData);
            
            res.status(201).json({ 
                success: true,
                message: 'Kanál úspěšně přidán.', 
                channelId: result 
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    /**
     * DELETE /api/sensors/:id
     * Smaže senzor
     */
    deleteSensor: (req, res) => {
        try {
            const id = req.params.id;
            const result = SensorService.deleteSensor(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Senzor nebyl nalezen nebo již byl smazán." 
                });
            }

            res.status(200).json({ 
                success: true,
                message: "Senzor byl úspěšně smazán." 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },


    // Přidej do module.exports objektu v Controlleru
    deleteChannel: (req, res) => {
        try {
            const id = req.params.id;
            const result = SensorService.deleteChannel(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Kanál nebyl nalezen nebo již byl smazán." 
                });
            }

            res.status(200).json({ 
                success: true,
                message: "Kanál byl úspěšně smazán." 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
};