const db = require('../config/database.js');

class DeckAssignmentRepository {

    /**
     * Vrátí všechna přiřazení pro daný deck
     */
    static findByDeckId(deckId) {
        return db.prepare(`
            SELECT * FROM deck_assignments WHERE deck_id = ? ORDER BY entity_type, entity_id
        `).all(deckId);
    }

    /**
     * Vrátí přiřazení podle typu entity (server/command/mcu)
     */
    static findByDeckAndType(deckId, entityType) {
        return db.prepare(`
            SELECT * FROM deck_assignments WHERE deck_id = ? AND entity_type = ?
        `).all(deckId, entityType);
    }

    /**
     * Přidá přiřazení entity k decku
     */
    static assign(deckId, entityType, entityId) {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO deck_assignments (deck_id, entity_type, entity_id)
            VALUES (?, ?, ?)
        `);
        return stmt.run(deckId, entityType, entityId);
    }

    /**
     * Odebere přiřazení entity z decku
     */
    static unassign(deckId, entityType, entityId) {
        return db.prepare(`
            DELETE FROM deck_assignments WHERE deck_id = ? AND entity_type = ? AND entity_id = ?
        `).run(deckId, entityType, entityId);
    }

    /**
     * Nastaví přiřazení pro deck — nahradí všechna stávající přiřazení daného typu
     * @param {number} deckId
     * @param {string} entityType - 'server' | 'command' | 'mcu'
     * @param {number[]} entityIds
     */
    static setAssignments(deckId, entityType, entityIds) {
        const deleteStmt = db.prepare(`
            DELETE FROM deck_assignments WHERE deck_id = ? AND entity_type = ?
        `);
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO deck_assignments (deck_id, entity_type, entity_id)
            VALUES (?, ?, ?)
        `);

        const transaction = db.transaction(() => {
            deleteStmt.run(deckId, entityType);
            for (const entityId of entityIds) {
                insertStmt.run(deckId, entityType, entityId);
            }
        });

        transaction();
    }

    /**
     * Uloží kompletní konfiguraci decku (všechny typy najednou)
     */
    static setFullConfig(deckId, config) {
        const deleteAll = db.prepare(`DELETE FROM deck_assignments WHERE deck_id = ?`);
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO deck_assignments (deck_id, entity_type, entity_id)
            VALUES (?, ?, ?)
        `);

        const transaction = db.transaction(() => {
            deleteAll.run(deckId);
            for (const type of ['server', 'command', 'mcu']) {
                const ids = config[type + 's'] || config[type] || [];
                for (const id of ids) {
                    insertStmt.run(deckId, type, id);
                }
            }
        });

        transaction();
    }

    /**
     * Smaže všechna přiřazení pro deck
     */
    static deleteAllForDeck(deckId) {
        return db.prepare(`DELETE FROM deck_assignments WHERE deck_id = ?`).run(deckId);
    }

    /**
     * Vrátí ID přiřazených serverů pro deck
     */
    static getAssignedServerIds(deckId) {
        return db.prepare(`
            SELECT entity_id FROM deck_assignments WHERE deck_id = ? AND entity_type = 'server'
        `).all(deckId).map(r => r.entity_id);
    }

    /**
     * Vrátí ID přiřazených příkazů pro deck
     */
    static getAssignedCommandIds(deckId) {
        return db.prepare(`
            SELECT entity_id FROM deck_assignments WHERE deck_id = ? AND entity_type = 'command'
        `).all(deckId).map(r => r.entity_id);
    }

    /**
     * Vrátí ID přiřazených MCU (senzorů) pro deck
     */
    static getAssignedMcuIds(deckId) {
        return db.prepare(`
            SELECT entity_id FROM deck_assignments WHERE deck_id = ? AND entity_type = 'mcu'
        `).all(deckId).map(r => r.entity_id);
    }

    /**
     * Vrátí všechny decky (MCU s role='deck')
     */
    static getAllDecks() {
        return db.prepare(`SELECT * FROM mcus WHERE role = 'deck' ORDER BY name`).all();
    }
}

module.exports = DeckAssignmentRepository;
