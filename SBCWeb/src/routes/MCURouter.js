const express = require('express');
const router = express.Router();
const MCUController = require('../controllers/MCUController.js');

// Hlavní stránka
router.get('/add', MCUController.addMCU)

module.exports = router;