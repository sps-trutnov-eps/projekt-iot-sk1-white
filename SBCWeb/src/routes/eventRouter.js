const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');

router.get('/mcu/:mcuId', EventController.getByMcuId);

module.exports = router;