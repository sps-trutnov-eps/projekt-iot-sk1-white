// public/js/pages/servers/commandManager.js

// Pomocná funkce napojená na tvůj existující Toast systém
function showNotification(message, type = 'info') {
    if (typeof window.openToast === 'function') {
        const isSuccess = (type !== 'error');
        window.openToast(message, isSuccess);
    } else {
        // Fallback pro jistotu do konzole
        console.log((type === 'error' ? "❌ " : "✅ ") + message);
    }
}

export async function runCommand(cmdId, btnElement) {
    console.log("[Frontend] Požadavek na spuštění příkazu ID:", cmdId);

    if (!btnElement) {
        const cardElement = document.querySelector(`div[data-cmd-id="${cmdId}"]`);
        if (cardElement) {
            btnElement = cardElement.querySelector('button i.fa-play')?.parentElement;
        }
    }

    if (btnElement && btnElement.disabled) return;

    let originalHtml = '';
    if (btnElement) {
        originalHtml = btnElement.innerHTML;
        // OPRAVA 1: Použití animate-spin z Tailwindu místo fa-spin
        btnElement.innerHTML = '<i class="fas fa-circle-notch animate-spin text-yellow-500 text-[10px] ml-0.5"></i>';
        btnElement.disabled = true;
    }

    try {
        // 1. Odeslání příkazu na backend
        const response = await fetch(`/command/run/${cmdId}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }

        // OPRAVA 2: Odchycení Wake on LAN a okamžité ukončení bez čekání
        if (data.type === 'wol') {
            console.log(`[Frontend] WOL packet odeslán.`);
            showNotification('WOL paket byl úspěšně odeslán do sítě!', 'success');
            
            if (btnElement) btnElement.innerHTML = '<i class="fas fa-paper-plane text-green-500 text-[10px] ml-0.5"></i>';
            if (typeof loadMiniLog === 'function') loadMiniLog();
            
            return; // Ukončí try blok, přeskočí polling a skočí rovnou do finally bloku (kde se za 3s resetne tlačítko)
        }

        const historyId = data.historyId;
        console.log(`[Frontend] Příkaz odeslán. Čekám na výsledek (History ID: ${historyId})...`);

        // Okamžitě aktualizujeme mini-log, aby se tam objevil "pending" stav
        if (typeof loadMiniLog === 'function') loadMiniLog();

        // 2. POLLING: Čekání na výsledek (max 35 vteřin, abychom pokryli ten 30s backend timeout)
        let attempts = 0;
        const maxAttempts = 35;
        let finalStatus = 'pending';

        while (finalStatus === 'pending' && attempts < maxAttempts) {
            // Počkáme 1 vteřinu
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;

            // Zeptáme se backendu na aktuální stav tohoto konkrétního příkazu
            const statusResponse = await fetch(`/command/history/${historyId}`);
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                finalStatus = statusData.status;

                // Pokud to už není pending, vyskočíme ze smyčky
                if (finalStatus === 'success' || finalStatus === 'error') {
                    if (finalStatus === 'success') {
                        showNotification('Příkaz úspěšně dokončen!', 'success');
                        if (btnElement) btnElement.innerHTML = '<i class="fas fa-check text-green-500 text-[10px] ml-0.5"></i>';
                    } else {
                        showNotification(`Příkaz selhal: ${statusData.error_output || 'Neznámá chyba'}`, 'error');
                        if (btnElement) btnElement.innerHTML = '<i class="fas fa-times text-red-500 text-[10px] ml-0.5"></i>';
                    }
                    
                    // Znovu aktualizujeme mini-log, aby tam naskočila zelená/červená
                    if (typeof loadMiniLog === 'function') loadMiniLog();
                    break; 
                }
            }
        }

        // Pokud to vypršelo i na frontendu
        if (finalStatus === 'pending') {
            showNotification('Vypršel časový limit pro odpověď od serveru.', 'error');
            if (btnElement) btnElement.innerHTML = '<i class="fas fa-times text-red-500 text-[10px] ml-0.5"></i>';
        }

    } catch (error) {
        console.error("[Frontend] Chyba:", error);
        if (btnElement) btnElement.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-[10px] ml-0.5"></i>';
        showNotification(error.message || 'Došlo k chybě při komunikaci se serverem.', 'error');
    } finally {
        // 3. Po 3 vteřinách vrátíme tlačítko do výchozího stavu (ikona Play) pro WOL i pro normální příkazy
        if (btnElement) {
            setTimeout(() => { 
                btnElement.innerHTML = originalHtml; 
                btnElement.disabled = false; 
            }, 3000);
        }
    }
}

export async function loadMiniLog(serverId = null) {
    const container = document.getElementById('mini-log-container');
    if (!container) return;

    try {
        const url = serverId ? `/command/history/recent?serverId=${serverId}` : '/command/history/recent';
        const res = await fetch(url);
        const json = await res.json();

        if (!json.success || json.data.length === 0) {
            container.innerHTML = `<div class="text-sm text-ash-grey-400 text-center py-4">Zatím žádné akce.</div>`;
            return;
        }

        container.innerHTML = json.data.map(item => {
            let statusColor = 'text-yellow-500';
            let rowClass = 'opacity-80';
            let iconHTML = '';

            if (item.status === 'success') {
                statusColor = 'text-green-500';
                rowClass = '';
                iconHTML = `<i class="fas fa-check-circle text-sm"></i>`;
            } else if (item.status === 'error') {
                statusColor = 'text-red-500';
                rowClass = '';
                iconHTML = `<i class="fas fa-exclamation-circle text-sm"></i>`;
            } else {
                // Spinner pomocí Tailwind animate-spin
                iconHTML = `
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                `;
            }

            // --- ZMĚNA ZDE: Využití globální funkce pro čas a přidání fallbacku ---
            const timeStr = window.formatTimeByTimezone 
                ? window.formatTimeByTimezone(item.executed_at) 
                : new Date(item.executed_at).toLocaleTimeString('cs-CZ');

            return `
                <div class="flex gap-3 items-start border-b border-midnight-violet-800/30 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0 transition-all duration-300 ${rowClass}">
                    <div class="mt-0.5 ${statusColor} flex items-center justify-center">
                        ${iconHTML}
                    </div>
                    <div class="flex flex-col">
                        <span class="text-sm text-gray-200 font-medium">${item.command_name}</span>
                        <span class="text-[11px] text-ash-grey-400">
                            ${item.server_name || 'Neznámý server'} • 
                            <span class="local-time" data-timestamp="${item.executed_at}">${timeStr}</span>
                        </span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">Chyba načítání historie.</div>`;
    }
}

// OPRAVA 3: Zpřístupnění do globálního scope, aby na funkce dosáhlo HTML
window.runCommand = runCommand;
window.loadMiniLog = loadMiniLog;