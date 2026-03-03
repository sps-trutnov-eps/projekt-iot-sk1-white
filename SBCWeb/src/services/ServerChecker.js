const ping = require('ping');
const ServerRepository = require('../repositories/ServerRepository');

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
                // Pokud ping prošel podle exit code, ale text obsahuje chybové hlášky
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
                    console.log(`[ServerChecker] Server ${server.name} (${ipToPing}) změnil stav na: ${isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
                    
                    // Odkomentuj si tento řádek, pokud chceš vidět, co Windows reálně odpověděl
                    // console.log(`[Detail] Výstup pingu: ${res.output.trim()}`);
                }
            }
        } catch (error) {
            console.error('[ServerChecker] Chyba při kontrole serverů:', error);
        }
    }

    static start(intervalMs = 60000) {
        console.log(`[ServerChecker] Spouštím automatický ping serverů každých ${intervalMs / 1000} sekund.`);
        this.checkAllServers();
        setInterval(() => {
            this.checkAllServers();
        }, intervalMs);
    }
}

module.exports = ServerChecker;