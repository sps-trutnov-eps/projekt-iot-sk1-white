const sessionStore = require('../demo/sessionStore');
const { run } = require('../demo/sessionContext');
const { ensureTicker } = require('../demo/sensorTicker');

function demoSessionMiddleware(req, res, next) {
  if (!req.session) return next();
  const sessionId = req.session.id;
  const entry = sessionStore.getOrCreate(sessionId);
  ensureTicker(sessionId);
  run({ db: entry.db, sessionId }, () => next());
}

module.exports = demoSessionMiddleware;
