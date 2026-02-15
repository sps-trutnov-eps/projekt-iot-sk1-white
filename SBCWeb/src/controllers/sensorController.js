const SensorService = require('../models/Sensor/SensorService');

module.exports = {

    /**
     * POST /api/sensors
     * Vytvoří nový senzor (a volitelně i jeho kanály)
     * Body: { deviceId: 1, model: "DHT11", channels: [{type: "Teplota", unit: "°C"}] }
     */
    createSensor: (req, res) => {
        console.log('oh I hate niggers')
        try {
            const newSensor = SensorService.createSensor(req.body);
            
            res.status(201).json(newSensor);
        } catch (error) {

            res.status(400).json({ error: error.message });
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
            res.status(200).json(sensor);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    /**
     * GET /api/devices/:deviceId/sensors
     * Získá všechny senzory připojené k jednomu MCU
     */
    getSensorsByDevice: (req, res) => {
        try {
            const deviceId = req.params.deviceId;
            const sensors = SensorService.getSensorsByDevice(deviceId);
            res.status(200).json(sensors);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    /**
     * POST /api/sensors/:id/channels
     * Přidá novou veličinu (kanál) k existujícímu senzoru
     * Body: { type: "Tlak", unit: "hPa" }
     */
    addChannel: (req, res) => {
        try {
            const sensorId = req.params.id;
            const channelData = req.body;

            const result = SensorService.addChannel(sensorId, channelData);
            
            res.status(201).json({ 
                message: 'Kanál úspěšně přidán', 
                channelId: result 
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    /**
     * DELETE /sensor/sensors/:id
     * Smaže senzor
     */
    deleteSensor: (req, res) => {
        try {
            const id = req.params.id;
            const result = SensorService.deleteSensor(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: "Senzor nebyl nalezen nebo již byl smazán." });
            }

            res.status(200).json({ message: "Senzor byl úspěšně smazán." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};