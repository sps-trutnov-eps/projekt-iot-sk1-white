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
}

module.exports = CommandService;