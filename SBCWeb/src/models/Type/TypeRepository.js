const db = require('../database.js');
const Type = require('./Type.js');

class TypeRepository{
    static create(data) {

        const query = `
            INSERT INTO types (type)
            VALUES (?)
        `;
        
        const stmt = db.prepare(query);
        // ...existing code...
        const value = data.type ?? data.name;
        if (!value) {
            throw new Error('TypeRepository.create: no value to insert (data.type/data.name missing)');
        }

        try {
            const result = stmt.run(value);
            return result;
        } catch (error) {
            console.error('TypeRepository.create SQL error:', error && (error.stack || error), { query, value });
            throw error;
        }
    }

    static findById(id){
        const query = `
            SELECT * FROM types WHERE id = ?
        `

        const stmt = db.prepare(query);
        const param = (id && typeof id === 'object') ? id.id : id;
        const row = stmt.run(param);

        return row ? new Type(row) : null;

    }

    static findAll(){
        const query = `
            SELECT * FROM types
        `
        const stmt = db.prepare(query);
        const rows = stmt.run;

        return rows.map(r => new Type(r));
    }

}

module.exports = TypeRepository;