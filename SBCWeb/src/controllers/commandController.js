// controllers/commandController.js
const CommandService = require('../services/CommandService');

class CommandController {
    static async create(req, res) {
        try {
            // 1. Získáme přesně ty klíče, které posílá FormData z HTML
            const { serverId, name, type, command, macAddress } = req.body;

            // 2. Podle typu akce se rozhodneme, co je vlastně náš "příkaz"
            const actualCommandData = (type === 'wol') ? macAddress : command;

            // 3. Zmapování dat pro Service
            const commandData = {
                server_id: serverId, // Dříve tu bylo req.body.server
                name: name,
                type: type,
                command: actualCommandData // Dříve tu bylo req.body.data
            };

            const createdCommand = CommandService.createCommand(commandData);
            
            res.status(201).json({ 
                success: true, 
                result: createdCommand 
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // ... (metody getAll a delete zůstávají beze změny)
    static async getAll(req, res) {
        try {
            const commands = CommandService.getAllCommands();
            res.status(200).json({ success: true, result: commands });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Chyba serveru při načítání příkazů.' });
        }
    }

    static async delete(req, res) {
        try {
            const id = req.params.id;
            CommandService.deleteCommand(id);
            res.status(200).json({ success: true, message: 'Příkaz úspěšně smazán.' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = CommandController;