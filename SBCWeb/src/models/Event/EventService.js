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
        
        const newId = EventRepository.create(event.toDatabase());
        event.id = newId;

        if (SocketService.io) {
            const payload = {
                id: event.id,
                mcuId: event.mcuId,
                type: event.type,
                message: event.message,
                timestamp: new Date().toISOString() 
            };
            
            SocketService.io.to(`mcu_${mcuId}`).emit('new_event', payload);

            // Pošleme to jen pokud jde o 'alert' nebo 'warn', abychom nespamovali lidi běžným 'info'
            if (event.type === 'alert' || event.type === 'warn') {
                SocketService.io.emit('global_alert', payload);
            }
        }

        return event;
    }

    static getHistory(mcuId) {
        return EventRepository.getByMcuId(mcuId);
    }

    static logSystemEvent(type, message) {
        try {
            const db = require('../database.js'); // Uprav cestu k db podle potřeby
            db.prepare(`INSERT INTO system_logs (type, message) VALUES (?, ?)`).run(type, message);
        } catch (e) {
            console.error("Chyba při zápisu do system_logs:", e);
        }
    }

    // Přidej do EventService.js
    static clearAllEvents() {
        return EventRepository.deleteAll();
    }

    // Přidej do EventService.js
    static getRecentEvents(limit = 20) {
        return EventRepository.getRecent(limit);
    }
}
module.exports = EventService;