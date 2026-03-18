const DeckAssignmentRepository = require('../repositories/DeckAssignmentRepository');
const MCURepository = require('../repositories/MCURepository');

class DeckService {

    /**
     * Vrátí kompletní konfiguraci přiřazení pro daný deck
     */
    static getDeckConfig(deckId) {
        const mcu = MCURepository.findById(deckId);
        if (!mcu) throw new Error('Deck s daným ID nebylo nalezeno.');
        if (mcu.role !== 'deck') throw new Error('Toto MCU není deck.');

        return {
            deckId,
            servers: DeckAssignmentRepository.getAssignedServerIds(deckId),
            commands: DeckAssignmentRepository.getAssignedCommandIds(deckId),
            mcus: DeckAssignmentRepository.getAssignedMcuIds(deckId)
        };
    }

    /**
     * Uloží kompletní konfiguraci přiřazení pro deck
     */
    static saveDeckConfig(deckId, config) {
        const mcu = MCURepository.findById(deckId);
        if (!mcu) throw new Error('Deck s daným ID nebylo nalezeno.');
        if (mcu.role !== 'deck') throw new Error('Toto MCU není deck.');

        DeckAssignmentRepository.setFullConfig(deckId, config);

        // Po uložení pushni novou konfiguraci na deck přes MQTT
        setImmediate(() => {
            const MqttHandler = require('../sockets/mqttHandler');
            MqttHandler.pushDeckConfig(deckId);
        });

        return this.getDeckConfig(deckId);
    }

    /**
     * Vrátí všechna přiřazení pro daný deck (raw data)
     */
    static getAssignments(deckId) {
        return DeckAssignmentRepository.findByDeckId(deckId);
    }

    /**
     * Sestaví filtrovaný MQTT config payload pro konkrétní deck
     * Vrací jen servery/příkazy/MCU, které jsou decku přiřazeny
     */
    static buildDeckConfigPayload(deckId) {
        const ServerService = require('./ServerService');
        const CommandService = require('./commandService');
        const MCUService = require('./mcuService');
        const SensorService = require('./SensorService');

        const assignedServerIds = DeckAssignmentRepository.getAssignedServerIds(deckId);
        const assignedCommandIds = DeckAssignmentRepository.getAssignedCommandIds(deckId);
        const assignedMcuIds = DeckAssignmentRepository.getAssignedMcuIds(deckId);

        // Pokud deck nemá žádná přiřazení, pošleme prázdnou konfiguraci
        const hasAssignments = assignedServerIds.length > 0 || assignedCommandIds.length > 0 || assignedMcuIds.length > 0;

        // Servery — pouze přiřazené
        const serversRaw = ServerService.getAllServersWithCommands();
        const servers = serversRaw
            .filter(s => !hasAssignments || assignedServerIds.includes(s.id))
            .map(s => ({
                id: s.id,
                name: s.name,
                ip: s.ip,
                status: s.status
            }));

        // Příkazy — pouze přiřazené (nebo patřící přiřazeným serverům)
        const commandsRaw = CommandService.getAllCommands();
        const commands = commandsRaw
            .filter(c => {
                if (!hasAssignments) return true;
                if (assignedCommandIds.includes(c.id)) return true;
                // Pokud je server přiřazen, zahrň i jeho příkazy
                const serverId = c.server_id || c.serverId;
                return assignedServerIds.includes(serverId);
            })
            .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                server_id: c.server_id || c.serverId,
                ...(c.type === 'wol' && c.command ? { mac: c.command.trim() } : {})
            }));

        // MCU senzory — pouze přiřazené
        const mcusRaw = MCUService.getAllMCUs();
        const mcus = [];
        for (const mcu of mcusRaw) {
            if (hasAssignments && !assignedMcuIds.includes(mcu.id)) continue;
            // Decky nezahrnujeme do seznamu senzorů
            if (mcu.role === 'deck') continue;

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

module.exports = DeckService;
