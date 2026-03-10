/**
 * Middleware pro ochranu tras – přesměruje nepřihlášeného uživatele na /login.
 * API požadavky (Accept: application/json nebo /api/ cesty) vrátí 401.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    // JSON API požadavky
    const isApiRequest =
      req.path.startsWith('/api/') ||
      (req.headers.accept && req.headers.accept.includes('application/json')) ||
      req.xhr;

    if (isApiRequest) {
      return res.status(401).json({ error: 'Nepřihlášen' });
    }
    return res.redirect('/login');
  }

  // Přihlášen, ale musí změnit heslo
  if (req.session.mustChangePassword) {
    return res.redirect('/change-password');
  }

  next();
}

module.exports = { requireAuth };
