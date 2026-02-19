class SocketService {
    constructor() {
        this.io = null; // Na začátku je to prázdné!
        this.lastReadings = new Map(); 
    }

    // Tuto metodu volá app.js a předá jí skutečný socket server
    init(io) {
        this.io = io;

        this.io.on('connection', (socket) => {
            // 1. Klient chce poslouchat konkrétní MCU (Detail stránka)
            socket.on('subscribe_mcu', (mcuId) => {
                socket.join(`mcu_${mcuId}`);
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
        }
    )};

   broadcastReading(mcuId, channelId, value) {
        if (!this.io) return;

        this.lastReadings.set(channelId, value);
        const payload = { mcuId, channelId, value, timestamp: Date.now() };

        this.io.to(`mcu_${mcuId}`).emit('live_reading', payload);
        this.io.to('all_data').emit('live_reading', payload);
    }


    getLastValue(channelId) {
        return this.lastReadings.get(channelId);
    }

    // 2. NOVÉ: Odeslání stavu MCU (last_seen)
    broadcastMcuStatus(mcuId, lastSeenDate) {
        if (!this.io) return;

        const payload = { mcuId, lastSeen: lastSeenDate };

        this.io.to(`mcu_${mcuId}`).emit('mcu_status', payload);
        this.io.to('all_data').emit('mcu_status', payload); // pro dashboard
    }
}

module.exports = new SocketService();