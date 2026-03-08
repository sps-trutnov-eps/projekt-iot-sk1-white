const express = require('express');
const router = express.Router();
const wolController = require('../controllers/wolController');

router.post('/wake', wolController.wake);
router.post('/wake-by-command', wolController.wakeByCommand);

module.exports = router;