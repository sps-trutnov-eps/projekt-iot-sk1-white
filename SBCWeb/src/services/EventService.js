// services/EventService.js
const Event = require('../models/Event');
const EventRepository = require('../repositories/EventRepository');
const SocketService = require('../sockets/socketService');

class EventService {
    
    // ==========================================
    // MCU UDÁLOSTI
    // ==========================================
    static logEvent(mcuId, type, messageKey, params = {}) {
        const event = new Event({ mcuId, type, message: messageKey, message_key: messageKey, message_params: params });
        const newId = EventRepository.create(event.toDatabase());
        event.id = newId;

        if (SocketService.broadcastAlert) {
            SocketService.broadcastAlert(mcuId, type, messageKey, params);
        }

        return event;
    }

    static getHistory(mcuId) {
        return EventRepository.getByMcuId(mcuId);
    }

    // ==========================================
    // SERVER UDÁLOSTI
    // ==========================================
    static logServerEvent(serverId, type, messageKey, params = {}) {
        const event = new Event({ serverId, type, message: messageKey, message_key: messageKey, message_params: params });
        const newId = EventRepository.create(event.toDatabase());
        event.id = newId;

        if (SocketService.broadcastServerAlert) {
            SocketService.broadcastServerAlert(serverId, type, messageKey, params);
        }

        return event;
    }

    static getServerHistory(serverId) {
        return EventRepository.getByServerId(serverId);
    }

    // ==========================================
    // GLOBÁLNÍ / SYSTÉMOVÉ UDÁLOSTI
    // ==========================================
    static logSystemEvent(type, messageKey, params = {}) {
        try {
            EventRepository.logSystem(type, messageKey, messageKey, params);

            if (SocketService.broadcastSystemAlert) {
                SocketService.broadcastSystemAlert(type, messageKey, params);
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