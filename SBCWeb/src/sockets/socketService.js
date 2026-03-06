class SocketService {
    constructor() {
        this.io = null; 
        this.lastReadings = new Map(); 
    }

    // Tuto metodu zavolá náš nový Router a předá jí socket server
    init(io) {
        this.io = io;
        console.log('[SocketService] Vysílač je připraven.');
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
            console.error('[SOCKET ERROR] Socket nebyl inicializován!');
            return;
        }

        const payload = { mcuId, status, lastSeen: lastSeenDate };
        this.io.to(`mcu_${mcuId}`).emit('mcu_status', payload);
        this.io.to('all_data').emit('mcu_status', payload); 
    }

    // Přejmenováno pro konzistenci s EventService
    broadcastAlert(mcuId, type, message) {
        if (!this.io) return;
        
        const payload = {
            mcuId: mcuId,
            type: type,
            message: message,
            timestamp: new Date().toISOString()
        };

        // Pošleme to do detailu konkrétního MCU
        
        // Pokud je to varování nebo alert, pošleme to všem (i na hlavní dashboard)
        if (type === 'alert' || type === 'warning' || type === 'info') {
            this.io.emit('global_alert', payload);
            console.log("emmit");
        }
    }
}

// Exportujeme jako Singleton
module.exports = new SocketService();