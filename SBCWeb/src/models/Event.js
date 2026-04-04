class Event {
    constructor(data) {
        this.id = data.id || null;
        this.mcuId = data.mcu_id || data.mcuId || null;
        this.serverId = data.server_id || data.serverId || null;
        this.type = data.type;
        this.message = data.message;
        this.message_key = data.message_key || null;
        this.message_params = data.message_params || null;
        this.timestamp = data.timestamp || new Date().toISOString();
        this.is_read = data.is_read || 0;
    }

    toDatabase() {
        return {
            mcu_id: this.mcuId,
            server_id: this.serverId,
            type: this.type,
            message: this.message,
            message_key: this.message_key,
            message_params: this.message_params,
            timestamp: this.timestamp,
            is_read: this.is_read
        };
    }
}
module.exports = Event;