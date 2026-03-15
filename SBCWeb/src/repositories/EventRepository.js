const db = require('../config/database.js');
const Event = require('../models/Event');

class EventRepository {
    static create(eventData) {
        const query = `
            INSERT INTO event_logs (mcu_id, server_id, type, message, timestamp, is_read)
            VALUES (?, ?, ?, ?, datetime('now'), 0)
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
            INSERT INTO event_logs (mcu_id, server_id, type, message, timestamp, is_read)
            VALUES (NULL, NULL, ?, ?, datetime('now'), 0)
        `;
        db.prepare(query).run(type, message);
    }

    // Přidej do EventRepository.js
    static getRecent(limit = 20) {
        // Vytáhneme posledních X záznamů od nejnovějšího
        return db.prepare(`SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT ?`).all(limit);
    }

    // PŘIDÁNO: Počet nepřečtených notifikací
    static getUnreadCount() {
        const row = db.prepare("SELECT COUNT(*) as count FROM event_logs WHERE is_read = 0").get();
        return row ? row.count : 0;
    }

    // PŘIDÁNO: Označit notifikaci jako přečtenou
    static markAsRead(id) {
        const query = `UPDATE event_logs SET is_read = 1 WHERE id = ?`;
        const result = db.prepare(query).run(id);
        return result.changes > 0;
    }

    // PŘIDÁNO: Označit všechny notifikace jako přečtené
    static markAllAsRead() {
        const query = `UPDATE event_logs SET is_read = 1 WHERE is_read = 0`;
        const result = db.prepare(query).run();
        return result.changes;
    }
    
    static countTodayAlerts() {
    const row = db.prepare("SELECT COUNT(*) as count FROM event_logs WHERE type = 'alert' AND date(timestamp) = date('now')").get();
    return row ? row.count : 0;
    }

    static deleteAll() {
    const result = db.prepare(`DELETE FROM event_logs`).run();
    return result.changes; 
    }

    static deleteById(id) {
        const query = `DELETE FROM event_logs WHERE id = ?`;
        const result = db.prepare(query).run(id);
        
        return result.changes > 0;
    }

}
module.exports = EventRepository;