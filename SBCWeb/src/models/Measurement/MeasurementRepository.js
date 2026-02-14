// src/models/Measurement/MeasurementRepository.js
const db = require('../database.js');

class MeasurementRepository {
    static createSummary(data) {
        const query = `
            INSERT INTO sensor_summaries (sensor_id, avg_value, min_value, max_value)
            VALUES (?, ?, ?, ?)
        `;
        return db.prepare(query).run(
            data.sensorId, 
            data.avg, 
            data.min, 
            data.max
        );
    }
}

module.exports = MeasurementRepository;