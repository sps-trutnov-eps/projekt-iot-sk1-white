const express = require('express');
const router = express.Router();
const SensorController = require('../controllers/sensorController');

// Definice tras (endpoints)
router.post('/', SensorController.createSensor);
router.get('/:id', SensorController.getSensorById);
router.delete('/:id', SensorController.deleteSensor);
router.post('/:id/channels', SensorController.addChannel);

router.get('/device/:deviceId', SensorController.getSensorsByDevice);

router.delete('/channel/:id', SensorController.deleteChannel);

// Přidej k ostatním routám v routeru (např. sensorRouter.js)
router.post('/threshold', SensorController.setThreshold);

module.exports = router;