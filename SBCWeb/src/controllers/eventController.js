const EventService = require('../models/Event/EventService');

class EventController {
    static async getByMcuId(req, res) {
        try {
            const { mcuId } = req.params;
            if (!mcuId) {
                return res.status(400).json({ success: false, message: 'Chybí ID zařízení.' });
            }

            // Načteme historii z DB (Repository/Service už máš z dřívějška)
            const events = await EventService.getHistory(mcuId);
            
            res.json({
                success: true,
                events: events
            });
        } catch (error) {
            console.error('Chyba při načítání eventů:', error);
            res.status(500).json({ success: false, message: 'Interní chyba serveru.' });
        }
    }

    static async clearAll(req, res) {
        try {
            EventService.clearAllEvents();
            res.status(200).json({ 
                success: true, 
                message: "Všechny události byly trvale smazány." 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    static async getRecent(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 20; 
        const events = EventService.getRecentEvents(limit);
        
        res.status(200).json({ 
            success: true, 
            events: events 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
    }

}

module.exports = EventController;