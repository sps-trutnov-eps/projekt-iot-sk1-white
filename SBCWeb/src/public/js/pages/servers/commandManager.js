// public/js/pages/servers/commandManager.js

export async function runCommand(cmdId, btnElement) {
    console.log("[Frontend] Požadavek na spuštění příkazu ID:", cmdId);

    // Pokud náhodou nepředáš 'this' z HTML, pokusíme se tlačítko najít podle ID karty
    if (!btnElement) {
        const cardElement = document.querySelector(`div[data-cmd-id="${cmdId}"]`);
        if (cardElement) {
            // Najde tlačítko uvnitř karty, které aktuálně obsahuje ikonu play
            btnElement = cardElement.querySelector('button i.fa-play')?.parentElement;
        }
    }

    // Ochrana proti dvojitému kliknutí
    if (btnElement && btnElement.disabled) return;

    // 1. Vizuální změna (uložíme si původní HTML a dáme tam spinner)
    let originalHtml = '';
    if (btnElement) {
        originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin text-[10px] ml-0.5"></i>';
        btnElement.disabled = true;
    }

    try {
        // 2. Odeslání požadavku na backend
        const response = await fetch(`/command/run/${cmdId}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        console.log("[Frontend] Odpověď serveru:", data);
        
        // 3. Zpracování odpovědi a zobrazení správné ikony
        if (data.success) {
            if (btnElement) {
                btnElement.innerHTML = '<i class="fas fa-check text-green-500 text-[10px] ml-0.5"></i>';
            }
            showNotification('Příkaz odeslán ke zpracování!', 'success');
            console.log("ID v historii:", data.historyId);
        } else {
            if (btnElement) {
                btnElement.innerHTML = '<i class="fas fa-times text-red-500 text-[10px] ml-0.5"></i>';
            }
            showNotification(`Chyba: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error("[Frontend] Chyba při odesílání příkazu:", error);
        if (btnElement) {
            btnElement.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-[10px] ml-0.5"></i>';
        }
        showNotification('Došlo k chybě při komunikaci se serverem.', 'error');
    } finally {
        // 4. Vrátíme tlačítko zpět do normálu po 2 vteřinách
        if (btnElement) {
            setTimeout(() => { 
                btnElement.innerHTML = originalHtml; 
                btnElement.disabled = false; 
            }, 2000);
        }
    }
}

// Jednoduchá pomocná funkce pro notifikace
function showNotification(message, type = 'info') {
    if (type === 'error') {
        alert("❌ " + message);
    } else {
        console.log("✅ " + message); 
    }
}

// public/js/pages/servers/commandManager.js

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

    const timeStr = new Date(item.executed_at).toLocaleTimeString('cs-CZ');

    return `
        <div class="flex gap-3 items-start border-b border-midnight-violet-800/30 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0 transition-all duration-300 ${rowClass}">
            <div class="mt-0.5 ${statusColor} flex items-center justify-center">
                ${iconHTML}
            </div>
            <div class="flex flex-col">
                <span class="text-sm text-gray-200 font-medium">${item.command_name}</span>
                <span class="text-[11px] text-ash-grey-400">${item.server_name} • ${timeStr}</span>
            </div>
        </div>
    `;
}).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">Chyba načítání historie.</div>`;
    }
}