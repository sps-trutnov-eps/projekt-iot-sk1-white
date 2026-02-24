const db = require('./database');

/**
 * Inicializace a seedování databáze pro typy MCU
 */
const seedDB = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS types(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT UNIQUE NOT NULL
    )
  `);

  const mcuTypes = [
    'Raspberry Pi Pico W',
    'Raspberry Pi Pico 2W',
    'ESP32',
    'Arduino Nano'
  ];

  const insertStmt = db.prepare(`INSERT OR IGNORE INTO types (type) VALUES (?)`);

  const insertMany = db.transaction((types) => {
    for (const type of types) {
      insertStmt.run(type);
    }
  });

  try {
    insertMany(mcuTypes);
    console.log('Databáze byla úspěšně seednuta typy MCU.');
  } catch (error) {
    console.error('Chyba při seedování databáze:', error.message);
  }
};

module.exports = seedDB;