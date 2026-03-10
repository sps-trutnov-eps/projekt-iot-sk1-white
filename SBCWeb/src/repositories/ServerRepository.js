const db = require('../config/database.js'); 
const Server = require('../models/Server');

class ServerRepository {
    static create(serverData) {
        const query = `
            INSERT INTO servers (name, ip, api_key, type, is_online, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `;
        const result = db.prepare(query).run(
            serverData.name,
            serverData.ip,
            serverData.api_key,
            serverData.type,
            serverData.is_online
        );
        return result.lastInsertRowid;
    }

    static getAll() {
        const query = `SELECT * FROM servers ORDER BY created_at DESC`;
        const rows = db.prepare(query).all();
        return rows.map(row => new Server(row));
    }

    static getById(id) {
        const query = `SELECT * FROM servers WHERE id = ?`;
        const row = db.prepare(query).get(id);
        return row ? new Server(row) : null;
    }

    static delete(id) {
        const query = `DELETE FROM servers WHERE id = ?`;
        const result = db.prepare(query).run(id);
        return result.changes > 0;
    }

    static update(id, data) {
        const query = `UPDATE servers SET name = ?, ip = ?, api_key = ?, type = ? WHERE id = ?`;
        const result = db.prepare(query).run(data.name, data.ip, data.api_key, data.type, id);
        return result.changes > 0;
    }

    static updateApiKey(id, key) {
        const query = `UPDATE servers SET api_key = ? WHERE id = ?`;
        const result = db.prepare(query).run(key, id);
        return result.changes > 0;
    }

    static updateStatus(id, isOnline) {
        const query = `UPDATE servers SET is_online = ? WHERE id = ?`;
        const result = db.prepare(query).run(isOnline, id);
        return result.changes > 0;
    }
}

module.exports = ServerRepository;