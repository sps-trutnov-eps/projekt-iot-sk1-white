// controllers/commandController.js
const CommandService = require('../services/commandService');
const CommandHistoryService = require('../services/CommandHistoryService');
const MqttHandler = require('../sockets/mqttHandler')

class CommandController {
    static async create(req, res) {
        try {
            // 1. Přidali jsme 'server' a 'is_favorite', aby kontroler chytil všechno
            const { serverId, server_id, server, name, type, command, macAddress, is_favorite } = req.body;

            // 2. Najdeme ID serveru, ať už se klíč jmenuje jakkoliv
            const finalServerId = serverId || server_id || server;

            // 3. Ošetření pro WoL (pokud frontend pošle rovnou 'command', použijeme ho, jinak macAddress)
            const actualCommandData = (type === 'wol') ? (macAddress || command) : command;

            // 4. Zmapování dat pro Service (včetně is_favorite!)
            const commandData = {
                server_id: finalServerId,
                name: name,
                type: type,
                command: actualCommandData,
                is_favorite: is_favorite ? 1 : 0 // Tady to chybělo! Nyní se uloží jako oblíbený.
            };

            const createdCommand = CommandService.createCommand(commandData);
            
            res.status(201).json({ 
                success: true, 
                result: createdCommand 
            });
        } catch (error) {
            console.log("Chyba v controlleru:", error);
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
            
            // 1. Získáme detail příkazu z DB (předpokládám, že máš metodu getById)
            const command = CommandService.getCommandById(id); 
            if (!command) {
                return res.status(404).json({ success: false, message: 'Příkaz nenalezen.' });
            }

            console.log(`[EXEC] Odesílám příkaz s ID: ${id} (${command.command})`);

            // 2. Vytvoříme úvodní záznam v DB se statusem 'pending'
            // logExecution vrací lastInsertRowid
            const historyId = CommandHistoryService.logExecution(id, 'pending', null, null);

            // 3. Odeslání přes MQTT
            const payload = {
                command_id: command.command, // Odesíláme samotný text/identifikátor příkazu
                sender_id: 'web_admin',
                history_id: historyId        // Předáme ID, aby ho Linux mohl poslat zpět
            };

            MqttHandler.publishCommand('server/commands', payload);

            // 4. Odpovíme uživateli, že je zpracováváno
            res.status(202).json({ 
                success: true, 
                message: 'Příkaz odeslán ke zpracování.',
                historyId: historyId // Můžeme poslat na frontend, aby si mohl pingat na výsledek
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

}

module.exports = CommandController;