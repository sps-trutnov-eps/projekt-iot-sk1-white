const express = require('express');
const router = express.Router();
const SettingController = require('../controllers/settingsController');

// HTML Stránka
router.get('/', SettingController.renderSettings);

// API Endpointy
router.get('/get', SettingController.getSettings);
router.post('/save', SettingController.saveSettings);

module.exports = router;