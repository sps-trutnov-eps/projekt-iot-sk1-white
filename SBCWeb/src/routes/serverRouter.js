const express = require('express');
const router = express.Router();
const ServerController = require('../controllers/serverController');

// Zobrazení HTML stránky (cesta: GET /server/)
router.get('/', ServerController.renderServer);

// API endpointy pro tvoje klientské JS (Fetch)
router.get('/all', ServerController.getAll);       // cesta: GET /server/all
router.post('/add', ServerController.create);      // cesta: POST /server/add
router.delete('/:id', ServerController.delete);    // cesta: DELETE /server/1

module.exports = router;