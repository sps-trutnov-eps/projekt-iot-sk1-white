const Command = require('../models/Command');
const CommandRepository = require('../repositories/CommandRepository');

class CommandService {
    static createCommand(data) {
        // Validace
        if (!data.server_id || !data.name || !data.type || !data.command) {
            throw new Error('Chybí povinné údaje pro vytvoření příkazu.');
        }

        if (data.type === 'wol') {
            const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
            if (!macRegex.test(data.command)) {
                throw new Error('Neplatný formát MAC adresy pro Wake on LAN.');
            }
        }

        // Vytvoření instance z dat
        const command = new Command(data);
        
        // Zápis do databáze (z instance si vezmeme DB formát)
        const newId = CommandRepository.create(command.toDatabase());
        command.id = newId;

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

        return CommandRepository.delete(id);
    }

    static updateCommand(id, data) {
        if (!data.name || !data.type || !data.command) {
            throw new Error('Chybí povinné údaje pro úpravu příkazu.');
        }

        if (data.type === 'wol') {
            const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
            if (!macRegex.test(data.command)) {
                throw new Error('Neplatný formát MAC adresy pro Wake on LAN.');
            }
        }

        return CommandRepository.update(id, data);
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

}

module.exports = CommandService;