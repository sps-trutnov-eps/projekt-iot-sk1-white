const express = require('express');
const router = express.Router();
const MCUController = require('../controllers/MCUController.js');

// Hlavní stránka
router.post('/add', MCUController.createMCU);

router.get('/mcu', MCUController.renderMCU);

router.get('/mcus', MCUController.getALLMCUs);

router.post('/delete', MCUController.deleteMCU);

router.post('/get', MCUController.getMCU);

router.post('/update', MCUController.updateMCU);

router.get('/detail', MCUController.renderMCUDetail)

module.exports = router;