const db = require('../config/database.js');
const Type = require('../models/Type.js');

class TypeRepository{
    static create(data) {

        const query = `
            INSERT INTO types (type)
            VALUES (?)
        `;
        
        const stmt = db.prepare(query);

        const value = data.type;
        
        const result = stmt.run(value);
        return result;
        
    }

    static find(id){
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
        const rows = stmt.all();

        return rows.map(r => new Type(r));
    }

    static findByName(name){
        const query = `SELECT * FROM types WHERE type = ?`;
        const row = db.prepare(query).get(name);

        return row ? new Type(row) : null
    }

    static delete(id) {
    const query = `DELETE FROM types WHERE id = ?`;
    
    const result = db.prepare(query).run(id);

    if (result.changes === 0) {
        return false; 
    }

    return true; 
    }

}

module.exports = TypeRepository;