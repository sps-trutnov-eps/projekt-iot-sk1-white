const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// Hlavní stránka – přesměrování na dashboard
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Dashboard
router.get('/dashboard', (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard',
    projectName: 'IoT Control Panel'
  });
});

module.exports = router;
