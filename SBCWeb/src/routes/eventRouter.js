const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');

router.get('/mcu/:mcuId', EventController.getByMcuId);

router.get('/server/:serverId', EventController.getByServerId);

router.delete('/clear', EventController.clearAll);

router.get('/recent', EventController.getRecent);

router.delete('/delete/:id', EventController.deleteSingle);

module.exports = router;