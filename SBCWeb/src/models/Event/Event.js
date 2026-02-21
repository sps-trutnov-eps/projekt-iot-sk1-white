class Event {
    constructor(data) {
        this.id = data.id || null;
        this.mcuId = data.mcu_id || data.mcuId;
        this.type = data.type; // 'info', 'warn', 'alert'
        this.message = data.message;
        this.timestamp = data.timestamp || new Date().toISOString();
    }

    toDatabase() {
        return {
            mcu_id: this.mcuId,
            type: this.type,
            message: this.message,
            timestamp: this.timestamp
        };
    }
}
module.exports = Event;