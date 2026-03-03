class Event {
    constructor(data) {
        this.id = data.id || null;
        this.mcuId = data.mcu_id || data.mcuId || null;
        this.serverId = data.server_id || data.serverId || null; // PŘIDÁNO
        this.type = data.type; 
        this.message = data.message;
        this.timestamp = data.timestamp || new Date().toISOString();
    }

    toDatabase() {
        return {
            mcu_id: this.mcuId,
            server_id: this.serverId, // PŘIDÁNO
            type: this.type,
            message: this.message,
            timestamp: this.timestamp
        };
    }
}
module.exports = Event;