const db = require('../database.js');
const Event = require('./Event');

class EventRepository {
    static create(eventData) {
        const query = `
            INSERT INTO event_logs (mcu_id, type, message, timestamp)
            VALUES (?, ?, ?, datetime('now'))
        `;
        const result = db.prepare(query).run(
            eventData.mcu_id,
            eventData.type,
            eventData.message
        );
        return result.lastInsertRowid;
    }

    // Pro načtení historie eventů na frontend
    static getByMcuId(mcuId, limit = 50) {
        const query = `SELECT * FROM event_logs WHERE mcu_id = ? ORDER BY timestamp DESC LIMIT ?`;
        const rows = db.prepare(query).all(mcuId, limit);
        return rows.map(row => new Event(row));
    }

    // Přidej do EventRepository.js
    static deleteAll() {
        return db.prepare(`DELETE FROM event_logs`).run();
    }

    // Přidej do EventRepository.js
    static getRecent(limit = 20) {
        // Vytáhneme posledních X záznamů od nejnovějšího
        return db.prepare(`SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT ?`).all(limit);
    }
}
module.exports = EventRepository;