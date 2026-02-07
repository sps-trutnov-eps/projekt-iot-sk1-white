const db = require('./database');
function initDB() {

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
    api_key TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (type_id) REFERENCES types(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sensors (
    sensor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    unit TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id INTEGER NOT NULL,
    avg_value REAL,
    min_value REAL,
    max_value REAL,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS types(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT UNIQUE NOT NULL
  )
  `);

}

initDB();


console.log('Databáze inicializována');

module.exports = initDB;