const express = require('express');
const router = express.Router();
const CommandController = require('../controllers/commandController');

router.get('/all', CommandController.getAll);
router.post('/add', CommandController.create);
router.put('/edit/:id', CommandController.update); // TUTO ŘÁDKU MUSÍŠ PŘIDAT!
router.patch('/:id/favorite', CommandController.toggleFavorite);
router.get('/favorites', CommandController.getFavorites);
router.post('/run/:id', CommandController.run);
router.get('/history/recent', CommandController.getRecentHistory);
router.get('/history/:id', CommandController.getHistory);
router.delete('/history/all', CommandController.deleteAllHistory);

router.delete('/history/:id', CommandController.deleteHistory);
router.delete('/:id', CommandController.delete);

module.exports = router;
