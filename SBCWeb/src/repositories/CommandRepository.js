const db = require('../config/database.js'); // Zkontroluj cestu k tvé DB
const Command = require('../models/Command');

class CommandRepository {
    static create(commandData) {
        const query = `
            INSERT INTO commands (server_id, name, type, command, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        const result = db.prepare(query).run(
            commandData.server_id,
            commandData.name,
            commandData.type,
            commandData.command
        );
        return result.lastInsertRowid;
    }

    static getAll() {
        const query = `
            SELECT c.*, s.name as server_name 
            FROM commands c
            LEFT JOIN servers s ON c.server_id = s.id
            ORDER BY c.created_at DESC
        `;
        const rows = db.prepare(query).all();
        // Můžeme vrátit rovnou modely, nebo jen plain objekty z DB. 
        // Vracím modely (s tím, že server_name si tam můžeš na FE přidat)
        return rows.map(row => {
            const cmd = new Command(row);
            cmd.server_name = row.server_name; // Uchováme si i název serveru pro UI
            return cmd;
        });
    }

    static getById(id) {
        const query = `SELECT * FROM commands WHERE id = ?`;
        const row = db.prepare(query).get(id);
        return row ? new Command(row) : null;
    }

    static delete(id) {
        const query = `DELETE FROM commands WHERE id = ?`;
        const result = db.prepare(query).run(id);
        return result.changes > 0; // Vrací true, pokud byl záznam smazán
    }

    static update(id, data) {
        const query = `UPDATE commands SET name = ?, type = ?, command = ? WHERE id = ?`;
        const result = db.prepare(query).run(data.name, data.type, data.command, id);
        return result.changes > 0;
    }
}

module.exports = CommandRepository;