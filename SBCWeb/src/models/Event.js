class Event {
    constructor(data) {
        this.id = data.id || null;
        this.mcuId = data.mcu_id || data.mcuId || null;
        this.serverId = data.server_id || data.serverId || null; // PŘIDÁNO
        this.type = data.type; 
        this.message = data.message;
        this.timestamp = data.timestamp || new Date().toISOString();
        this.is_read = data.is_read || 0; // PŘIDÁNO: Status přečtení (0 = nepřečteno, 1 = přečteno)
    }

    toDatabase() {
        return {
            mcu_id: this.mcuId,
            server_id: this.serverId, // PŘIDÁNO
            type: this.type,
            message: this.message,
            timestamp: this.timestamp,
            is_read: this.is_read // PŘIDÁNO
        };
    }
}
module.exports = Event;