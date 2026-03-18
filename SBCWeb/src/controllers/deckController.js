const DeckService = require('../services/DeckService');
const DeckAssignmentRepository = require('../repositories/DeckAssignmentRepository');

/**
 * GET /mcu/:id/deck-config
 * Vrátí aktuální konfiguraci přiřazení pro deck
 */
const getDeckConfig = (req, res) => {
    try {
        const deckId = parseInt(req.params.id);
        if (!deckId) return res.status(400).json({ success: false, message: 'Chybí ID decku.' });

        const config = DeckService.getDeckConfig(deckId);
        res.json({ success: true, config });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /mcu/:id/deck-config
 * Uloží konfiguraci přiřazení pro deck
 * Body: { servers: [1,2], commands: [5,6], mcus: [3] }
 */
const saveDeckConfig = (req, res) => {
    try {
        const deckId = parseInt(req.params.id);
        if (!deckId) return res.status(400).json({ success: false, message: 'Chybí ID decku.' });

        const { servers = [], commands = [], mcus = [] } = req.body;

        const config = DeckService.saveDeckConfig(deckId, { servers, commands, mcus });
        res.json({ success: true, message: 'Konfigurace decku uložena.', config });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * GET /mcu/:id/deck-config/available
 * Vrátí dostupné entity (servery, příkazy, MCU senzory) pro přiřazení k decku
 */
const getAvailableEntities = (req, res) => {
    try {
        const deckId = parseInt(req.params.id);

        const ServerService = require('../services/ServerService');
        const CommandService = require('../services/commandService');
        const MCUService = require('../services/mcuService');

        const servers = ServerService.getAllServersWithCommands().map(s => ({
            id: s.id,
            name: s.name,
            ip: s.ip,
            type: s.type
        }));

        const commands = CommandService.getAllCommands().map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            serverId: c.server_id || c.serverId,
            serverName: servers.find(s => s.id === (c.server_id || c.serverId))?.name || ''
        }));

        // Pouze senzory (ne decky, ne tento deck)
        const mcus = MCUService.getAllMCUs()
            .filter(m => m.role !== 'deck' || m.id === deckId)
            .filter(m => m.id !== deckId)
            .map(m => ({
                id: m.id,
                name: m.name,
                role: m.role
            }));

        // Aktuální přiřazení
        const assigned = DeckService.getDeckConfig(deckId);

        res.json({
            success: true,
            available: { servers, commands, mcus },
            assigned
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /mcu/:id/deck-push
 * Manuální push konfigurace na deck přes MQTT
 */
const pushDeckConfig = (req, res) => {
    try {
        const deckId = parseInt(req.params.id);
        if (!deckId) return res.status(400).json({ success: false, message: 'Chybí ID decku.' });

        const MqttHandler = require('../sockets/mqttHandler');
        MqttHandler.pushDeckConfig(deckId);

        res.json({ success: true, message: 'Konfigurace odeslána na deck.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getDeckConfig, saveDeckConfig, getAvailableEntities, pushDeckConfig };
