const ServerService = require('../services/ServerService');

class ServerController {
    
    // Vykreslí HTML EJS šablonu (tvůj původní router)
    static renderServer(req, res) {
        try {
            res.render('servers', { projectName: 'IoT Control' });
        } catch (error) {
            res.status(500).send("Chyba při načítání stránky.");
        }
    }

    // API: Vytvoření
    static async create(req, res) {
        try {
            const createdServer = ServerService.createServer(req.body);
            res.status(201).json({ 
                success: true, 
                message: "Server úspěšně přidán.",
                result: createdServer 
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // API: Načtení všech pro JS Fetch
    static async getAll(req, res) {
        try {
            const servers = ServerService.getAllServersWithCommands();
            res.status(200).json({ 
                success: true, 
                data: servers // Pozor: náš JS na frontendu čeká vlastnost 'data', ne 'result'!
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Chyba serveru při načítání dat.' });
        }
    }

    // API: Smazání
    static async delete(req, res) {
        try {
            const id = req.params.id;
            ServerService.deleteServer(id);
            res.status(200).json({ success: true, message: 'Server úspěšně smazán.' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async update(req, res) {
        try {
            ServerService.updateServer(req.params.id, req.body);
            res.json({ success: true, message: 'Server upraven.' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}


module.exports = ServerController;