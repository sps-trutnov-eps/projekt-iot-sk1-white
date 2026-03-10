const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/logout', authController.postLogout);

router.get('/change-password', (req, res, next) => {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  next();
}, authController.getChangePassword);

router.post('/change-password', (req, res, next) => {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  next();
}, authController.postChangePassword);

module.exports = router;
