const db = require('../config/database.js');

class CommandHistoryRepository {
    static create(data) {
        const query = `
            INSERT INTO command_history (command_id, status, output, error_output, executed_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        const result = db.prepare(query).run(
            data.command_id,
            data.status, // např. 'success', 'error', 'running'
            data.output,
            data.error_output || null
        );
        return result.lastInsertRowid;
    }

    static getByCommandId(commandId, limit = 50) {
        const query = `SELECT * FROM command_history WHERE command_id = ? ORDER BY executed_at DESC LIMIT ?`;
        return db.prepare(query).all(commandId, limit);
    }

    // Přidej do třídy CommandHistoryRepository
    static update(id, status, output, errorOutput = null) {
        const query = `
            UPDATE command_history 
            SET status = ?, output = ?, error_output = ?
            WHERE id = ?
        `;
        db.prepare(query).run(status, output, errorOutput, id);
    }

    static getRecent(serverId = null, limit = 10) {
        let query = `
            SELECT ch.id, ch.status, ch.executed_at, c.name as command_name, s.name as server_name, s.id as server_id
            FROM command_history ch
            JOIN commands c ON ch.command_id = c.id
            JOIN servers s ON c.server_id = s.id
        `;
        const params = [];
        
        // Pokud chceme filtrovat jen pro jeden server
        if (serverId) {
            query += ` WHERE s.id = ?`;
            params.push(serverId);
        }
        
        query += ` ORDER BY ch.executed_at DESC LIMIT ?`;
        params.push(limit);

        return db.prepare(query).all(...params);
    }
    
    static getById(id) {
        const query = `SELECT * FROM command_history WHERE id = ?`;
        return db.prepare(query).get(id);
    }
}
module.exports = CommandHistoryRepository;