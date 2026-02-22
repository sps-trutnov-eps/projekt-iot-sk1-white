const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');

router.get('/mcu/:mcuId', EventController.getByMcuId);

router.delete('/clear', EventController.clearAll);

router.get('/recent', EventController.getRecent);

module.exports = router;