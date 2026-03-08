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

    static async run(req, res) {
        try {
            const id = req.params.id;
            console.log(id);
            // 1. Získáme detail příkazu z DB
            const command = CommandService.getCommandById(id); 
            console.log(command);
            if (!command) {
                return res.status(404).json({ success: false, message: 'Příkaz nenalezen.' });
            }

            // Můžeme si vypsat i cílový server_id, abychom měli v logu pořádek
            console.log(`[EXEC] Odesílám příkaz s ID: ${id} (Název: ${command.name}, Cílový Server ID: ${command.serverId})`);

            // 2. Vytvoříme úvodní záznam v DB se statusem 'pending'
            // logExecution vrací lastInsertRowid
            const historyId = CommandHistoryService.logExecution(id, 'pending', null, null);

            // 3. Odeslání přes MQTT (ZDE JSOU ZMĚNY)
            const payload = {
                // Posíláme 'name' (např. "giganiga"), protože pod tímto klíčem to Python zná ve svém COMMAND_MAP
                command_id: command.name, 
                sender_id: 'web_admin',
                history_id: historyId        // Předáme ID, aby ho Linux mohl poslat zpět
            };

            // Vytvoříme topic dynamicky podle toho, ke kterému serveru příkaz patří
            console.log(command.serverId);
            const executeTopic = `server/${command.serverId}/execute`;

            // Odešleme do nového topicu
            MqttHandler.publishCommand(executeTopic, payload);

            // 4. Odpovíme uživateli, že je zpracováváno
            res.status(202).json({ 
                success: true, 
                message: 'Příkaz odeslán ke zpracování.',
                historyId: historyId // Odesíláme na frontend, aby si mohl pingat na výsledek
            });

        } catch (error) {
            console.error('[CommandController]', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Přidej do CommandController.js
    static async getHistory(req, res) {
        try {
            const historyId = req.params.id;
            // Potřebuješ metodu v Service, která vytáhne ten jeden řádek z tabulky command_history
            const historyRecord = CommandHistoryService.getExecutionById(historyId); 
            
            if (!historyRecord) {
                return res.status(404).json({ success: false, message: 'Záznam nenalezen.' });
            }

            // Vrátíme to na frontend
            res.json(historyRecord);
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getRecentHistory(req, res) {
            try {
                // Umožníme filtrovat podle query parametru (?serverId=1)
                const serverId = req.query.serverId || null;
                const history = CommandHistoryService.getRecent(serverId); // Nebo CommandHistoryRepository, podle toho, jak to máš provázané
                
                res.json({ success: true, data: history });
            } catch (error) {
                console.error(error);
                res.status(500).json({ success: false, message: error.message });
            }
    }

}

module.exports = CommandController;