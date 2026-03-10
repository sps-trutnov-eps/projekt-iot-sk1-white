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
  req.session.mustChangePassword = user.must_change_password === 1;

  if (req.session.mustChangePassword) {
    return res.redirect('/change-password');
  }

  res.redirect('/dashboard');
};

/** GET /change-password */
const getChangePassword = (req, res) => {
  res.render('change-password', { title: 'Změna hesla', error: null, success: null });
};

/** POST /change-password */
const postChangePassword = (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.render('change-password', { title: 'Změna hesla', error: 'Heslo musí mít alespoň 6 znaků.', success: null });
  }
  if (newPassword !== confirmPassword) {
    return res.render('change-password', { title: 'Změna hesla', error: 'Hesla se neshodují.', success: null });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .run(hash, req.session.userId);

  req.session.mustChangePassword = false;
  res.redirect('/dashboard');
};

/** POST /logout */
const postLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};

module.exports = { getLogin, postLogin, postLogout, getChangePassword, postChangePassword };
