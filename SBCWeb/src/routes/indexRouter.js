const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// Hlavní stránka (login)
router.get('/', indexController.getIndex);

// Dashboard
router.get('/dashboard', (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard',
    projectName: 'IoT Control Panel'
  });
});

module.exports = router;
