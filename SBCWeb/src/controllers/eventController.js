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
}

module.exports = EventController;