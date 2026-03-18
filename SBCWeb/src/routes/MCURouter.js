const express = require('express');
const router = express.Router();
const MCUController = require('../controllers/MCUController.js');
const flashController = require('../controllers/flashController.js');
const deckController = require('../controllers/deckController.js');

// Hlavní stránka
router.post('/add', MCUController.createMCU);

router.get('/', MCUController.renderMCU);

router.get('/mcus', MCUController.getALLMCUs);

router.post('/delete', MCUController.deleteMCU);

router.post('/get', MCUController.getMCU);

router.post('/update', MCUController.updateMCU);

router.post('/update-api-key', MCUController.updateApiKey);

// Flash & šablony (MUSÍ být PŘED /:id catch-all)
router.get('/serial-ports', flashController.getSerialPorts);
router.get('/templates', flashController.getTemplates);
router.post('/templates/upload', flashController.uploadTemplate);
router.get('/templates/:filename', flashController.getTemplateContent);
router.delete('/templates/:filename', flashController.deleteTemplate);
router.post('/:id/flash', flashController.flashDevice);

// Deck konfigurace (MUSÍ být PŘED /:id catch-all)
router.get('/:id/deck-config', deckController.getDeckConfig);
router.post('/:id/deck-config', deckController.saveDeckConfig);
router.get('/:id/deck-config/available', deckController.getAvailableEntities);
router.post('/:id/deck-push', deckController.pushDeckConfig);

router.get('/:id', MCUController.renderMCUDetail)

module.exports = router;