const db = require('../config/database.js');
const MCU = require('../models/MCU');

class MCURepository{
    static create(mcuData) {
        // is_online se automaticky nastaví na 0 podle výchozí hodnoty v DB
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
    
    static uniqueMac(mac){
        const query = `SELECT * FROM mcus WHERE mac_address=?`
        const row = db.prepare(query).get(mac);
        if(row){
            return false;
        }
        return true;
    }

    static findById(id){
        const query = `SELECT * FROM mcus WHERE device_id=?`
        const row = db.prepare(query).get(id);
        if(!row) return null;

        const mcu = new MCU({
            id: row.device_id,
            type: row.type_id, 
            name: row.name,
            ip_address: row.ip_address,
            mac_address: row.mac_address,
            description: row.description,
            location: row.location,
            last_seen: row.last_seen,
            is_online: row.is_online, // NOVÉ: Mapování statusu
            api_key: row.api_key
        });

        return mcu;
    }

    static findAll(){
        const query = `SELECT * FROM mcus ORDER BY name`
        const rows = db.prepare(query).all();
        return rows.map(row => new MCU({
            id: row.device_id,
            type: row.type_id, 
            name: row.name,
            ip_address: row.ip_address,
            mac_address: row.mac_address,
            description: row.description,
            location: row.location,
            last_seen: row.last_seen,
            is_online: row.is_online,
            api_key: row.api_key
        }));
    }

    static findByMac(macAddress) {
        const normalizedMac = macAddress.replace(/[-.]/g, ':').toLowerCase();
        
        const query = `SELECT * FROM mcus WHERE LOWER(mac_address) = ?`;
        return db.prepare(query).get(normalizedMac);
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
        const query = `UPDATE mcus SET last_seen = datetime('now'), is_online = 1 WHERE device_id = ?`;
        return db.prepare(query).run(id);
    }

    static updateOnlineStatus(id, newStatus) {
    if (![0, 1, 2].includes(newStatus)) {
        console.warn(`[MCURepository] Varování: Pokus o uložení neznámého stavu (${newStatus}) pro MCU ID ${id}`);
        newStatus = 0; 
    }

    const query = `UPDATE mcus SET is_online = ? WHERE device_id = ?`;
    const result = db.prepare(query).run(newStatus, id);
    
    return result;
    }

    static updateApiKey(id, apiKey) {
        const query = `UPDATE mcus SET api_key = ? WHERE device_id = ?`;
        return db.prepare(query).run(apiKey, id);
    }

    static delete(id) {
        const query = `DELETE FROM mcus WHERE device_id = ?`
        const result = db.prepare(query).run(id);
        return result;
    }

    static countActive() {
    // Příklad pro SQLite/MySQL pomocí db.prepare nebo db.query
    const row = db.prepare('SELECT COUNT(*) as count FROM mcus WHERE is_online = 1').get();
    return row ? row.count : 0;
    }
}

module.exports = MCURepository;