/**
 * ============================================================
 * 1. GLOBÁLNÍ STAV A KONFIGURACE
 * ============================================================
 */
window.currentFilters = {
    type: 'all',   
    status: 'all', 
    search: ''
};

let dashboardSocket = null;
window.typeMap = {}; // Globální mapa typů pro rychlé názvy

/**
 * ============================================================
 * 2. REALTIME KOMUNIKACE (Socket.io)
 * ============================================================
 */
function initDashboardSockets() {
    if (!dashboardSocket) {
        dashboardSocket = io();

        dashboardSocket.on('connect', () => {
            console.log("[Sockets] Dashboard připojen.");
            dashboardSocket.emit('subscribe_all'); 
        });

        // Nasloucháme změnám stavu
        dashboardSocket.on('mcu_status', (payload) => {
            updateMcuCardStatus(payload.mcuId, payload.status, payload.lastSeen);
        });
    }
}

/**
 * ============================================================
 * 3. VYKRESLOVÁNÍ A UI (Karty a Sidebar)
 * ============================================================
 */

// A. Aktualizace jedné karty (Přes Socket)
function updateMcuCardStatus(mcuId, status, lastSeenStr) {
    const card = document.querySelector(`.mcu-card[data-id="${mcuId}"]`);
    if (!card) return;
    console.log(status);
    status = Number(status);

    let statusText = 'offline';
    if (status === 1) statusText = 'online';
    if (status === 2) statusText = 'frozen';
    card.dataset.status = statusText;

    const dot = card.querySelector('.status-dot');
    const timeSpan = card.querySelector('.last-seen-text');
    const clockIcon = card.querySelector('.fa-clock');

    // Barva tečky
    if (dot) {
        dot.className = 'status-dot absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ';
        if (status === 1) dot.className += 'bg-green-400 animate-pulse';
        else if (status === 2) dot.className += 'bg-yellow-400';
        else dot.className += 'bg-red-500';
    }

    // Čas a Ikonka
    let formattedTime = "";
    if (lastSeenStr) {
        let dbTime = typeof lastSeenStr === 'string' ? lastSeenStr.replace(' ', 'T') : lastSeenStr;
        if (typeof dbTime === 'string' && !dbTime.endsWith('Z')) dbTime += 'Z'; 
        const date = new Date(dbTime);
        if (!isNaN(date.getTime())) {
            const isToday = date.toDateString() === new Date().toDateString();
            formattedTime = isToday 
                ? date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) + ' ' + date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        }
    }

    // Vepsání textu
    if (timeSpan && clockIcon) {
        if (status === 1) {
            timeSpan.textContent = `Online`;
            timeSpan.className = "last-seen-text text-green-600 font-medium text-xs uppercase";
            clockIcon.className = "fas fa-clock text-silver-400 w-4";
        } else if (status === 2) {
            timeSpan.textContent = `Zamrzlé`;
            timeSpan.className = "last-seen-text text-yellow-600 font-semibold text-xs uppercase";
            clockIcon.className = "fas fa-clock text-yellow-500 w-4";
        } else {
            timeSpan.textContent = `${formattedTime || 'Nikdy'}`;
            timeSpan.className = "last-seen-text text-red-500 font-semibold text-xs uppercase";
            clockIcon.className = "fas fa-clock text-red-400 w-4";
        }
    }

    if (typeof window.applyFilters === 'function') window.applyFilters();
    if (typeof window.refreshSidebarStats === 'function') window.refreshSidebarStats();
}

// B. Vykreslení celého gridu (Při načtení stránky) - OPRAVENA LOGIKA STAVU!
function renderMCUGrid(mcusArray) {
    const grid = document.getElementById('mcuGrid');
    if (!grid) return;

    if (!mcusArray.length) {
        grid.innerHTML = '<div class="text-center text-silver-500 py-8">Žádné MCU nebyly nalezeny.</div>';
        return;
    }

    const now = new Date();

    grid.innerHTML = mcusArray.map(mcu => {
        const escape = (str) => String(str || '').replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m]));

        const typeName = window.typeMap && window.typeMap[mcu.type] ? window.typeMap[mcu.type] : mcu.type;

        // SPRÁVNÁ LOGIKA STAVU (0, 1, 2)
        const rawStatus = mcu.is_online !== undefined ? mcu.is_online : (mcu.isOnline || 0);
        const  status = Number(rawStatus);

        let datasetStatus = 'offline';
        if (status === 1) datasetStatus = 'online';
        if (status === 2) datasetStatus = 'frozen';

        // Zpracování času
        let formattedDateStr = '';
        if (mcu.lastSeen) {
            let dbTime = typeof mcu.lastSeen === 'string' ? mcu.lastSeen.replace(' ', 'T') : mcu.lastSeen;
            if (typeof dbTime === 'string' && !dbTime.endsWith('Z')) dbTime += 'Z';
            const date = new Date(dbTime);
            if (!isNaN(date.getTime())) {
                const isToday = date.toDateString() === now.toDateString();
                formattedDateStr = isToday 
                    ? date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) + ' ' + date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
            }
        }

        // Nastavení barev
        let timeColorClass = "text-red-500 font-semibold";
        let clockColor = "text-red-400";
        let statusColor = "bg-red-500";
        let pulseEffect = "";
        let lastSeenDisplay = formattedDateStr || "Nikdy";

        if (status === 1) {
            timeColorClass = "text-green-600 font-medium";
            clockColor = "text-silver-400";
            statusColor = "bg-green-400";
            pulseEffect = "animate-pulse";
            lastSeenDisplay = "Online";
        } else if (status === 2) {
            timeColorClass = "text-yellow-600 font-semibold";
            clockColor = "text-yellow-500";
            statusColor = "bg-yellow-400";
            lastSeenDisplay = "Zamrzlé";
        }

        return `
            <div class="mcu-card cursor-pointer bg-white rounded-lg shadow-sm border border-ash-grey-200 hover:shadow-md transition-shadow mb-4" 
                 data-id="${mcu.id}" 
                 data-status="${datasetStatus}"
                 data-type="${escape(mcu.type)}"> 
                <div class="flex items-center p-4">
                    <div class="flex items-center space-x-4">
                        <div class="relative">
                            <div class="w-12 h-12 bg-gradient-to-br from-midnight-violet-700 to-vintage-grape-600 rounded-xl flex items-center justify-center">
                                <i class="fas fa-microchip text-xl text-white"></i>
                            </div>
                            <span class="status-dot absolute -bottom-1 -right-1 w-4 h-4 ${statusColor} ${pulseEffect} border-2 border-white rounded-full"></span>
                        </div>
                        <div class="min-w-[140px]">
                            <h3 class="font-semibold text-midnight-violet-900">${escape(mcu.name)}</h3>
                            <span class="text-xs text-silver-500">${escape(typeName)}</span>
                        </div>
                    </div>
                    
                    <div class="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 mx-6 text-sm">
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-silver-500 font-semibold">IP:</span>
                            <span class="text-silver-700 font-mono">${escape(mcu.ipAddress || mcu.ip_address)}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-silver-500 font-semibold">MAC:</span>
                            <span class="text-silver-700 font-mono text-xs">${escape(mcu.macAddress || mcu.mac_address)}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-map-marker-alt text-silver-400 w-4"></i>
                            <span class="text-silver-700 truncate">${escape(mcu.location)}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-clock ${clockColor} w-4"></i>
                            <span class="last-seen-text ${timeColorClass} text-xs uppercase">${lastSeenDisplay}</span>
                        </div>
                    </div>

                    <div class="flex items-center space-x-2">
                        <button class="edit-mcu-btn w-9 h-9 text-silver-600 hover:bg-ash-grey-100 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Upravit">
                            <i class="fas fa-pen text-sm"></i>
                        </button>
                        <button class="delete-mcu-btn w-9 h-9 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Smazat">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (typeof window.applyFilters === 'function') window.applyFilters();
}

// C. Sidebar Statistiky - OPRAVENA LOGIKA STAVU!
window.refreshSidebarStats = async function() {
    try {
        const mcus = await fetchData('/mcu/mcus');
        if (!mcus || !Array.isArray(mcus)) return;

        const stats = mcus.reduce((acc, mcu) => {
            const rawStatus = mcu.is_online !== undefined ? mcu.is_online : (mcu.isOnline || 0);
            const status = Number(rawStatus);

            if (status === 1) acc.online++;
            else if (status === 2) acc.frozen++; 
            else acc.offline++;
            return acc;
        }, { online: 0, offline: 0, frozen: 0 });

        const elAll = document.getElementById('countAll');
        const elOnline = document.getElementById('countOnline');
        const elOffline = document.getElementById('countOffline');

        if (elAll) elAll.textContent = mcus.length;
        if (elOnline) elOnline.textContent = stats.online;
        // Zobrazíme jako offline ty, co jsou mrtvé nebo zamrzlé
        if (elOffline) elOffline.textContent = stats.offline + stats.frozen; 
    } catch (err) {
        console.error("Chyba statistik statusů:", err);
    }
}

// D. Filtry
window.applyFilters = function() {
    const cards = document.querySelectorAll('.mcu-card');
    const searchTerm = window.currentFilters.search.toLowerCase();
    
    cards.forEach(card => {
        const typeId = card.dataset.type;
        const statusText = card.dataset.status || 'offline'; 
        
        const nameElement = card.querySelector('h3');
        const ipElement = card.querySelector('.font-mono');
        
        const name = nameElement ? nameElement.textContent.toLowerCase() : '';
        const ip = ipElement ? ipElement.textContent.toLowerCase() : '';

        const matchesSearch = name.includes(searchTerm) || ip.includes(searchTerm);
        const matchesType = window.currentFilters.type === 'all' || typeId === String(window.currentFilters.type);

        let matchesStatus = true;
        if (window.currentFilters.status === 'online') matchesStatus = (statusText === 'online');
        if (window.currentFilters.status === 'offline') matchesStatus = (statusText === 'offline' || statusText === 'frozen');

        card.classList.toggle('hidden', !(matchesSearch && matchesType && matchesStatus));
    });
}

/**
 * ============================================================
 * 4. POMOCNÉ FUNKCE (Fetch, Modaly)
 * ============================================================
 */
async function fetchData(url) {
    try {
        const response = await fetch(url);
        const jsonData = await response.json();
        return jsonData.result || [];
    } catch (error) {
        console.error('Chyba fetch:', error);
        return null;
    }
}

async function fetchMcu(mcuId) {
    if (!mcuId) return null;
    try {
        const response = await fetch('/mcu/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mcuId })
        });
        if (!response.ok) throw new Error('Server vrátil chybu');
        return await response.json();
    } catch (error) {
        return null;
    }
}

window.refreshMCUs = async function() {
    const mcus = await fetchData('/mcu/mcus');
    console.log(mcus);
    if (mcus) renderMCUGrid(mcus);
};

// ... ZDE ZŮSTÁVAJÍ TVOJE PŮVODNÍ FUNKCE PRO TYPY (dedupeTypes, populateTypeList, populateSelector, refreshTypes atd.) ...
function dedupeTypes(typesArray) {
    const seen = new Set();
    return typesArray.filter(item => {
        const id = item.id ?? item._id ?? item.type ?? String(item);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

function populateTypeList(typesArray) {
    const container = document.getElementById('typeListContainer');
    if (!container) return;
    if (!typesArray || !typesArray.length) {
        container.innerHTML = `<div class="p-8 text-center text-silver-500">Zatím nebyly definovány žádné typy.</div>`;
        return;
    }
    const escape = (str) => String(str || '').replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m]));
    container.innerHTML = `<div class="divide-y divide-ash-grey-200 border border-ash-grey-200 rounded-lg bg-white overflow-hidden">
        ${typesArray.map(typeObj => `
            <div class="flex items-center justify-between p-4 hover:bg-ash-grey-50 transition-colors group">
                <span class="font-medium text-midnight-violet-900">${escape(typeObj.type)}</span>
                <button class="delete-type-btn w-8 h-8 flex items-center justify-center rounded-lg text-silver-400 hover:text-red-500 hover:bg-red-50" data-id="${typeObj.id}" title="Smazat typ"><i class="fas fa-trash-alt text-xs"></i></button>
            </div>
        `).join('')}</div>`;
}

function populateSelector(selecotrId, typesArray) {
    const selectElement = document.getElementById(selecotrId);
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="" disabled selected>Vyberte typ</option>';
    typesArray.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id ?? item._id ?? item.type ?? String(item);
        option.textContent = item.type ?? String(item);
        selectElement.appendChild(option);
    });
}

window.refreshTypes = async () => {
    const types = await fetchData('/type/types');
    populateTypeList(types);
    const dedupedTypes = dedupeTypes(types);
    populateSelector("TypeSelectorSearchBar",dedupedTypes);
    populateSelector("TypeSelectorMCUForm",dedupedTypes);
    
    // Uložení do globální mapy pro renderMCUGrid
    window.typeMap = {};
    if(types) types.forEach(t => window.typeMap[t.id] = t.type);
};

async function handleModalSubmit(modalObj, url, payload, onSuccessCallback) {
    try {
        modalObj.submitBtn.disabled = true;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (data.success) {
            if (onSuccessCallback) await onSuccessCallback();
            if (window.openToast) window.openToast(data.message || "Úspěch!", true);
            modalObj.close && modalObj.close();
        } else modalObj.showError(data.message || 'Chyba při zpracování.');
    } catch (error) { modalObj.showError('Server neodpovídá.'); } 
    finally { modalObj.submitBtn.disabled = false; }
}

/**
 * ============================================================
 * 5. MODALY (CRUD logika z tvého kódu)
 * ============================================================
 */
const deleteMcuModal = Modal.register('deletemcu');
if (deleteMcuModal && deleteMcuModal.submitBtn) {
    let mcuIdToDelete = null;
    document.addEventListener('click', e => {
        const btn = e.target.closest('.delete-mcu-btn');
        if (btn) { mcuIdToDelete = btn.dataset.id; deleteMcuModal.open(); deleteMcuModal.hideError(); }
    });
    deleteMcuModal.submitBtn.addEventListener('click', async () => {
        if (!mcuIdToDelete) return;
        await handleModalSubmit(deleteMcuModal, '/mcu/delete', { id: mcuIdToDelete }, async () => {
            if (window.refreshMCUs) await window.refreshMCUs();
            window.refreshSidebarStats();
            if (window.refreshTypeStats) window.refreshTypeStats();
        });
    });
}

const editModal = Modal.register('editMCU');
if (editModal && editModal.form) {
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.edit-mcu-btn');
        if (!btn) return;
        const result = await fetchMcu(btn.dataset.id);
        if (result && result.success && result.mcu) {
            const mcu = result.mcu;
            document.getElementById('editMcuId').value = mcu.id || mcu.device_id || '';
            document.getElementById('editMcuName').value = mcu.name || '';
            const typeSelect = document.getElementById('editTypeSelector');
            if (typeSelect) typeSelect.value = mcu.type || '';
            document.getElementById('editMcuLocation').value = mcu.location || '';
            document.getElementById('editMcuIP').value = mcu.ipAddress || mcu.ip_address || '';
            document.getElementById('editMcuMAC').value = mcu.macAddress || mcu.mac_address || '';
            document.getElementById('editMcuDescription').value = mcu.description || '';
            editModal.open();
        }
    });

    editModal.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            id: document.getElementById('editMcuId').value,
            name: document.getElementById('editMcuName').value,
            type: parseInt(document.getElementById('editTypeSelector').value), 
            location: document.getElementById('editMcuLocation').value,
            ipAddress: document.getElementById('editMcuIP').value,
            macAddress: document.getElementById('editMcuMAC').value,
            description: document.getElementById('editMcuDescription').value
        };
        await handleModalSubmit(editModal, '/mcu/update', formData, async () => {
            if (window.refreshMCUs) await window.refreshMCUs();
        });
    });
}

const typeModal = Modal.register('Type');
if (typeModal && typeModal.submitBtn) {
    if (typeModal.openModal) { typeModal.openModal.addEventListener('click', () => { typeModal.open(); typeModal.hideError(); }); }
    typeModal.submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const formData = { type: document.getElementById('typeName').value };
        await handleModalSubmit(typeModal, '/type/add', formData, async () => {
            await window.refreshTypes();
            typeModal.clear();
        });
    });
}

const deleteTypeModal = Modal.register('deletetype');
if (deleteTypeModal && deleteTypeModal.submitBtn) {
    let typeIdToDelete = null;
    document.addEventListener('click', e => {
        const btn = e.target.closest('.delete-type-btn');
        if (btn) { typeIdToDelete = btn.dataset.id; deleteTypeModal.open(); deleteTypeModal.hideError(); }
    });
    deleteTypeModal.submitBtn.addEventListener('click', async () => {
        if (!typeIdToDelete) return;
        await handleModalSubmit(deleteTypeModal, '/type/delete', { id: typeIdToDelete }, async () => {
            await window.refreshTypes();
        });
    });
}

/**
 * ============================================================
 * 6. INICIALIZACE A BOOTSTRAP STRÁNKY
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Nejdřív načteme typy, aby se vytvořila globální mapa (potřebuje to Grid)
    await window.refreshTypes();
    
    // Potom načteme a vykreslíme MCU
    if (window.refreshMCUs) await window.refreshMCUs();
    
    window.refreshSidebarStats();
    if (typeof window.refreshTypeStats === 'function') window.refreshTypeStats();
    
    // Searchbar
    const searchInput = document.getElementById('searchMCU');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            window.currentFilters.search = e.target.value;
            window.applyFilters();
        });
    }

    // Refresh všeho tlačítko
    const refreshAll = document.getElementById('refreshAll');
    if (refreshAll) {
        refreshAll.addEventListener('click', async (e) => {
            e.preventDefault();
            const icon = refreshAll.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            refreshAll.classList.add('opacity-50', 'pointer-events-none');
            try {
                await Promise.all([
                    window.refreshMCUs(),      
                    window.refreshTypes(),     
                    window.refreshSidebarStats(),     
                    window.refreshTypeStats ? window.refreshTypeStats() : Promise.resolve()        
                ]);
            } finally {
                if (icon) icon.classList.remove('fa-spin');
                refreshAll.classList.remove('opacity-50', 'pointer-events-none');
            }
        });
    }

    // Proklik karty
    const gridElement = document.getElementById('mcuGrid');
    if (gridElement) {
        gridElement.addEventListener('click', (e) => {
            const card = e.target.closest('.mcu-card');
            if (!card || e.target.closest('button')) return;
            window.location.href = `/mcu/${card.dataset.id}`;
        });
    }

    // Až nakonec oživíme sockety
    initDashboardSockets();
});