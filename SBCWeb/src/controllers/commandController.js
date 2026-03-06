// controllers/commandController.js
const CommandService = require('../services/commandService');

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

    static async update(req, res) {
        try {
            const id = req.params.id;
            CommandService.updateCommand(id, req.body);
            res.status(200).json({ 
                success: true, 
                message: 'Příkaz úspěšně upraven.' 
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    static async toggleFavorite(req, res) {
        try {
            const id = req.params.id;
            const isNowFavorite = CommandService.toggleFavorite(id);
            
            res.status(200).json({ 
                success: true, 
                message: isNowFavorite ? 'Přidáno do oblíbených.' : 'Odebráno z oblíbených.',
                isFavorite: isNowFavorite
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // controllers/CommandController.js (přidej dovnitř třídy CommandController)

    static async getFavorites(req, res) {
        try {
            const favorites = CommandService.getFavoriteCommands();
            res.status(200).json({ 
                success: true, 
                data: favorites // Použijeme 'data' aby to bylo konzistentní
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: 'Chyba serveru při načítání oblíbených příkazů.',
                error: error.message
            });
        }
    }

    // Přidej do CommandController.js
    static async run(req, res) {
        try {
            const id = req.params.id;
            // Tady pak bude logika pro spuštění (SSH, Wake on LAN, atd.)
            console.log(`[EXEC] Spouštím příkaz s ID: ${id}`);
            
            // Simulace, že to chvíli trvá
            await new Promise(resolve => setTimeout(resolve, 1000));

            res.status(200).json({ 
                success: true, 
                message: 'Příkaz úspěšně spuštěn.' 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

}

module.exports = CommandController;