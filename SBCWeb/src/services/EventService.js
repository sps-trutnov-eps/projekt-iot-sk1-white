// services/EventService.js
const Event = require('../models/Event');
const EventRepository = require('../repositories/EventRepository');
const SocketService = require('../sockets/socketService');

class EventService {
    
    // ==========================================
    // MCU UDÁLOSTI
    // ==========================================
    static logEvent(mcuId, type, message) {
        const event = new Event({ mcuId, type, message });
        const newId = EventRepository.create(event.toDatabase());
        event.id = newId;

        // Odeslání přes WebSocket - zavolá metodu v SocketService
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

        // Odeslání přes WebSocket 
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
            
            // Odeslání přes WebSocket všem klientům (do horní lišty s notifikacemi)
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

    static getRecentEvents(limit = 20) {
        return EventRepository.getRecent(limit);
    }

    // PŘIDÁNO: Počet nepřečtených notifikací
    static getUnreadCount() {
        return EventRepository.getUnreadCount();
    }

    // PŘIDÁNO: Označit notifikaci jako přečtenou
    static markAsRead(id) {
        return EventRepository.markAsRead(id);
    }

    // PŘIDÁNO: Označit všechny jako přečtené
    static markAllAsRead() {
        const result = EventRepository.markAllAsRead();
        if (SocketService.io) SocketService.io.emit('alerts_changed');
        return result;
    }

    static getTodayAlertsCount() {
        return EventRepository.countTodayAlerts();
    }

    static clearAllEvents() {
    const result = EventRepository.deleteAll();
    if (SocketService.io) SocketService.io.emit('alerts_changed');
    return result;
    }

    static deleteEvent(id) {
        const result = EventRepository.deleteById(id);
        if (SocketService.io) SocketService.io.emit('alerts_changed');
        return result;
    }
}

module.exports = EventService;