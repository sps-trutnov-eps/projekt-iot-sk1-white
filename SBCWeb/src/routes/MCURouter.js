const express = require('express');
const router = express.Router();
const MCUController = require('../controllers/MCUController.js');
const DeckAssignmentController = require('../controllers/DeckAssignmentController.js');

// Hlavní stránka
router.post('/add', MCUController.createMCU);

router.get('/', MCUController.renderMCU);

router.get('/mcus', MCUController.getALLMCUs);

router.post('/delete', MCUController.deleteMCU);

router.post('/get', MCUController.getMCU);

router.post('/update', MCUController.updateMCU);

router.post('/update-api-key', MCUController.updateApiKey);

// Deck assignment routes (BEFORE /:id catch-all)
router.get('/deck/entities', DeckAssignmentController.getAvailableEntities);
router.get('/:id/deck-assignments', DeckAssignmentController.getAssignments);
router.post('/:id/deck-assignments', DeckAssignmentController.saveAssignments);

router.get('/:id', MCUController.renderMCUDetail)

module.exports = router;