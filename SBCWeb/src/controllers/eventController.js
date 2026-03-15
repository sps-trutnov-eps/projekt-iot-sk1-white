// controllers/EventController.js
const EventService = require('../services/EventService');

class EventController {
    
    // Získání historie pro konkrétní MCU
    static async getByMcuId(req, res) {
        try {
            const { mcuId } = req.params;
            if (!mcuId) {
                return res.status(400).json({ success: false, message: 'Chybí ID zařízení (mcuId).' });
            }

            const events = await EventService.getHistory(mcuId);
            
            res.json({
                success: true,
                events: events
            });
        } catch (error) {
            console.error('Chyba při načítání eventů pro MCU:', error);
            res.status(500).json({ success: false, message: 'Interní chyba serveru při načítání událostí.' });
        }
    }

    // Získání historie pro konkrétní Server
    static async getByServerId(req, res) {
        try {
            const { serverId } = req.params;
            if (!serverId) {
                return res.status(400).json({ success: false, message: 'Chybí ID serveru (serverId).' });
            }

            const events = await EventService.getServerHistory(serverId);
            
            res.json({
                success: true,
                events: events
            });
        } catch (error) {
            console.error('Chyba při načítání eventů pro Server:', error);
            res.status(500).json({ success: false, message: 'Interní chyba serveru při načítání událostí serveru.' });
        }
    }

    // Získání nejnovějších událostí (všeobecný mix pro dashboard / notifikační zvoneček)
    static async getRecent(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 20; 
            const events = EventService.getRecentEvents(limit);
            
            res.status(200).json({ 
                success: true, 
                events: events 
            });
        } catch (error) {
            console.error('Chyba při načítání nedávných eventů:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // PŘIDÁNO: Počet nepřečtených notifikací
    static async getUnreadCount(req, res) {
        try {
            const count = EventService.getUnreadCount();
            res.status(200).json({ 
                success: true, 
                unreadCount: count 
            });
        } catch (error) {
            console.error('Chyba při načítání počtu nepřečtených:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // PŘIDÁNO: Označit notifikaci jako přečtenou
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ success: false, message: "Chybí ID notifikace." });
            }

            EventService.markAsRead(id);
            res.status(200).json({ success: true, message: "Notifikace označena jako přečtená." });
        } catch (error) {
            console.error('Chyba při označování notifikace:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // PŘIDÁNO: Označit všechny jako přečtené
    static async markAllAsRead(req, res) {
        try {
            EventService.markAllAsRead();
            res.status(200).json({ success: true, message: "Všechny notifikace označeny jako přečtené." });
        } catch (error) {
            console.error('Chyba při označování notifikací:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Kompletní vymazání historie (např. tlačítko "Vymazat" v notifikacích)
    static async clearAll(req, res) {
        try {
            EventService.clearAllEvents();
            res.status(200).json({ 
                success: true, 
                message: "Všechny události byly trvale smazány." 
            });
        } catch (error) {
            console.error('Chyba při mazání eventů:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // controllers/EventController.js
    static async deleteSingle(req, res) {
        try {
            const id = req.params.id;
            if (!id) {
                return res.status(400).json({ success: false, message: "Chybí ID události." });
            }

            EventService.deleteEvent(id);
            res.status(200).json({ success: true, message: "Událost byla smazána." });
        } catch (error) {
            console.error('Chyba při mazání události:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = EventController;