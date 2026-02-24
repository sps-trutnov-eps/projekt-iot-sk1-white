const SocketService = require('./socketService');
const DashboardService = require('../services/dashboardService'); 

class WebSocketHandler {
    
    // Tuto metodu zavoláš v server.js
    static init(io) {
        // 1. Předáme instanci IO našemu vysílači
        SocketService.init(io);

        // 2. Tady chytáme všechno, co nám klienti (prohlížeče) posílají
        io.on('connection', (socket) => {
            console.log(`[SOCKET ROUTER] Klient připojen: ${socket.id}`);

            // === ROUTA 1: Správa místností (Rooms) ===
            socket.on('subscribe_mcu', (mcuId) => {
                const roomName = `mcu_${mcuId}`;
                socket.join(roomName);
                console.log(`[SOCKET] Klient ${socket.id} vstoupil do: ${roomName}`);
            });

            socket.on('subscribe_all', () => {
                socket.join('all_data');
                console.log(`[SOCKET] Klient ${socket.id} odebírá všechna data.`);
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
                console.log(`[SOCKET ROUTER] Klient odpojen: ${socket.id}`);
            });
        });
    }
}

module.exports = WebSocketHandler;