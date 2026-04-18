const Database = require('better-sqlite3');
const initDB = require('../config/initDatabase.js');
const seedDB = require('../config/seedDatabase.js');
const seedDemo = require('./seedDemo');
const { run } = require('./sessionContext');

const TTL_MS = 30 * 60 * 1000;
const SWEEP_MS = 60 * 1000;

const sessions = new Map();

function createSession(sessionId) {
  const db = new Database(':memory:');
  run({ db, sessionId }, () => {
    initDB();
    seedDB();
    seedDemo();
  });
  const entry = { db, sessionId, lastAccess: Date.now(), ticker: null };
  sessions.set(sessionId, entry);
  console.log(`[DEMO] Created session DB ${sessionId.slice(0, 8)} (total: ${sessions.size})`);
  return entry;
}

function getOrCreate(sessionId) {
  let entry = sessions.get(sessionId);
  if (!entry) entry = createSession(sessionId);
  entry.lastAccess = Date.now();
  return entry;
}

function get(sessionId) {
  const entry = sessions.get(sessionId);
  if (entry) entry.lastAccess = Date.now();
  return entry;
}

function destroy(sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  if (entry.ticker) clearInterval(entry.ticker);
  try { entry.db.close(); } catch (_) {}
  sessions.delete(sessionId);
  console.log(`[DEMO] Destroyed session DB ${sessionId.slice(0, 8)} (remaining: ${sessions.size})`);
}

function sweep() {
  const now = Date.now();
  for (const [sid, entry] of sessions.entries()) {
    if (now - entry.lastAccess > TTL_MS) destroy(sid);
  }
}

setInterval(sweep, SWEEP_MS).unref();

module.exports = { getOrCreate, get, destroy, _sessions: sessions };
