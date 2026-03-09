// controllers/commandController.js
const CommandService = require('../services/commandService');
const CommandHistoryService = require('../services/CommandHistoryService');
const MqttHandler = require('../sockets/mqttHandler')
const { sendMagicPacket } = require('../services/wolService');

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
            console.log(error)
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
            const command = CommandService.getCommandById(id); 
            if (!command) {
                return res.status(404).json({ success: false, message: 'Příkaz nenalezen.' });
            }

            // ========================================================
            // VĚTEV 1: WAKE ON LAN (WOL)
            // ========================================================
            if (command.type === 'wol') {
                // U WOL rovnou ukládáme do historie jako 'success', protože nečekáme na odpověď
                await sendMagicPacket(command.command); // <-- tohle chybělo!
                const historyId = CommandHistoryService.logExecution(id, 'success', null, null);
                // ZDE ODEŠLEŠ WOL PAKET
                // (Poznámka: Pokud WOL posíláš z tohoto Node.js serveru, doporučuji použít 
                // knihovnu 'wake_on_lan' (npm install wake_on_lan) a zavolat:
                // const wol = require('wake_on_lan'); wol.wake(command.command); )

                return res.status(202).json({ 
                    success: true, 
                    message: 'WOL paket byl odeslán do sítě.',
                    historyId: historyId,
                    type: 'wol' // <-- TOHLE ŘEKNE FRONTENDU, ŽE MÁ PŘESKOČIT ČEKÁNÍ
                });
            }

            // ========================================================
            // VĚTEV 2: KLASICKÝ PŘÍKAZ (SHELL)
            // ========================================================
            
            // 1. Založení záznamu v DB jako 'pending'
            const historyId = CommandHistoryService.logExecution(id, 'pending', null, null);

            // 2. Odeslání přes MQTT
            const payload = {
                command_id: command.name, 
                sender_id: 'web_admin',
                history_id: historyId
            };
            const targetId = command.serverId || command.server_id;
            const executeTopic = `server/${targetId}/execute`;
            MqttHandler.publishCommand(executeTopic, payload);

            // 3. BEZPEČNOSTNÍ TIMEOUT (30 vteřin)
            setTimeout(() => {
                try {
                    const checkRecord = CommandHistoryService.getExecutionById(historyId);
                    
                    if (checkRecord && checkRecord.status === 'pending') {
                        CommandHistoryService.updateExecution(
                            historyId, 
                            'error', 
                            null, 
                            'Timeout: Server neodpověděl v časovém limitu. Zařízení je možná offline nebo došlo ke ztrátě spojení.'
                        );
                        console.log(`[TIMEOUT] Příkaz ID ${historyId} vypršel a byl označen jako error.`);
                    }
                } catch (err) {
                    console.error('[TIMEOUT] Chyba při kontrole timeoutu:', err);
                }
            }, 30000); 

            // 4. Odpověď frontendu
            return res.status(202).json({ 
                success: true, 
                message: 'Příkaz odeslán ke zpracování.',
                historyId: historyId,
                type: 'shell' // <-- Frontend ví, že má zobrazit kolečko a čekat
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: error.message });
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

    // src/controllers/CommandController.js

    // src/controllers/CommandController.js

    static async deleteHistory(req, res) {
        try {
            const { id } = req.params;
            const success = CommandHistoryService.deleteEntry(id);

            if (success) {
                res.json({ success: true, message: 'Záznam historie byl smazán.' });
            } else {
                res.status(404).json({ success: false, message: 'Záznam nebyl nalezen.' });
            }
        } catch (error) {
            console.error("Controller Error (deleteHistory):", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

}

module.exports = CommandController;