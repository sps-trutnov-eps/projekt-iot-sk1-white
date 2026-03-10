/**
 * Middleware pro ochranu tras – přesměruje nepřihlášeného uživatele na /login.
 * API požadavky (Accept: application/json nebo /api/ cesty) vrátí 401.
 * Přidává Cache-Control: no-store, aby prohlížeč necachoval chráněné stránky.
 */
function requireAuth(req, res, next) {
  // Zakázat cacheování – prohlížeč nesmí zobrazit stránku po odhlášení
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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
