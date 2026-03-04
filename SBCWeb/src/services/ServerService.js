// services/ServerService.js
const Server = require('../models/Server');
const ServerRepository = require('../repositories/ServerRepository');
const CommandRepository = require('../repositories/CommandRepository'); 
const EventService = require('./EventService');

class ServerService {
    static createServer(data) {
        if (!data.name || !data.ip) {
            throw new Error('Název a IP adresa jsou povinné.');
        }

        const server = new Server(data);
        const newId = ServerRepository.create(server.toDatabase());
        server.id = newId;

        // PŘIDÁNO: Zalogování vytvoření přímo k novému serveru
        EventService.logServerEvent(newId, 'info', `Server byl přidán do systému.`);

        return server;
    }

    static getAllServersWithCommands() {
        const servers = ServerRepository.getAll();
        const allCommands = CommandRepository.getAll();

        return servers.map(server => {
            const serverCommands = allCommands.filter(cmd => cmd.serverId === server.id);

            return {
                id: server.id,
                name: server.name,
                ip: server.ipAddress,
                status: server.isOnline === 1 ? 'online' : 'offline',
                type: server.type,
                commands: serverCommands.map(cmd => ({
                    id: cmd.id,
                    name: cmd.name,
                    type: cmd.type,
                    value: cmd.command,
                    icon: cmd.type === 'wol' ? 'fa-power-off text-green-600' : 'fa-terminal text-silver-600'
                }))
            };
        });
    }

    static deleteServer(id) {
        const existing = ServerRepository.getById(id);
        if (!existing) {
            throw new Error(`Server s ID ${id} nebyl nalezen.`);
        }
        
        // PŘIDÁNO: Zalogování smazání jako globální systémová událost
        EventService.logSystemEvent('warning', `Server "${existing.name}" (${existing.ip}) byl odstraněn.`);

        return ServerRepository.delete(id);
    }

    static updateServer(id, data) {
        if (!data.name || !data.ip) throw new Error('Název a IP jsou povinné.');
        
        const result = ServerRepository.update(id, {
            name: data.name, 
            ip: data.ip, 
            api_key: data.api_key || null, 
            type: data.type || 'server'
        });

        // PŘIDÁNO: Zalogování editace
        EventService.logServerEvent(id, 'info', `Konfigurace serveru byla upravena.`);

        return result;
    }
}

module.exports = ServerService;