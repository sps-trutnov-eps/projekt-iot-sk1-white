const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');

router.get('/server', serverController.renderServer);

module.exports = router;