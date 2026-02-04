const express = require('express');
const router = express.Router();
const MCUController = require('../controllers/MCUController.js');

// Hlavní stránka
router.post('/add', MCUController.addMCU)

router.get('/mcus', (req, res) => {
    res.render('mcus', { projectName: 'IoT Control' });
});

module.exports = router;