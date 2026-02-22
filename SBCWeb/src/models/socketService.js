class SocketService {
    constructor() {
        this.io = null; 
        this.lastReadings = new Map(); 
    }

    // Tuto metodu volá app.js a předá jí skutečný socket server
    init(io) {
        this.io = io;

        this.io.on('connection', (socket) => {
            // 1. Klient chce poslouchat konkrétní MCU (Detail stránka)
            socket.on('subscribe_mcu', (mcuId) => {
                const roomName = `mcu_${mcuId}`;
                socket.join(roomName);
                console.log(`[SOCKET] Klient (ID: ${socket.id}) se připojil do roomu: ${roomName}`);
            });

            // 2. Klient chce poslouchat úplně všechno (Dashboard)
            socket.on('subscribe_all', () => {
                socket.join('all_data');
            });
            
            // 3. Odhlášení
            socket.on('unsubscribe_mcu', (mcuId) => {
                socket.leave(`mcu_${mcuId}`);
            });

            socket.on('unsubscribe_all', () => {
                socket.leave('all_data');
            });
        }); // <-- TADY SPRÁVNĚ KONČÍ init()
    }

    broadcastReading(mcuId, channelId, value) {
        if (!this.io) {
            console.error('[SOCKET ERROR] Socket nebyl inicializován. Chybí this.io!');
            return;
        }

        this.lastReadings.set(channelId, value);
        const payload = { mcuId, channelId, value, timestamp: Date.now() };

        this.io.to(`mcu_${mcuId}`).emit('live_reading', payload);
        this.io.to('all_data').emit('live_reading', payload);
    }

    getLastValue(channelId) {
        return this.lastReadings.get(channelId);
    }

    broadcastMcuStatus(mcuId, lastSeenDate, status) {
        if (!this.io) {
            console.error('[SOCKET ERROR] Socket nebyl inicializován. Chybí this.io!');
            return;
        }

        const payload = { mcuId, status, lastSeen: lastSeenDate };
        console.log(`[SOCKET] Odesílám mcu_status pro ID ${mcuId} -> Status: ${status}`);

        this.io.to(`mcu_${mcuId}`).emit('mcu_status', payload);
        this.io.to('all_data').emit('mcu_status', payload); 
    }

    static broadcastAlert(mcuId, type, message) {
        if (!this.io) return;
        
        // type může být 'info', 'warn', 'alert'
        this.io.emit('system_alert', {
            mcuId: mcuId,
            type: type,
            message: message,
            timestamp: new Date().toISOString()
        });
    }
}

// Exportujeme vytvořenou INSTANCI (Singleton)
module.exports = new SocketService();