const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');

// Hlavní stránka
router.get('/', telemetryController.getTelemetryDebug)
router.get('/getdata', telemetryController.getData);
router.post('/receive', telemetryController.receiveData);

module.exports = router;