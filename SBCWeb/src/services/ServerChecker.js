const ping = require('ping');
const ServerRepository = require('../repositories/ServerRepository');
const SettingService = require('./SettingsService');
const SocketService = require('../sockets/socketService');

class ServerChecker {
    static async checkAllServers() {
        try {
            const servers = ServerRepository.getAll();
            
            for (const server of servers) {
                const ipToPing = server.ipAddress || server.ip;
                if (!ipToPing) continue;

                // Spustíme ping
                const res = await ping.promise.probe(ipToPing, {
                    timeout: 2,
                });
                
                let isOnline = res.alive ? 1 : 0;

                // --- FIX PRO WINDOWS A ČESKOU LOKALIZACI ---
                const output = res.output.toLowerCase();
                if (output.includes('nedostupn') ||      // Cílový hostitel není dostupný
                    output.includes('unreachable') ||    // Destination net unreachable
                    output.includes('vypršel') ||        // Vypršel časový limit žádosti
                    output.includes('timed out') ||      // Request timed out
                    output.includes('100% loss') ||      // 100% packet loss
                    output.includes('100% ztráta')) {    // 100% ztráta paketů
                    
                    isOnline = 0; // Natvrdo ho shodíme na offline
                }
                // -------------------------------------------

                const currentStatus = server.isOnline !== undefined ? server.isOnline : server.is_online;
                
                if (currentStatus !== isOnline) {          
                    ServerRepository.updateStatus(server.id, isOnline);
                    
                    if (SocketService.io) {
                        SocketService.broadcastServerStatus(server.id, isOnline ? 'online' : 'offline');
                    }

                    console.log(`[ServerChecker] Server ${server.name} (${ipToPing}) změnil stav na: ${isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
                }
            }
        } catch (error) {
            console.error('[ServerChecker] Chyba při kontrole serverů:', error);
        }
    }

    static start() {
        console.log(`[ServerChecker] Spouštím automatický ping serverů (dynamický časovač).`);
        
        const runChecker = async () => {
            // Zjistíme aktuální interval z DB (výchozí 60000 ms = 60s)
            const intervalMs = Number(SettingService.getSettingValue('mcu_ping_interval', 30000));

            // Spustíme kontrolu a počkáme na dokončení
            await this.checkAllServers();

            // Naplánujeme další kolo podle aktuálního nastavení
            setTimeout(runChecker, intervalMs);
        };

        // Spustíme první iteraci
        runChecker();
    }
}

module.exports = ServerChecker;