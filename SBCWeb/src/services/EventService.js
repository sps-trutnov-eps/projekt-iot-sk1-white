// services/EventService.js
const Event = require('../models/Event');
const EventRepository = require('../repositories/EventRepository');
const SocketService = require('../sockets/socketService'); // Uprav cestu podle sebe

class EventService {
    
    // ==========================================
    // MCU UDÁLOSTI
    // ==========================================
    static logEvent(mcuId, type, message) {
        const event = new Event({ mcuId, type, message });
        const newId = EventRepository.create(event.toDatabase());
        event.id = newId;

        // Odeslání přes WebSocket
        if (SocketService.broadcastAlert) {
            SocketService.broadcastAlert(mcuId, type, message);
        }

        return event;
    }

    static getHistory(mcuId) {
        return EventRepository.getByMcuId(mcuId);
    }

    // ==========================================
    // SERVER UDÁLOSTI
    // ==========================================
    static logServerEvent(serverId, type, message) {
        const event = new Event({ serverId, type, message });
        const newId = EventRepository.create(event.toDatabase());
        event.id = newId;

        // Odeslání přes WebSocket (pokud máš metodu připravenou)
        if (SocketService.broadcastServerAlert) {
            SocketService.broadcastServerAlert(serverId, type, message);
        }

        return event;
    }

    static getServerHistory(serverId) {
        return EventRepository.getByServerId(serverId);
    }

    // ==========================================
    // GLOBÁLNÍ / SYSTÉMOVÉ UDÁLOSTI
    // ==========================================
    static logSystemEvent(type, message) {
        try {
            EventRepository.logSystem(type, message); 
            
            // Odeslání přes WebSocket všem klientům (např. do horní lišty s notifikacemi)
            if (SocketService.broadcastSystemAlert) {
                 SocketService.broadcastSystemAlert(type, message);
            }
        } catch (e) {
            console.error("Chyba při zápisu do event_logs (logSystemEvent):", e);
        }
    }

    // ==========================================
    // SPOLEČNÉ METODY
    // ==========================================
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