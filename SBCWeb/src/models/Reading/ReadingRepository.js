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
}

module.exports = ReadingRepository;