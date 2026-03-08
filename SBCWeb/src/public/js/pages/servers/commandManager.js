// public/js/pages/servers/commandManager.js

window.runCommand = async (id, btnElement) => {
    if (btnElement && btnElement.disabled) return;
    
    // ✅ Zjistíme typ z data atributu
    const cmdType = btnElement?.dataset?.cmdType || 'shell';
    
    let originalHtml = btnElement ? btnElement.innerHTML : '';
    if (btnElement) {
        btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin text-[10px] ml-0.5"></i>';
        btnElement.disabled = true;
    }

    try {
        // ✅ WOL jde na /wol/wake, ostatní na /command/run
        const url = cmdType === 'wol' ? '/wol/wake-by-command' : `/command/run/${id}`;
        const body = cmdType === 'wol' ? JSON.stringify({ commandId: id }) : undefined;

        const response = await fetch(url, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        const result = await response.json();
        const icon = result.success ? 'fa-check text-green-500' : 'fa-times text-red-500';
        if (btnElement) {
            btnElement.innerHTML = `<i class="fas ${icon} text-[10px] ml-0.5"></i>`;
            setTimeout(() => { btnElement.innerHTML = originalHtml; btnElement.disabled = false; }, 2000);
        }
    } catch (err) {
        if (btnElement) {
            btnElement.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-[10px] ml-0.5"></i>';
            setTimeout(() => { btnElement.innerHTML = originalHtml; btnElement.disabled = false; }, 2000);
        }
    }
};

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