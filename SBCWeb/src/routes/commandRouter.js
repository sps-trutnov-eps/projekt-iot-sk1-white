const express = require('express');
const router = express.Router();
const CommandController = require('../controllers/commandController');

router.get('/', CommandController.getAll);
router.post('/add', CommandController.create);
router.delete('/:id', CommandController.delete);

module.exports = router;