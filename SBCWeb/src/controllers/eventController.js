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
}

module.exports = EventController;