
class DashboardService {
    /**
     * Zaregistruje naslouchání na specifické události dashboardu
     */
    static initSockets(socketService) {
        if (!socketService.io) {
            console.error('[DashboardService] Nelze inicializovat sockety, chybí socketService.io');
            return;
        }

        // Kdykoliv se připojí nějaký klient (např. otevře dashboard.js)
        socketService.io.on('connection', (socket) => {
            
            // Zachytíme jeho žádost o úvodní statistiky
            socket.on('request_dashboard_stats', () => {
                try {
                    const stats = this.getDashboardStats();
                    socket.emit('dashboard_stats_update', stats);
                } catch (error) {
                    console.error('[Dashboard ERROR] Výpočet statistik selhal:', error);
                }
            });

        });
    }

    /**
     * Vypočítá a vrátí aktuální čísla z DB
     */
    static getDashboardStats() {
        const MCUService = require('./mcuService');
        const SensorService = require('./SensorService');
        const MeasurementService = require('./MeasurementService');
        const EventService = require('./EventService');
        
        return {
            activeMcus: MCUService.getActiveCount(),
            totalSensors: SensorService.getTotalCount(),
            dataPointsToday: MeasurementService.getTodayReadingsCount(),
            alertsToday: EventService.getTodayAlertsCount()
        };
    }
}

module.exports = DashboardService;