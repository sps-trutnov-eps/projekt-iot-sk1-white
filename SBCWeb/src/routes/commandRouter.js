const express = require('express');
const router = express.Router();
const CommandController = require('../controllers/commandController');

router.get('/all', CommandController.getAll);
router.post('/add', CommandController.create);
router.put('/edit/:id', CommandController.update); // TUTO ŘÁDKU MUSÍŠ PŘIDAT!
router.delete('/:id', CommandController.delete);

module.exports = router;