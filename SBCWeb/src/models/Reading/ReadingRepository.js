const db = require('../database');

class ReadingRepository {
    
    /**
     * Uloží vypočítanou statistiku (min, max, avg) do DB
     */
    static save(stats) {
        const query = `
            INSERT INTO readings (channel_id, avg_value, min_value, max_value, timestamp)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        
        const result = db.prepare(query).run(
            stats.channelId, 
            stats.avg, 
            stats.min, 
            stats.max
        );
        
        return result.lastInsertRowid;
    }

    /**
     * Získá historii měření pro graf.
     * @param {number} channelId - ID kanálu
     * @param {string} timeModifier - SQL modifikátor času (např. '-1 hour', '-7 days')
     */
    static getHistory(channelId, timeModifier) {
        const query = `
            SELECT 
                avg_value as avg, 
                min_value as min, 
                max_value as max, 
                timestamp 
            FROM readings 
            WHERE channel_id = ? 
            AND timestamp >= datetime('now', ?)
            ORDER BY timestamp ASC
        `;
        return db.prepare(query).all(channelId, timeModifier);
    }
}

module.exports = ReadingRepository;