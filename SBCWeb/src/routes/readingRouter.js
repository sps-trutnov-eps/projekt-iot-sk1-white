const express = require('express');
const router = express.Router();
const ReadingController = require('../controllers/readingController');

router.post('/history', ReadingController.getReadingsHistory);

router.post('/latest-all', ReadingController.getLatestAll);

module.exports = router;