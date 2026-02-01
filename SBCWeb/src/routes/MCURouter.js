const express = require('express');
const router = express.Router();
const MCUController = require('../controllers/MCUController.js');

// Hlavní stránka
router.get('/create', MCUController.getTelemetryDebug)

module.exports = router;