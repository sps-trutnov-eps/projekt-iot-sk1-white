const DeckAssignmentRepository = require('../repositories/DeckAssignmentRepository');
const MCURepository = require('../repositories/MCURepository');

class DeckAssignmentService {
    static getAssignments(deckId) {
        const mcu = MCURepository.findById(deckId);
        if (!mcu || mcu.role !== 'deck') {
            throw new Error('MCU není deck nebo nebylo nalezeno.');
        }
        return DeckAssignmentRepository.getByDeckId(deckId);
    }

    static saveAssignments(deckId, assignments) {
        const mcu = MCURepository.findById(deckId);
        if (!mcu || mcu.role !== 'deck') {
            throw new Error('MCU není deck nebo nebylo nalezeno.');
        }
        DeckAssignmentRepository.replaceAll(deckId, assignments);

        // Push novou konfiguraci na deck
        setImmediate(() => {
            const MqttHandler = require('../sockets/mqttHandler');
            MqttHandler.pushDeckConfig(deckId);
        });
    }

    static getFilteredConfig(deckId) {
        const ServerService = require('./ServerService');
        const CommandService = require('./commandService');
        const MCUService = require('./mcuService');
        const SensorService = require('./SensorService');

        const assignments = DeckAssignmentRepository.getByDeckId(deckId);

        const serverIds = new Set(assignments.filter(a => a.entity_type === 'server').map(a => a.entity_id));
        const commandIds = new Set(assignments.filter(a => a.entity_type === 'command').map(a => a.entity_id));
        const mcuIds = new Set(assignments.filter(a => a.entity_type === 'mcu').map(a => a.entity_id));

        const allServers = ServerService.getAllServersWithCommands();
        const servers = allServers
            .filter(s => serverIds.has(s.id))
            .map(s => ({ id: s.id, name: s.name, ip: s.ip, status: s.status }));

        const allCommands = CommandService.getAllCommands();
        const commands = allCommands
            .filter(c => commandIds.has(c.id))
            .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                server_id: c.server_id || c.serverId,
                ...(c.type === 'wol' && c.command ? { mac: c.command.trim() } : {})
            }));

        const allMcus = MCUService.getAllMCUs();
        const mcus = [];
        for (const mcu of allMcus) {
            if (!mcuIds.has(mcu.id)) continue;
            const sensors = SensorService.getSensorsByDevice(mcu.id);
            const channels = [];
            if (sensors && Array.isArray(sensors)) {
                for (const sensor of sensors) {
                    if (sensor.channels && Array.isArray(sensor.channels)) {
                        for (const ch of sensor.channels) {
                            channels.push({ id: ch.id, type: ch.type, unit: ch.unit || '' });
                        }
                    }
                }
            }
            mcus.push({
                id: mcu.id,
                name: mcu.name,
                apiKey: mcu.apiKey,
                isOnline: mcu.is_online || 0,
                channels
            });
        }

        return { servers, commands, mcus, ts: Math.floor(Date.now() / 1000) };
    }
}

module.exports = DeckAssignmentService;
