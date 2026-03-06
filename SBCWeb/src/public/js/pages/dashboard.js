/**
 * DASHBOARD.JS - Kompletní správa příkazů, serverů a statistik
 */

// --- 1. GLOBÁLNÍ DATA ---
let favoriteCommands = [];
let availableServers = [];

// Helper pro bezpečné vložení textu (např. do smazávacího modalu)
function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// --- 2. NAČÍTÁNÍ DAT Z API ---

async function loadDashboardData() {
    try {
        // 1. Načtení oblíbených příkazů
        const favRes = await fetch('/command/favorites');
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

// --- 3. GLOBÁLNÍ FUNKCE PRO HTML (onclick) ---

function populateServerSelect() {
    const select = document.getElementById('editCommandServer');
    if (!select) return;
    select.innerHTML = availableServers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

window.handleEditClick = (id) => {
    const item = favoriteCommands.find(c => c.id == id);
    if (!item) return;

    // 1. NEJDŘÍVE modal vyčistíme
    if (window.editModal) {
        window.editModal.clear();
    }

    // 2. Naplníme select se servery
    populateServerSelect();

    // 3. Dosadíme data z databáze
    const cmdValue = item.value || item.command;
    
    document.getElementById('editCommandId').value = item.id;
    document.getElementById('editCommandName').value = item.name;
    document.getElementById('editCommandServer').value = item.server_id || item.serverId || "";
    document.getElementById('editCommandType').value = item.type || 'shell';
    
    // Logika zobrazení pro Shell vs WoL
    const isWol = item.type === 'wol';
    const shellWrapper = document.getElementById('editShellInputWrapper');
    const wolWrapper = document.getElementById('editWolInputWrapper');

    if (isWol) {
        shellWrapper.classList.add('hidden');
        wolWrapper.classList.remove('hidden');
        document.getElementById('editCommandMac').value = cmdValue;
    } else {
        wolWrapper.classList.add('hidden');
        shellWrapper.classList.remove('hidden');
        document.getElementById('editCommandValue').value = cmdValue;
    }

    // 4. NAKONEC modal otevřeme
    if (window.editModal) {
        window.editModal.open();
    }
};

window.handleDeleteClick = (id, name) => {
    // 1. NEJDŘÍVE vyčistíme modal
    if (window.deleteModal) {
        window.deleteModal.clear();
    }

    // 2. AŽ TEĎ naplníme skryté inputy
    document.getElementById('deleteTargetId').value = id;
    document.getElementById('deleteTargetType').value = 'command'; 
    
    // 3. Vypíšeme název do HTML (tučně)
    document.getElementById('deleteTargetName').textContent = name;
    
    // 4. Nakonec otevřeme
    if (window.deleteModal) {
        window.deleteModal.open();
    }
};

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
        
        if (result.success) loadDashboardData();
    } catch (e) {
        console.error("Chyba při odebírání z oblíbených:", e);
        if (card) card.style.display = 'block'; // Vrátíme ji zpět v případě chyby
    }
};

window.runCommand = async (id, btnElement) => {
    if (btnElement && btnElement.disabled) return;

    let originalHtml = '';
    if (btnElement) {
        originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin text-[10px] ml-0.5"></i>';
        btnElement.disabled = true;
    }

    try {
        const response = await fetch(`/command/run/${id}`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            if (btnElement) {
                btnElement.innerHTML = '<i class="fas fa-check text-green-500 text-[10px] ml-0.5"></i>';
                setTimeout(() => { btnElement.innerHTML = originalHtml; btnElement.disabled = false; }, 2000);
            }
        } else {
            if (btnElement) {
                btnElement.innerHTML = '<i class="fas fa-times text-red-500 text-[10px] ml-0.5"></i>';
                setTimeout(() => { btnElement.innerHTML = originalHtml; btnElement.disabled = false; }, 2000);
            }
        }
    } catch (err) {
        console.error("API chyba při spouštění:", err);
        if (btnElement) {
            btnElement.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-[10px] ml-0.5"></i>';
            setTimeout(() => { btnElement.innerHTML = originalHtml; btnElement.disabled = false; }, 2000);
        }
    }
};

// --- 4. VYKRESLOVÁNÍ KARTIČEK ---

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
        const iconClass = item.type === 'wol' ? 'fa-power-off' : (item.icon || 'fa-terminal');
        const serverNameText = item.server_name || "Neznámý server";
        const cmdValue = item.value || item.command;
        
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
                        <button class="w-8 h-8 flex items-center justify-center bg-[#f0f0f0] border border-[#d1d1d1] text-gray-600 hover:bg-gray-200 hover:text-green-600 rounded-md transition-colors" title="Spustit" onclick="window.runCommand(${item.id}, this)">
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
                        ${cmdValue}
                    </p>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = cardsHtml;
}

// --- 5. INICIALIZACE A SOCKETS (DOM Content Loaded) ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Registrace modalů
    window.addCommandModal = Modal.register('addCommand');
    window.addServerModal = Modal.register('addServer');
    window.editModal = Modal.register('editCommand');
    window.deleteModal = Modal.register('delete');

    // 2. Spuštění načítání dat z backendu
    loadDashboardData();

    // 3. Event Listeners pro editaci formuláře
    const editTypeSelect = document.getElementById('editCommandType');
    if (editTypeSelect) {
        editTypeSelect.addEventListener('change', (e) => {
            const isWol = e.target.value === 'wol';
            document.getElementById('editShellInputWrapper').classList.toggle('hidden', isWol);
            document.getElementById('editWolInputWrapper').classList.toggle('hidden', !isWol);
        });
    }

    // --- LOGIKA PRO ULOŽENÍ EDITACE ---
    if (window.editModal && window.editModal.form) {
        window.editModal.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            window.editModal.hideError();

            const formData = new FormData(window.editModal.form);
            const data = Object.fromEntries(formData.entries());
            
            const finalCommand = data.type === 'wol' ? data.macAddress : data.command;
            
            if (!data.name || !finalCommand) {
                return window.editModal.showError('Vyplňte prosím všechny potřebné údaje.');
            }

            try {
                const submitBtn = window.editModal.submitBtn;
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
                submitBtn.disabled = true;

                const res = await fetch(`/command/edit/${data.id}`, {
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                        name: data.name, 
                        type: data.type, 
                        command: finalCommand,
                        serverId: data.serverId
                    })
                });
                
                const result = await res.json();
                
                if (result.success) { 
                    window.editModal.close(); 
                    loadDashboardData(); 
                } else {
                    window.editModal.showError(result.message || 'Chyba při úpravě příkazu.');
                }
                
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
            } catch (err) { 
                window.editModal.showError('Chyba komunikace s API.'); 
            }
        });
    }

    // --- LOGIKA PRO SMAZÁNÍ ---
    if (window.deleteModal && window.deleteModal.submitBtn) {
        window.deleteModal.submitBtn.addEventListener('click', async () => {
            window.deleteModal.hideError();
            
            const id = document.getElementById('deleteTargetId').value;
            const type = document.getElementById('deleteTargetType').value;
            if (!id) return;

            const endpoint = type === 'server' ? `/server/${id}` : `/command/${id}`;

            try {
                const submitBtn = window.deleteModal.submitBtn;
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mažu...';
                submitBtn.disabled = true;

                const res = await fetch(endpoint, { method: 'DELETE' });
                const result = await res.json();
                
                if (result.success) { 
                    window.deleteModal.close(); 
                    loadDashboardData();
                } else {
                    window.deleteModal.showError(result.message || 'Nelze smazat.');
                }
                
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
            } catch (err) { 
                console.error("Chyba při mazání:", err);
                window.deleteModal.showError('Smazání selhalo. Zkontrolujte připojení.'); 
            }
        });
    }

    // 4. WebSocket Spojení pro statistiky
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