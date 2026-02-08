const db = require('../database.js');
const Type = require('./Type.js');

class TypeRepository{
    static create(data) {
        const query = `
            INSERT INTO types (type)
            VALUES (?)
        `;
        
        const stmt = db.prepare(query);
        const result = stmt.run(
            data.type
        );
        
        return result.lastInsertRowid;
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