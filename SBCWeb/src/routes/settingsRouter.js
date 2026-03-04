const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');

// Zobrazení HTML stránky (cesta: GET /server/)
router.get('/', SettingsController.renderSettings);


module.exports = router;