const DeckAssignmentService = require('../services/DeckAssignmentService');

const getAssignments = (req, res) => {
    try {
        const deckId = parseInt(req.params.id);
        const assignments = DeckAssignmentService.getAssignments(deckId);
        res.json({ success: true, assignments });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const saveAssignments = (req, res) => {
    try {
        const deckId = parseInt(req.params.id);
        const { assignments } = req.body;

        if (!Array.isArray(assignments)) {
            return res.status(400).json({ success: false, message: 'Assignments musí být pole.' });
        }

        DeckAssignmentService.saveAssignments(deckId, assignments);
        res.json({ success: true, message: 'Konfigurace decku byla uložena.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAvailableEntities = (req, res) => {
    try {
        const ServerService = require('../services/ServerService');
        const CommandService = require('../services/commandService');
        const MCUService = require('../services/mcuService');
        const SensorService = require('../services/SensorService');

        const servers = ServerService.getAllServersWithCommands().map(s => ({
            id: s.id,
            name: s.name,
            ip: s.ip,
            commands: (s.commands || []).map(c => ({ id: c.id, name: c.name, type: c.type }))
        }));

        const mcus = MCUService.getAllMCUs()
            .filter(m => m.role !== 'deck')
            .map(m => {
                const sensors = SensorService.getSensorsByDevice(m.id);
                return { id: m.id, name: m.name, sensors: sensors || [] };
            });

        res.json({ success: true, servers, mcus });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getAssignments, saveAssignments, getAvailableEntities };
