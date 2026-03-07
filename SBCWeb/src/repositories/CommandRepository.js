// repositories/CommandRepository.js
const db = require('../config/database.js'); 
const Command = require('../models/Command');

class CommandRepository {
    static create(commandData) {
        console.log(commandData);
        const query = `
            INSERT INTO commands (server_id, name, type, command, is_favorite, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `;
        const result = db.prepare(query).run(
            commandData.server_id,
            commandData.name,
            commandData.type,
            commandData.command,
            commandData.is_favorite || 0 // Defaultně 0
        );
        return result.lastInsertRowid;
    }

    static getAll() {
        const query = `
            SELECT c.*, s.name as server_name 
            FROM commands c
            LEFT JOIN servers s ON c.server_id = s.id
            ORDER BY c.is_favorite DESC, c.created_at DESC
        `;
        // Změnil jsem řazení: oblíbené (1) budou nahoře, pak zbytek podle data
        const rows = db.prepare(query).all();
        return rows.map(row => {
            const cmd = new Command(row);
            cmd.server_name = row.server_name;
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
        return result.changes > 0;
    }

    // Klasický update (nezahrnuje is_favorite, aby se nepřepsal při editaci)
    // repositories/CommandRepository.js

static update(id, data) {
    // Přidán server_id do SET části dotazu
    const query = `UPDATE commands SET name = ?, type = ?, command = ?, server_id = ? WHERE id = ?`;
    const result = db.prepare(query).run(data.name, data.type, data.command, data.server_id, id);
    console.log(data.server_id);
    console.log(result);
    return result.changes > 0;
}

    // NOVÉ: Speciální metoda jen pro přepínání oblíbených
    static toggleFavorite(id, isFavoriteStatus) {
        const query = `UPDATE commands SET is_favorite = ? WHERE id = ?`;
        const result = db.prepare(query).run(isFavoriteStatus ? 1 : 0, id);
        return result.changes > 0;
    }

    // repositories/CommandRepository.js (přidej dovnitř třídy CommandRepository)
    
    static getFavorites() {
        const query = `
            SELECT c.*, s.name as server_name 
            FROM commands c
            LEFT JOIN servers s ON c.server_id = s.id
            WHERE c.is_favorite = 1
            ORDER BY c.created_at DESC
        `;
        const rows = db.prepare(query).all();
        
        return rows.map(row => {
            const cmd = new Command(row);
            cmd.server_name = row.server_name;
            return cmd;
        });
    }
}

module.exports = CommandRepository;