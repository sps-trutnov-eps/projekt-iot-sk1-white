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
        const channels = db.prepare(`
            SELECT sc.*, ct.min_value, ct.max_value 
            FROM sensor_channels sc
            LEFT JOIN channel_thresholds ct ON sc.id = ct.channel_id
            WHERE sc.physical_sensor_id = ?
        `).all(row.id);
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

    static deleteChannel(id) {
        return db.prepare(`DELETE FROM sensor_channels WHERE id = ?`).run(id);
    }

    static setThreshold(channelId, minVal, maxVal) {
        const query = `
            INSERT INTO channel_thresholds (channel_id, min_value, max_value)
            VALUES (?, ?, ?)
            ON CONFLICT(channel_id) DO UPDATE SET
                min_value = excluded.min_value,
                max_value = excluded.max_value
        `;
        return db.prepare(query).run(channelId, minVal, maxVal);
    }
}

module.exports = SensorRepository;