const MeasurementService = require('../models/Reading/MeasurementService');

const getReadingsHistory = async (req, res) => { // Přidáno async pro jistotu
    try {
        // ZMĚNA: Data taháme z BODY, ne z PARAMS
        const { channelId, range } = req.body;

        // Validace (dobrá praxe, když to jde přes body)
        if (!channelId) {
            return res.status(400).json({ success: false, error: "Chybí ID kanálu." });
        }

        // Voláme Service (logika zůstává stejná)
        const data = MeasurementService.getReadingsHistory(channelId, range || '24h');
        
        res.json({ 
            success: true, 
            data: data 
        });

    } catch (error) {
        console.error("Chyba ReadingController:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

module.exports = { getReadingsHistory };