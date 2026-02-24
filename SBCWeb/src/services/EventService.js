const Event = require('../models/Event');
const EventRepository = require('../repositories/EventRepository');
const SocketService = require('../sockets/socketService'); // Cesta podle tvé struktury

class EventService {
    static logEvent(mcuId, type, message) {
        const event = new Event({ mcuId, type, message });
        
        const newId = EventRepository.create(event.toDatabase());
        event.id = newId;

        // ČISTÉ ŘEŠENÍ: Voláme jen metodu, SocketService si to už přebere a pošle do správných místností
        SocketService.broadcastAlert(mcuId, type, message);

        return event;
    }

    static getHistory(mcuId) {
        return EventRepository.getByMcuId(mcuId);
    }

    static logSystemEvent(type, message) {
        // OPRAVA: SQL dotaz přesunout do EventRepository. Tady jen voláme metodu!
        try {
            EventRepository.logSystem(type, message); 
        } catch (e) {
            console.error("Chyba při zápisu do system_logs:", e);
        }
    }

    static clearAllEvents() {
        return EventRepository.deleteAll();
    }

    static getRecentEvents(limit = 20) {
        return EventRepository.getRecent(limit);
    }

    static getTodayAlertsCount() {
        return EventRepository.countTodayAlerts();
    }
}

module.exports = EventService;