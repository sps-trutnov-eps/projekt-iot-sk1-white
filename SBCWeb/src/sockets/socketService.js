// sockets/socketService.js
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

    // ==========================================
    // MĚŘENÍ A STAVY
    // ==========================================
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

    // ==========================================
    // UDÁLOSTI A LOGY (EVENTY)
    // ==========================================
    
    // Pro události konkrétního MCU (přidání, smazání, offline, alert)
    broadcastAlert(mcuId, type, message) {
        if (!this.io) return;
        
        const payload = {
            mcuId: mcuId,
            type: type,
            message: message,
            timestamp: new Date().toISOString()
        };

        // 1. Pošleme to do detailu konkrétního MCU (eventManager.js poslouchá na 'new_event')
        this.io.to(`mcu_${mcuId}`).emit('new_event', payload);

        // 2. Zároveň to pošleme jako globální notifikaci (notifikační zvoneček nahoře)
        if (type === 'alert' || type === 'warning' || type === 'warn' || type === 'info') {
            this.io.emit('global_alert', payload);
        }
    }

    // Pro události serverů
    broadcastServerAlert(serverId, type, message) {
        if (!this.io) return;
        
        const payload = {
            serverId: serverId,
            type: type,
            message: message,
            timestamp: new Date().toISOString()
        };

        this.io.emit('global_alert', payload);
    }

    // Pro události celého systému
    broadcastSystemAlert(type, message) {
        if (!this.io) return;
        
        const payload = {
            type: type,
            message: message,
            timestamp: new Date().toISOString()
        };

        this.io.emit('global_alert', payload);
    }
    
    broadcastServerStatus(serverId, status) {
    if (!this.io) return;

    const payload = { serverId, status, timestamp: Date.now() };
    this.io.emit('server_status', payload);
    }
}

// Exportujeme jako Singleton
module.exports = new SocketService();