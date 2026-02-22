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
      mcu_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (mcu_id) REFERENCES mcus(device_id) ON DELETE CASCADE
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
}

initDB();

console.log('Databáze inicializována (s kaskádovým mazáním)');

module.exports = initDB;