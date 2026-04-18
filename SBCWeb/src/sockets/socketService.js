// sockets/socketService.js
const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

class SocketService {
    constructor() {
        this.io = null;
        this.lastReadings = new Map();
    }

    init(io) {
        this.io = io;
        console.log('[SocketService] Vysílač je připraven.');
    }

    // V DEMO_MODE všechny broadcasty scope-neme do session room (s:<sessionId>)
    // tak, aby každý reviewer viděl jen vlastní simulovaná data.
    _scope() {
        if (!DEMO_MODE) return this.io;
        try {
            const { getCurrentSessionId } = require('../demo/sessionContext');
            const sid = getCurrentSessionId();
            if (sid) return this.io.to(`s:${sid}`);
        } catch (_) {}
        return this.io; // fallback (žádný session context — nemělo by se stávat)
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

        if (DEMO_MODE) {
            this._scope().emit('live_reading', payload);
            return;
        }
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
        if (DEMO_MODE) {
            this._scope().emit('mcu_status', payload);
            return;
        }
        this.io.to(`mcu_${mcuId}`).emit('mcu_status', payload);
        this.io.to('all_data').emit('mcu_status', payload);
    }

    // ==========================================
    // UDÁLOSTI A LOGY (EVENTY)
    // ==========================================

    broadcastAlert(mcuId, type, messageKey, params = {}) {
        if (!this.io) return;

        const payload = {
            mcuId: mcuId,
            type: type,
            message: messageKey,
            message_key: messageKey,
            message_params: params,
            timestamp: new Date().toISOString()
        };

        if (DEMO_MODE) {
            this._scope().emit('new_event', payload);
            if (type === 'alert' || type === 'warning' || type === 'warn' || type === 'info') {
                this._scope().emit('global_alert', payload);
            }
            return;
        }

        this.io.to(`mcu_${mcuId}`).emit('new_event', payload);
        if (type === 'alert' || type === 'warning' || type === 'warn' || type === 'info') {
            this.io.emit('global_alert', payload);
        }
    }

    broadcastServerAlert(serverId, type, messageKey, params = {}) {
        if (!this.io) return;

        const payload = {
            serverId: serverId,
            type: type,
            message: messageKey,
            message_key: messageKey,
            message_params: params,
            timestamp: new Date().toISOString()
        };

        if (DEMO_MODE) {
            this._scope().emit('global_alert', payload);
            return;
        }
        this.io.emit('global_alert', payload);
    }

    broadcastSystemAlert(type, messageKey, params = {}) {
        if (!this.io) return;

        const payload = {
            type: type,
            message: messageKey,
            message_key: messageKey,
            message_params: params,
            timestamp: new Date().toISOString()
        };

        if (DEMO_MODE) {
            this._scope().emit('global_alert', payload);
            return;
        }
        this.io.emit('global_alert', payload);
    }

    broadcastServerStatus(serverId, status) {
        if (!this.io) return;
        const payload = { serverId, status, timestamp: Date.now() };
        if (DEMO_MODE) {
            this._scope().emit('server_status', payload);
            return;
        }
        this.io.emit('server_status', payload);
    }
}

module.exports = new SocketService();
