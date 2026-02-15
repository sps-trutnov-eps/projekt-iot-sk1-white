// repositories/SensorRepository.js
const db = require('../database.js');
const Sensor = require('./Sensor');

class SensorRepository {


    static create(deviceId, model, channels = []) {
        const sensorQuery = `INSERT INTO physical_sensors (device_id, model) VALUES (?, ?)`;
        const info = db.prepare(sensorQuery).run(deviceId, model);
        const sensorId = info.lastInsertRowid;

        if (channels.length > 0) {
            const channelQuery = `
                INSERT INTO sensor_channels (physical_sensor_id, type, unit) 
                VALUES (?, ?, ?)
            `;
            const insertChannel = db.prepare(channelQuery);

            const insertMany = db.transaction((items) => {
                for (const item of items) {
                    insertChannel.run(sensorId, item.type, item.unit);
                }
            });

            insertMany(channels);
        }

        return sensorId;
    }

    static findById(id) {
        const sensorQuery = `SELECT * FROM physical_sensors WHERE id = ?`;
        const sensorRow = db.prepare(sensorQuery).get(id);

        if (!sensorRow) return null;

        const channelsQuery = `SELECT * FROM sensor_channels WHERE physical_sensor_id = ?`;
        const channelRows = db.prepare(channelsQuery).all(id);

        return new Sensor({
            ...sensorRow,
            channels: channelRows
        });
    }

    static findAllByDeviceId(deviceId) {
        const query = `SELECT * FROM physical_sensors WHERE device_id = ?`;
        const sensorRows = db.prepare(query).all(deviceId);

        return sensorRows.map(row => {
            const channels = db.prepare(`SELECT * FROM sensor_channels WHERE physical_sensor_id = ?`).all(row.id);
            return new Sensor({
                ...row,
                channels: channels
            });
        });
    }

    static addChannel(sensorId, type, unit) {
        const query = `INSERT INTO sensor_channels (physical_sensor_id, type, unit) VALUES (?, ?, ?)`;
        const result = db.prepare(query).run(sensorId, type, unit);
        return result.lastInsertRowid;
    }

    static delete(id) {
        db.prepare(`DELETE FROM sensor_channels WHERE physical_sensor_id = ?`).run(id);
        return db.prepare(`DELETE FROM physical_sensors WHERE id = ?`).run(id);
    }
}

module.exports = SensorRepository;