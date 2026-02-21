const Event = require('./Event');
const EventRepository = require('./EventRepository');
const SocketService = require('../socketService');

class EventService {
    /**
     * @param {number} mcuId 
     * @param {string} type 'info' | 'warn' | 'alert'
     * @param {string} message 
     */
    static logEvent(mcuId, type, message) {
        const event = new Event({ mcuId, type, message });
        
        // 1. Uložit do DB
        const newId = EventRepository.create(event.toDatabase());
        event.id = newId;

        // 2. Odeslat přes WebSockety na frontend
        if (SocketService.io) {
            const payload = {
                id: event.id,
                mcuId: event.mcuId,
                type: event.type,
                message: event.message,
                timestamp: new Date().toISOString() // Pošleme čerstvý čas pro UI
            };
            
            // Pošleme to do roomky konkrétního MCU
            SocketService.io.to(`mcu_${mcuId}`).emit('new_event', payload);
        }

        return event;
    }

    static getHistory(mcuId) {
        return EventRepository.getByMcuId(mcuId);
    }
}
module.exports = EventService;