const express = require('express');
const router = express.Router();
const CommandController = require('../controllers/commandController');

// API endpointy
router.get('/all', CommandController.getAll);      // cesta: GET /command/all
router.post('/add', CommandController.create);     // cesta: POST /command/add
router.delete('/:id', CommandController.delete);   // cesta: DELETE /command/1

module.exports = router;