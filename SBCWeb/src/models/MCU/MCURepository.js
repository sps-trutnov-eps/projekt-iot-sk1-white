const db = require('../database.js');
const MCU = require('./MCU');

class MCURepository{
    static create(mcuData) {
        const query = `
            INSERT INTO mcus (name, type_id, ip_address, mac_address, location, description, api_key)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const stmt = db.prepare(query);
        const result = stmt.run(
            mcuData.name,
            mcuData.type,
            mcuData.ip_address,
            mcuData.mac_address,
            mcuData.location,
            mcuData.description,
            mcuData.api_key
        );
        
        return result.lastInsertRowid;
    }

    static findById(id){
        const query = `SELECT * FROM mcus WHERE device_id=?`
        const row = db.prepare(query).get(id);
        const mcu = new MCU({
        id: row.device_id,
        type: row.type_id, 
        name: row.name,
        ip_address: row.ip_address,
        mac_address: row.mac_address,
        description: row.description,
        location: row.location,
        last_seen: row.last_seen,
        api_key: row.api_key
        });

        return mcu;
    }

    static findAll(){
        const query = `SELECT * FROM mcus ORDER BY name`
        const rows = db.prepare(query).all();

        return rows.map(row => new MCU(row));
    }

    static findByMac(macAddress){
        const query = `SELECT * FROM mcus WHERE mac_address = ?`;
        const row = db.prepare(query).get(macAddress);

        return row ? new MCU(row) : null
    }

    static findByApiKey(apiKey) {
        const query = 'SELECT * FROM mcus WHERE api_key = ?';
        const row = db.prepare(query).get(apiKey);
        
        return row ? new MCU(row) : null;
    }

    static update(id, mcuData) {
        const query = `
            UPDATE mcus 
            SET name = ?, type_id = ?, ip_address = ?, mac_address = ?, 
                location = ?, description = ?
            WHERE device_id = ?
        `;
        
        db.prepare(query).run(
            mcuData.name,
            mcuData.type,
            mcuData.ip_address,
            mcuData.mac_address,
            mcuData.location,
            mcuData.description,
            id
        );
        
        return this.findById(id);
    }

    static updateLastSeen(id) {
        const query = `UPDATE mcus SET last_seen = datetime('now') WHERE device_id = ?`;
        const result = db.prepare(query).run(id);
        return result;
    }


    static delete(id) {
        const query = `DELETE FROM mcus WHERE device_id = ?`
        const result = db.prepare(query).run(id);
        return result;
    }


}

module.exports = MCURepository;