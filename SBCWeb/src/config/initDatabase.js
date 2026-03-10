const db = require('./database');

function initDB() {
  // 1. ZCELA ZÁSADNÍ: Zapnutí podpory cizích klíčů v SQLite
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS types(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT UNIQUE NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS mcus (
      device_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type_id INTEGER,
      ip_address TEXT,
      mac_address TEXT UNIQUE,
      location TEXT,
      description TEXT,
      last_seen TEXT DEFAULT (datetime('now')),
      is_online INTEGER DEFAULT 0,
      api_key TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (type_id) REFERENCES types(id)
      -- Tady CASCADE nedáváme. Nechceme smazat všechny MCU, když smažeme jen štítek typu.
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS physical_sensors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      model TEXT,
      FOREIGN KEY (device_id) REFERENCES mcus(device_id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sensor_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      physical_sensor_id INTEGER NOT NULL,
      type TEXT, 
      unit TEXT, 
      FOREIGN KEY (physical_sensor_id) REFERENCES physical_sensors(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      avg_value REAL,
      min_value REAL,
      max_value REAL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (channel_id) REFERENCES sensor_channels(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS event_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mcu_id INTEGER, -- NULL pokud jde o server
      server_id INTEGER, -- NULL pokud jde o MCU
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (mcu_id) REFERENCES mcus(device_id) ON DELETE SET NULL,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_thresholds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL UNIQUE,
      min_value REAL,
      max_value REAL,
      FOREIGN KEY (channel_id) REFERENCES sensor_channels(id) ON DELETE CASCADE
    )
  `);

  // --- OPRAVENÁ TABULKA SERVERS ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      api_key TEXT, -- OPRAVA: Odstraněno NOT NULL, aby fungovalo jako volitelné
      type TEXT DEFAULT 'server', -- PŘIDÁNO: Rozlišení DB vs normální server
      is_online INTEGER DEFAULT 0, -- PŘIDÁNO: Sledování online/offline stavu
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

db.exec(`
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'shell',
      command TEXT NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    )
`);

    db.exec(`
    CREATE TABLE IF NOT EXISTS command_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      output TEXT,
      error_output TEXT,
      executed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (command_id) REFERENCES commands(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

}
initDB();

console.log('Databáze inicializována (s kaskádovým mazáním)');

module.exports = initDB;