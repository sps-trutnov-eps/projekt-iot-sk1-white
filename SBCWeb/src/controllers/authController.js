const bcrypt = require('bcryptjs');
const db = require('../config/database');

/** GET /login */
const getLogin = (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Přihlášení', error: null });
};

/** POST /login */
const postLogin = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', { title: 'Přihlášení', error: 'Vyplňte uživatelské jméno a heslo.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('login', { title: 'Přihlášení', error: 'Nesprávné uživatelské jméno nebo heslo.' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;

  res.redirect('/dashboard');
};

/** POST /logout */
const postLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};

module.exports = { getLogin, postLogin, postLogout };
