// src/models/Measurement/MeasurementService.js
const MeasurementRepository = require('./MeasurementRepository');
const MCURepository = require('../MCU/MCURepository');

class MeasurementService {
    // Statické úložiště pro dočasná data
    static buffers = {}; 

    static addValue(mac, value) {
        if (!this.buffers[mac]) this.buffers[mac] = [];
        this.buffers[mac].push(value);
    }

    static async processMinuteAggregation() {
        console.log("⏱️ Probíhá minutová agregace...");
        console.log(this.buffers);
        for (const mac in this.buffers) {
            const values = this.buffers[mac];
            if (values.length === 0) continue;

            // 1. Najdeme MCU podle MAC adresy přes tvé Repo
            const mcu = MCURepository.findByMac(mac);
            
            if (mcu) {
                // 2. Výpočet statistik
                const stats = {
                    sensorId: mcu.id,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
                };

                // 3. Uložení sumáře
                MeasurementRepository.createSummary(stats);
            }
            // Vyčistíme buffer pro danou MAC
            this.buffers[mac] = [];
        }
    }
}

module.exports = MeasurementService;