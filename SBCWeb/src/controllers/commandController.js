const CommandService = require('../services/CommandService');

class CommandController {
    static async create(req, res) {
        try {
            // Zmapování dat z requestu (podle toho, co posíláme z modalu)
            const commandData = {
                server_id: req.body.server, 
                name: req.body.name,
                type: req.body.type,
                command: req.body.data // Jak jsme si to připravili v JS z minula
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

    static async getAll(req, res) {
        try {
            const commands = CommandService.getAllCommands();
            res.status(200).json({ 
                success: true, 
                result: commands 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: 'Chyba serveru při načítání příkazů.' 
            });
        }
    }

    static async delete(req, res) {
        try {
            const id = req.params.id;
            CommandService.deleteCommand(id);
            res.status(200).json({ 
                success: true, 
                message: 'Příkaz úspěšně smazán.' 
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
}

module.exports = CommandController;