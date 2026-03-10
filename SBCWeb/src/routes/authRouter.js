const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/logout', authController.postLogout);

router.post('/account/update-password', (req, res, next) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Nepřihlášen' });
  next();
}, authController.apiUpdatePassword);

router.post('/account/update-username', (req, res, next) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Nepřihlášen' });
  next();
}, authController.apiUpdateUsername);

router.get('/change-password', (req, res, next) => {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  // Pokud heslo není potřeba měnit, přesměruj na dashboard
  if (!req.session.mustChangePassword) return res.redirect('/dashboard');
  next();
}, authController.getChangePassword);

router.post('/change-password', (req, res, next) => {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  next();
}, authController.postChangePassword);

module.exports = router;
