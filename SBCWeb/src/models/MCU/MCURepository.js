const db = require('../database.js');
const MCU = require('./MCU');

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
            is_online: row.is_online, // NOVÉ: Mapování statusu
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

    // NOVÉ: Pokud updatujeme last_seen, zařízení automaticky označíme jako online (1)
    static async updateLastSeen(id) {
        const query = `UPDATE mcus SET last_seen = datetime('now'), is_online = 1 WHERE device_id = ?`;
        const result = db.prepare(query).run(id);
        return result;
    }

    // NOVÉ: Speciální metoda pro explicitní změnu stavu (typicky z online na offline, když neodpoví ping)
    static updateOnlineStatus(id, isOnline) {
        console.log('zde')
        const status = isOnline ? 1 : 0;
        console.log('status:' + status)
        const query = `UPDATE mcus SET is_online = ? WHERE device_id = ?`;
        const result = db.prepare(query).run(status, id);
        console.log(result);
        return result;
    }

    static delete(id) {
        const query = `DELETE FROM mcus WHERE device_id = ?`
        const result = db.prepare(query).run(id);
        return result;
    }
}

module.exports = MCURepository;