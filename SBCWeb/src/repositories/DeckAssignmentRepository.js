const db = require('../config/database.js');

class DeckAssignmentRepository {
    static getByDeckId(deckId) {
        return db.prepare(`
            SELECT * FROM deck_assignments WHERE deck_id = ?
        `).all(deckId);
    }

    static getServersForDeck(deckId) {
        return db.prepare(`
            SELECT s.* FROM deck_assignments da
            JOIN servers s ON da.entity_id = s.id
            WHERE da.deck_id = ? AND da.entity_type = 'server'
        `).all(deckId);
    }

    static getCommandsForDeck(deckId) {
        return db.prepare(`
            SELECT c.* FROM deck_assignments da
            JOIN commands c ON da.entity_id = c.id
            WHERE da.deck_id = ? AND da.entity_type = 'command'
        `).all(deckId);
    }

    static getMcusForDeck(deckId) {
        return db.prepare(`
            SELECT m.* FROM deck_assignments da
            JOIN mcus m ON da.entity_id = m.device_id
            WHERE da.deck_id = ? AND da.entity_type = 'mcu'
        `).all(deckId);
    }

    static assign(deckId, entityType, entityId) {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO deck_assignments (deck_id, entity_type, entity_id)
            VALUES (?, ?, ?)
        `);
        return stmt.run(deckId, entityType, entityId);
    }

    static unassign(deckId, entityType, entityId) {
        return db.prepare(`
            DELETE FROM deck_assignments
            WHERE deck_id = ? AND entity_type = ? AND entity_id = ?
        `).run(deckId, entityType, entityId);
    }

    static replaceAll(deckId, assignments) {
        const deleteStmt = db.prepare('DELETE FROM deck_assignments WHERE deck_id = ?');
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO deck_assignments (deck_id, entity_type, entity_id)
            VALUES (?, ?, ?)
        `);

        const transaction = db.transaction(() => {
            deleteStmt.run(deckId);
            for (const a of assignments) {
                insertStmt.run(deckId, a.entity_type, a.entity_id);
            }
        });

        transaction();
    }
}

module.exports = DeckAssignmentRepository;
