const Server = require('../models/Server');
const ServerRepository = require('../repositories/ServerRepository');
const CommandRepository = require('../repositories/CommandRepository'); // Abychom mohli načíst i příkazy

class ServerService {
    static createServer(data) {
        if (!data.name || !data.ip) {
            throw new Error('Název a IP adresa jsou povinné.');
        }

        const server = new Server(data);
        const newId = ServerRepository.create(server.toDatabase());
        server.id = newId;

        return server;
    }

    /**
     * Vrátí servery vč. jejich příkazů (připraveno pro Frontend)
     */
    static getAllServersWithCommands() {
        const servers = ServerRepository.getAll();
        const allCommands = CommandRepository.getAll(); // Načteme všechny příkazy

        return servers.map(server => {
            // Najdeme příkazy patřící k tomuto serveru
            const serverCommands = allCommands.filter(cmd => cmd.serverId === server.id);

            // Zformátujeme výstup pro náš JavaScript
            return {
                id: server.id,
                name: server.name,
                ip: server.ipAddress,
                status: server.isOnline === 1 ? 'online' : 'offline',
                type: server.type,
                // Namapování příkazů pro EJS/JS (včetně ikon)
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
        
        // TIP: Zde bys mohl smazat i všechny příkazy patřící k tomuto serveru, 
        // nebo se spolehnout na ON DELETE CASCADE v SQLite.
        
        return ServerRepository.delete(id);
    }
}

module.exports = ServerService;