// models/Sensor.js
class Sensor {
    constructor(data) {
        this.id = data.id || data.p_sensor_id || null;
        
        this.deviceId = data.device_id || data.deviceId;
        
        this.model = data.model;
        

        this.channels = data.channels || [];
    }

    toDatabase() {
        return {
            device_id: this.deviceId,
            model: this.model
        };
    }

    toJSON() {
        return {
            id: this.id,
            deviceId: this.deviceId,
            model: this.model,
            channels: this.channels 
        };
    }
}

module.exports = Sensor;