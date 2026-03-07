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
}
module.exports = CommandHistoryRepository;