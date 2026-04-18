const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

let exported;

if (DEMO_MODE) {
  // Per-session in-memory DB resolved via AsyncLocalStorage.
  // Any access outside a session context (e.g. background workers in non-demo code paths)
  // is a bug — those paths are skipped in server.js demo branch.
  const { getCurrentDb } = require('../demo/sessionContext');

  exported = new Proxy({}, {
    get(_, prop) {
      const db = getCurrentDb();
      if (!db) {
        throw new Error(`[DEMO] DB access outside session context (prop=${String(prop)})`);
      }
      const value = db[prop];
      return typeof value === 'function' ? value.bind(db) : value;
    },
  });

  console.log('[CONFIG] DEMO_MODE enabled — using per-session in-memory SQLite');
} else {
  exported = new Database(path.join(__dirname, '../..', config.database_path));
}

module.exports = exported;
