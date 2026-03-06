/**
 * DASHBOARD.JS - Kompletní správa příkazů, serverů a statistik
 */

// --- 1. PLACEHOLDER DATA ---
// Ujisti se, že data obsahují 'type' a 'serverId', aby modal věděl, co vybrat.
const commands = [
    { id: 1, title: "Restart Apache", cmd: "sudo systemctl restart apache2", type: "shell", serverId: "1", icon: "fa-sync", iconColor: "text-blue-500" },
    { id: 2, title: "Vyčistit logy", cmd: "sudo journalctl --vacuum-time=1d", type: "shell", serverId: "2", icon: "fa-broom", iconColor: "text-yellow-600" },
    { id: 3, title: "Probudit NAS", cmd: "00:1A:2B:3C:4D:5E", type: "wol", serverId: "3", icon: "fa-power-off", iconColor: "text-orange-500" }
];

const servers = [
    { id: "1", name: "Produkční Web" },
    { id: "2", name: "Záložní DB" },
    { id: "3", name: "Home Lab" }
];

// --- 2. POMOCNÉ FUNKCE (GLOBÁLNÍ) ---

/**
 * Naplní <select> v editačním modalu dostupnými servery
 */
function populateServerSelect() {
    const select = document.getElementById('editCommandServer');
    if (!select) return;
    select.innerHTML = servers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

/**
 * Hlavní funkce pro otevření editace. 
 * Je vázána na window, aby ji onclick v HTML mohl volat.
 */
window.handleEditClick = (id) => {
    console.log("[Edit] Otevírám editaci pro ID:", id);
    
    const item = commands.find(c => c.id == id);
    if (!item) {
        console.error("[Edit] Příkaz nenalezen!");
        return;
    }

    populateServerSelect();

    // Plnění polí podle tvých ID v HTML
    document.getElementById('editCommandId').value = item.id;
    document.getElementById('editCommandName').value = item.title;
    document.getElementById('editCommandServer').value = item.serverId || "";
    document.getElementById('editCommandType').value = item.type || 'shell';
    
    // Logika zobrazení Shell vs WoL
    const isWol = item.type === 'wol';
    const shellWrapper = document.getElementById('editShellInputWrapper');
    const wolWrapper = document.getElementById('editWolInputWrapper');

    if (isWol) {
        shellWrapper.classList.add('hidden');
        wolWrapper.classList.remove('hidden');
        document.getElementById('editCommandMac').value = item.cmd;
    } else {
        wolWrapper.classList.add('hidden');
        shellWrapper.classList.remove('hidden');
        document.getElementById('editCommandValue').value = item.cmd;
    }

    // Vyčištění chyb a otevření modalu
    if (window.editModal) {
        window.editModal.clear();
        window.editModal.open();
    }
};

/**
 * Logika pro smazání
 */
window.handleDeleteClick = (id, name) => {
    document.getElementById('deleteTargetId').value = id;
    document.getElementById('deleteTargetName').textContent = name;
    if (window.deleteModal) {
        window.deleteModal.clear();
        window.deleteModal.open();
    }
};

/**
 * Vykreslení kartiček do gridu
 */
function renderCommands() {
    const grid = document.getElementById('commandsGrid');
    if (!grid) return;
    
    const cardsHtml = commands.map(item => `
        <div class="group relative bg-silver-50 border border-ash-grey-200 rounded-xl p-5 hover:border-vintage-grape-400 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[130px]">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                    <i class="fas ${item.icon} text-sm ${item.iconColor}"></i>
                </div>
                <span class="font-bold text-midnight-violet-900 text-base truncate">${item.title}</span>
            </div>
            <p class="mt-4 text-[11px] font-mono text-ash-grey-500 truncate bg-ash-grey-100 px-3 py-2 rounded border border-ash-grey-200">${item.cmd}</p>
            
            <div class="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="handleEditClick(${item.id})" class="p-1.5 bg-white text-silver-500 hover:text-vintage-grape-600 rounded border border-ash-grey-200">
                    <i class="fas fa-edit text-xs"></i>
                </button>
                <button onclick="handleDeleteClick(${item.id}, '${item.title}')" class="p-1.5 bg-white text-silver-500 hover:text-red-500 rounded border border-ash-grey-200">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');

    grid.innerHTML = cardsHtml + `
        <button id="addCommandCard" class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-ash-grey-200 rounded-xl text-ash-grey-400 hover:border-vintage-grape-300 hover:text-vintage-grape-400 transition-all min-h-[130px] group">
            <i class="fas fa-plus-circle text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
            <span class="text-xs font-bold uppercase tracking-wider">Přidat novou zkratku</span>
        </button>
    `;

    // Znovu-napojení "Add" tlačítka po překreslení
    const addBtn = document.getElementById('addCommandCard');
    if (addBtn && window.addCommandModal) {
        addBtn.addEventListener('click', () => window.addCommandModal.open());
    }
}

// --- 3. INICIALIZACE A SOCKETS ---

document.addEventListener('DOMContentLoaded', () => {
    // A) Registrace modalů do window scope
    window.addCommandModal = Modal.register('addCommand');
    window.addServerModal = Modal.register('addServer');
    window.editModal = Modal.register('editCommand');
    window.deleteModal = Modal.register('delete');

    // B) Vykreslení úvodních dat
    renderCommands();

    // C) Event Listeners pro formuláře
    
    // Přepínání typů v editaci
    const editTypeSelect = document.getElementById('editCommandType');
    if (editTypeSelect) {
        editTypeSelect.addEventListener('change', (e) => {
            const isWol = e.target.value === 'wol';
            document.getElementById('editShellInputWrapper').classList.toggle('hidden', isWol);
            document.getElementById('editWolInputWrapper').classList.toggle('hidden', !isWol);
        });
    }

    // Odeslání editace
    if (window.editModal && window.editModal.form) {
        window.editModal.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(window.editModal.form);
            console.log("[API] Ukládám změny:", Object.fromEntries(formData));
            // Zde by byl fetch...
            window.editModal.close();
        });
    }

    // D) WebSocket Spojení
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