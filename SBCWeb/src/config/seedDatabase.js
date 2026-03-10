const db = require('./database');
const bcrypt = require('bcryptjs');

/**
 * Inicializace a seedování databáze pro typy MCU a výchozí Nastavení
 */
const seedDB = () => {
  // 1. Vytvoření tabulek
  db.exec(`
    CREATE TABLE IF NOT EXISTS types(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT UNIQUE NOT NULL
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

  // 2. Definice výchozích dat
  const mcuTypes = [
    'Raspberry Pi Pico W',
    'Raspberry Pi Pico 2W',
    'ESP32',
    'Arduino Nano'
  ];

  const defaultSettings = [
    { key: 'mqtt_broker_ip', value: '127.0.0.1', desc: 'IP adresa MQTT brokeru' },
    { key: 'mcu_ping_interval', value: '30000', desc: 'Interval pingu pro MCU (v ms)' },
    { key: 'server_ping_interval', value: '60000', desc: 'Interval pingu pro servery (v ms)' }
  ];

  // 3. Příprava SQL dotazů
  const insertTypeStmt = db.prepare(`INSERT OR IGNORE INTO types (type) VALUES (?)`);
  const insertSettingStmt = db.prepare(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`);

  // 4. Transakce pro bezpečný a rychlý zápis
  const insertManyTypes = db.transaction((types) => {
    for (const type of types) {
      insertTypeStmt.run(type);
    }
  });

  const insertManySettings = db.transaction((settings) => {
    for (const setting of settings) {
      insertSettingStmt.run(setting.key, setting.value, setting.desc);
    }
  });

  // 5. Spuštění seedování
  try {
    insertManyTypes(mcuTypes);
    insertManySettings(defaultSettings);

    // Výchozí admin uživatel (pokud ještě neexistuje)
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!existingUser) {
      const passwordHash = bcrypt.hashSync('admin', 10);
      db.prepare('INSERT INTO users (username, password_hash, must_change_password) VALUES (?, ?, 1)').run('admin', passwordHash);
      console.log('Výchozí admin uživatel vytvořen (admin/admin) – při prvním přihlášení bude vyžadována změna hesla!');
    }

    console.log('Databáze byla úspěšně seednuta (typy MCU a výchozí nastavení).');
  } catch (error) {
    console.error('Chyba při seedování databáze:', error.message);
  }
};

module.exports = seedDB;