const MCUService = require('./mcuService');
const SensorService = require('./SensorService');
const MeasurementService = require('./MeasurementService');
const EventService = require('./EventService');


class DashboardService {
    /**
     * Vypočítá a vrátí aktuální čísla z DB
     */
    static getDashboardStats() {
        return {
            activeMcus: MCUService.getActiveCount(),
            totalSensors: SensorService.getTotalCount(),
            dataPointsToday: MeasurementService.getTodayReadingsCount(),
            alertsToday: EventService.getTodayAlertsCount()
        };
    }
}

module.exports = DashboardService;