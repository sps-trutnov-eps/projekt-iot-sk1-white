/**
 * DASHBOARD.JS - Kompletní správa příkazů, serverů a statistik
 */

// --- 1. GLOBÁLNÍ DATA ---
// Data už nejsou natvrdo v kódu, budeme je stahovat z API
let favoriteCommands = [];
let availableServers = [];

// Helper pro bezpečné vložení textu (např. do smazávacího modalu)
function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// --- 2. NAČÍTÁNÍ DAT Z API ---

/**
 * Načte oblíbené příkazy a servery z backendu a překreslí UI
 */
async function loadDashboardData() {
    try {
        // 1. Načtení oblíbených příkazů
        const favRes = await fetch('/command/favorites'); // <-- Zkontroluj si, že URL odpovídá tvému routeru
        const favData = await favRes.json();
        if (favData.success) {
            favoriteCommands = favData.data;
        }

        // 2. Načtení serverů (potřebujeme je do <select> v editačním modalu)
        const srvRes = await fetch('/server/all');
        const srvData = await srvRes.json();
        if (srvData.success) {
            availableServers = srvData.data;
        }

        renderCommands();
    } catch (error) {
        console.error("Chyba při načítání dat dashboardu:", error);
    }
}

// --- 3. POMOCNÉ FUNKCE (GLOBÁLNÍ) ---

function populateServerSelect() {
    const select = document.getElementById('editCommandServer');
    if (!select) return;
    // Tady už používáme dynamicky stažené servery
    select.innerHTML = availableServers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

window.handleEditClick = (id) => {
    const item = favoriteCommands.find(c => c.id == id);
    if (!item) return;

    populateServerSelect();

    document.getElementById('editCommandId').value = item.id;
    document.getElementById('editCommandName').value = item.name;
    document.getElementById('editCommandServer').value = item.serverId || item.server_id || "";
    document.getElementById('editCommandType').value = item.type || 'shell';
    
    const isWol = item.type === 'wol';
    const shellWrapper = document.getElementById('editShellInputWrapper');
    const wolWrapper = document.getElementById('editWolInputWrapper');

    if (isWol) {
        shellWrapper.classList.add('hidden');
        wolWrapper.classList.remove('hidden');
        document.getElementById('editCommandMac').value = item.command;
    } else {
        wolWrapper.classList.add('hidden');
        shellWrapper.classList.remove('hidden');
        document.getElementById('editCommandValue').value = item.command;
    }

    if (window.editModal) {
        window.editModal.clear();
        window.editModal.open();
    }
};

window.handleDeleteClick = (id, name) => {
    document.getElementById('deleteTargetId').value = id;
    document.getElementById('deleteTargetName').textContent = name;
    if (window.deleteModal) {
        window.deleteModal.clear();
        window.deleteModal.open();
    }
};

// Funkce pro odebrání z oblíbených přímo z dashboardu
window.toggleFavOnDashboard = async (event, commandId) => {
    if (event) event.stopPropagation();
    
    // Okamžitě kartičku vizuálně skryjeme pro lepší pocit z UI (Optimistic Update)
    const card = document.querySelector(`.fav-card[data-cmd-id="${commandId}"]`);
    if (card) card.style.display = 'none';

    try {
        const response = await fetch(`/command/${commandId}/favorite`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        
        // Načteme nová data pro jistotu
        if (result.success) loadDashboardData();
    } catch (e) {
        console.error("Chyba při odebírání z oblíbených:", e);
        if (card) card.style.display = 'block'; // Vrátíme ji zpět v případě chyby
    }
};

// --- 4. VYKRESLOVÁNÍ ---

function renderCommands() {
    const grid = document.getElementById('commandsGrid');
    if (!grid) return;
    
    if (favoriteCommands.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-ash-grey-200 rounded-xl text-ash-grey-400 min-h-[150px]">
                <i class="far fa-star text-3xl mb-3 text-ash-grey-300"></i>
                <span class="text-sm font-medium">Zatím nemáš žádné oblíbené zkratky.</span>
                <span class="text-xs mt-1 text-ash-grey-400">Přidej si je pomocí hvězdičky v sekci Serverů.</span>
            </div>
        `;
        return;
    }

    const cardsHtml = favoriteCommands.map(item => {
        const safeName = escapeQuotes(item.name);
        const iconClass = item.type === 'wol' ? 'fa-power-off' : 'fa-terminal';
        // Název serveru s fallbackem
        const serverNameText = item.server_name || "Neznámý server";
        
        return `
            <div class="fav-card relative bg-white border border-vintage-grape-200 rounded-[14px] p-4 shadow-sm flex flex-col justify-between min-h-[120px]" data-cmd-id="${item.id}">
                <div class="flex items-center justify-between mb-4 pr-1"> 
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-[#e6e6e6] rounded-[10px] flex items-center justify-center shrink-0">
                            <i class="fas ${iconClass} text-gray-700 text-sm"></i>
                        </div>
                        
                        <div class="flex flex-col">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-gray-900 text-base truncate max-w-[120px] md:max-w-[150px]">${item.name}</span>
                                <button onclick="window.toggleFavOnDashboard(event, ${item.id})" class="focus:outline-none transition-transform hover:scale-110" title="Odebrat z oblíbených">
                                    <i class="fas fa-star text-yellow-400 text-sm"></i>
                                </button>
                            </div>
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">${serverNameText}</span>
                        </div>
                    </div>

                    <div class="flex gap-1.5 shrink-0">
                        <button class="w-8 h-8 flex items-center justify-center bg-[#f0f0f0] border border-[#d1d1d1] text-gray-600 hover:bg-gray-200 hover:text-green-600 rounded-md transition-colors" title="Spustit" onclick="window.runCommand(${item.id})">
                            <i class="fas fa-play text-[10px] ml-0.5"></i>
                        </button>
                        <button class="w-8 h-8 flex items-center justify-center bg-[#f0f0f0] border border-[#d1d1d1] text-gray-600 hover:bg-gray-200 rounded-md transition-colors" title="Upravit" onclick="window.handleEditClick(${item.id})">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button class="w-8 h-8 flex items-center justify-center bg-[#f0f0f0] border border-[#d1d1d1] text-gray-600 hover:bg-gray-200 hover:text-red-500 rounded-md transition-colors" title="Smazat" onclick="window.handleDeleteClick(${item.id}, '${safeName}')">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
                
                <div class="mt-auto">
                    <p class="text-[12px] font-mono text-gray-500 truncate bg-[#e2e2e2] px-3 py-2 rounded-md border border-[#c4c4c4]">
                        ${item.command}
                    </p>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = cardsHtml;
}

// --- 5. INICIALIZACE A SOCKETS ---

document.addEventListener('DOMContentLoaded', () => {
    // Registrace modalů
    window.addCommandModal = Modal.register('addCommand');
    window.addServerModal = Modal.register('addServer');
    window.editModal = Modal.register('editCommand');
    window.deleteModal = Modal.register('delete');

    // Spuštění načítání dat z backendu
    loadDashboardData();

    // Event Listeners pro editaci
    const editTypeSelect = document.getElementById('editCommandType');
    if (editTypeSelect) {
        editTypeSelect.addEventListener('change', (e) => {
            const isWol = e.target.value === 'wol';
            document.getElementById('editShellInputWrapper').classList.toggle('hidden', isWol);
            document.getElementById('editWolInputWrapper').classList.toggle('hidden', !isWol);
        });
    }

    if (window.editModal && window.editModal.form) {
        window.editModal.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(window.editModal.form);
            const data = Object.fromEntries(formData);
            
            // ZDE DOPLŇ reálný fetch pro uložení editace...
            console.log("[API] Ukládám změny:", data);
            // await fetch(`/command/edit/${data.id}`, { ... })
            
            window.editModal.close();
            loadDashboardData(); // Přenačíst data po editaci
        });
    }

    // WebSocket Spojení pro statistiky (zůstává beze změny)
    const socket = io();
    let currentStats = { activeMcus: 0, totalSensors: 0, dataPointsToday: 0, alertsToday: 0 };

    const renderStats = () => {
        const ids = ['statActiveMCUs', 'statConnectedSensors', 'statDataPoints', 'statAlerts'];
        const keys = ['activeMcus', 'totalSensors', 'dataPointsToday', 'alertsToday'];
        ids.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.innerText = currentStats[keys[i]];
        });
    };

    socket.on('connect', () => {
        console.log('[Socket] Připojeno.');
        socket.emit('subscribe_all');
        socket.emit('request_dashboard_stats');
    });

    socket.on('dashboard_stats_update', (stats) => {
        Object.assign(currentStats, stats);
        renderStats();
    });

    socket.on('system_alert', () => {
        currentStats.alertsToday += 1;
        renderStats();
    });

    socket.on('mcu_status', () => socket.emit('request_dashboard_stats'));
});