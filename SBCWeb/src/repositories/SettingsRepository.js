const db = require('../config/database.js'); // uprav cestu podle sebe
const Setting = require('../models/Settings');

class SettingRepository {
    static getAll() {
        const query = `SELECT * FROM settings`;
        const rows = db.prepare(query).all();
        return rows.map(row => new Setting(row));
    }

    static getByKey(key) {
        const query = `SELECT * FROM settings WHERE setting_key = ?`;
        const row = db.prepare(query).get(key);
        return row ? new Setting(row) : null;
    }

    static update(key, value) {
        const query = `
            INSERT INTO settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(setting_key) DO UPDATE SET 
                setting_value = excluded.setting_value,
                updated_at = datetime('now')
        `;
        // Hodnotu převádíme na string, databáze ukládá vše jako TEXT
        const result = db.prepare(query).run(key, String(value));
        return result.changes > 0;
    }
}

module.exports = SettingRepository;