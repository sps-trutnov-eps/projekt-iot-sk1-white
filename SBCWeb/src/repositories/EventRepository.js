const db = require('../config/database.js');
const Event = require('../models/Event');

class EventRepository {
    static create(eventData) {
        const query = `
            INSERT INTO event_logs (mcu_id, server_id, type, message, timestamp)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        const result = db.prepare(query).run(
            eventData.mcu_id || null,    // Pokud není, vloží se NULL
            eventData.server_id || null, // Pokud není, vloží se NULL
            eventData.type,
            eventData.message
        );
        return result.lastInsertRowid;
    }

    // Načtení historie pro MCU
    static getByMcuId(mcuId, limit = 50) {
        const query = `SELECT * FROM event_logs WHERE mcu_id = ? ORDER BY timestamp DESC LIMIT ?`;
        const rows = db.prepare(query).all(mcuId, limit);
        return rows.map(row => new Event(row));
    }

    // PŘIDÁNO: Načtení historie pro Server
    static getByServerId(serverId, limit = 50) {
        const query = `SELECT * FROM event_logs WHERE server_id = ? ORDER BY timestamp DESC LIMIT ?`;
        const rows = db.prepare(query).all(serverId, limit);
        return rows.map(row => new Event(row));
    }

    // Systémové (globální) události nemají mcu_id ani server_id
    static logSystem(type, message) {
        const query = `
            INSERT INTO event_logs (mcu_id, server_id, type, message, timestamp)
            VALUES (NULL, NULL, ?, ?, datetime('now'))
        `;
        db.prepare(query).run(type, message);
    }


    // Přidej do EventRepository.js
    static getRecent(limit = 20) {
        // Vytáhneme posledních X záznamů od nejnovějšího
        return db.prepare(`SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT ?`).all(limit);
    }
    
    static countTodayAlerts() {
    const row = db.prepare("SELECT COUNT(*) as count FROM event_logs WHERE type = 'alert' AND date(timestamp) = date('now')").get();
    return row ? row.count : 0;
    }

}
module.exports = EventRepository;