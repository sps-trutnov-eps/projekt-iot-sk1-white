const SocketService = require('./socketService');
const DashboardService = require('../services/dashboardService'); 

class WebSocketHandler {
    
    // Tuto metodu zavoláš v server.js
    static init(io) {
        // 1. Předáme instanci IO našemu vysílači
        SocketService.init(io);

        // 2. Tady chytáme všechno, co nám klienti (prohlížeče) posílají
        io.on('connection', (socket) => {

            // === ROUTA 1: Správa místností (Rooms) ===
            socket.on('subscribe_mcu', (mcuId) => {
                const roomName = `mcu_${mcuId}`;
                socket.join(roomName);
            });

            socket.on('subscribe_all', () => {
                socket.join('all_data');
            });
            
            socket.on('unsubscribe_mcu', (mcuId) => {
                socket.leave(`mcu_${mcuId}`);
            });

            socket.on('unsubscribe_all', () => {
                socket.leave('all_data');
            });


            // === ROUTA 2: Žádosti o data (Dashboard) ===
            socket.on('request_dashboard_stats', () => {
                try {
                    // Handler se neptá databáze, jen poprosí Service vrstvu
                    const stats = DashboardService.getDashboardStats();
                    socket.emit('dashboard_stats_update', stats);
                } catch (error) {
                    console.error('[Dashboard ERROR] Výpočet statistik selhal:', error);
                }
            });

            // === Odpojení klienta ===
            socket.on('disconnect', () => {
            });
        });
    }
}

module.exports = WebSocketHandler;