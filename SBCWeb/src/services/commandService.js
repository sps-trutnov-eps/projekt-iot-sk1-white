const Command = require('../models/Command');
const CommandRepository = require('../repositories/CommandRepository');
const MqttHandler = require('../sockets/mqttHandler');

class CommandService {
    static createCommand(data) {
        // Validace
        if (!data.server_id || !data.name || !data.type || !data.command) {
            throw new Error('Chybí povinné údaje pro vytvoření příkazu.');
        }

        if (data.type === 'wol') {
            // 1. Očistíme vstup: nahradíme tečky a pomlčky za dvojtečky a sjednotíme na velká písmena
            // Příklad: "aa.bb.cc.dd.ee.ff" -> "AA:BB:CC:DD:EE:FF"
            data.command = data.command.replace(/[\.\-]/g, ':').toUpperCase();

            // 2. Teď zkontrolujeme, jestli z toho vylezla validní MAC adresa
            const macRegex = /^([0-9A-F]{2}:){5}([0-9A-F]{2})$/;
            if (!macRegex.test(data.command)) {
                throw new Error('Neplatný formát MAC adresy. Použijte např. AA:BB:CC:DD:EE:FF, AA-BB-CC... nebo AA.BB.CC...');
            }
        }

        // Vytvoření instance z dat
        const command = new Command(data);
        
        // Zápis do databáze (z instance si vezmeme DB formát)
        const newId = CommandRepository.create(command.toDatabase());
        command.id = newId;

        this.syncCommandsToServer(data.server_id);

        return command;
    }

    static getAllCommands() {
        return CommandRepository.getAll();
    }

    static getCommandById(id) {
        return CommandRepository.getById(id);
    }

    static deleteCommand(id) {
        // Kontrola, zda existuje
        const existing = CommandRepository.getById(id);
        if (!existing) {
            throw new Error(`Příkaz s ID ${id} nebyl nalezen.`);
        }

        const serverId = existing.server_id;
        const isDeleted = CommandRepository.delete(id);

        if (isDeleted) {
            this.syncCommandsToServer(serverId);
        }

        return isDeleted;
    }

    // services/CommandService.js

static updateCommand(id, data) {
    // Přidali jsme server_id do kontroly povinných údajů
    if (!data.name || !data.type || !data.command || !data.server_id) {
        throw new Error('Chybí povinné údaje pro úpravu příkazu.');
    }

    if (data.type === 'wol') {
        data.command = data.command.replace(/[\.\-]/g, ':').toUpperCase();

        const macRegex = /^([0-9A-F]{2}:){5}([0-9A-F]{2})$/;
        if (!macRegex.test(data.command)) {
            throw new Error('Neplatný formát MAC adresy. Použijte např. AA:BB:CC:DD:EE:FF, AA-BB-CC... nebo AA.BB.CC...');
        }
    }

    const isUpdated = CommandRepository.update(id, data);

    if (isUpdated) {
            this.syncCommandsToServer(data.server_id);
        }

        return isUpdated;
}

    static toggleFavorite(id) {
        // 1. Zkontrolujeme, zda příkaz existuje
        const existing = CommandRepository.getById(id);
        if (!existing) {
            throw new Error(`Příkaz s ID ${id} nebyl nalezen.`);
        }

        // 2. Obrátíme aktuální stav (pokud byl 0, bude 1; pokud 1, bude 0)
        const newStatus = existing.isFavorite ? 0 : 1;

        // 3. Uložíme do DB
        CommandRepository.toggleFavorite(id, newStatus);

        // 4. Vrátíme nový stav, aby UI vědělo, jakou ikonu ukázat
        return newStatus === 1; 
    }
    // services/CommandService.js (přidej dovnitř třídy CommandService)

    static getFavoriteCommands() {
        return CommandRepository.getFavorites();
    }

    static syncCommandsToServer(serverId) {
        try {
            const rawCommands = CommandRepository.getByServerId(serverId);
            const commandMap = {};

            rawCommands.forEach(row => {
                // Rozdělí string z DB ("ping -c 3") na pole (["ping", "-c", "3"])
                // filter(Boolean) odstraní případné prázdné mezery navíc
                commandMap[row.name] = row.command.split(' ').filter(Boolean);
            });

            const payload = { commands: commandMap };
            const topic = `server/${serverId}/config`;

            MqttHandler.publishConfig(topic, payload);
        } catch (error) {
            console.error(`[Service] Chyba při synchronizaci příkazů pro server ${serverId}:`, error);
        }
    }
}

module.exports = CommandService;