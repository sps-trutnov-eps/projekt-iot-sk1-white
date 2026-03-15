const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');

router.get('/mcu/:mcuId', EventController.getByMcuId);

router.get('/server/:serverId', EventController.getByServerId);

router.get('/unread-count', EventController.getUnreadCount);

router.put('/mark-as-read/:id', EventController.markAsRead);

router.put('/mark-all-as-read', EventController.markAllAsRead);

router.delete('/clear', EventController.clearAll);

router.get('/recent', EventController.getRecent);

router.delete('/delete/:id', EventController.deleteSingle);

module.exports = router;