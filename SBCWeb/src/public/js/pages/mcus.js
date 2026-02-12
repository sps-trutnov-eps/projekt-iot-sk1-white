/* ============================================================
    1. SMAZÁNÍ MCU (deletemcu)
   ============================================================ */
const deleteMcuModal = Modal.register('deletemcu');

if (deleteMcuModal) {
    let mcuIdToDelete = null;

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.delete-mcu-btn');
        if (!btn) return;

        mcuIdToDelete = btn.dataset.id;

        if (!mcuIdToDelete) {
            window.openToastError && window.openToastError('Chybí ID MCU.');
            return;
        }

        deleteMcuModal.open(); 
        deleteMcuModal.hideError(); 
    });

    if (deleteMcuModal.submitBtn) {
        deleteMcuModal.submitBtn.addEventListener('click', async () => {
            if (!mcuIdToDelete) return;

            try {
                deleteMcuModal.submitBtn.disabled = true;
                
                const response = await fetch('/mcu/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: mcuIdToDelete }) 
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await window.refreshMCUs();
                    deleteMcuModal.close(); 
                } else {
                    deleteMcuModal.showError(data.message || 'Chyba při mazání.');
                }
            } catch (error) {
                deleteMcuModal.showError('Server neodpovídá.');
                console.error(error);
            } finally {
                deleteMcuModal.submitBtn.disabled = false;
            }
        });
    }
}

/* ============================================================
    2. SMAZÁNÍ TYPU (deletetype)
   ============================================================ */
const deleteTypeModal = Modal.register('deletetype');
let typeIdToDelete = null;

if (deleteTypeModal) {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.delete-type-btn');
        if (!btn) return;

        typeIdToDelete = btn.dataset.id;

        if (!typeIdToDelete) {
            window.openToastError && window.openToastError('Chybí ID Typu.');
            return;
        }

        deleteTypeModal.open(); 
        deleteTypeModal.hideError(); 
    });

    if (deleteTypeModal.submitBtn) {
        deleteTypeModal.submitBtn.addEventListener('click', async () => {
            if (!typeIdToDelete) return;

            try {
                deleteTypeModal.submitBtn.disabled = true;
                
                const response = await fetch('/type/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: typeIdToDelete }) 
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await window.refreshTypes();
                    deleteTypeModal.close();
                    typeModal.close();
                    if (toast && toastMsg) {
                    openToast(data.message);
                    }
                } else {
                    deleteTypeModal.showError(data.message || 'Chyba při mazání.');
                }
            } catch (error) {
                deleteTypeModal.showError('Server neodpovídá.');
                console.error(error);
            } finally {
                deleteTypeModal.submitBtn.disabled = false;
            }
        });
    }
}

/* ============================================================
    3. SPRÁVA TYPŮ (Přidávání)
   ============================================================ */
const typeModal = Modal.register('Type');

if (typeModal) {
    if (typeModal.openModal) {
        typeModal.openModal.addEventListener('click', () => {
            typeModal.open();
            typeModal.hideError();
        });
    }

    if (typeModal.submitBtn) {
        typeModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const formData = {
                type: document.getElementById('typeName').value,
            };

            try {
                typeModal.submitBtn.disabled = true;
                typeModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Přidávám...';
                
                const response = await fetch('/type/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await window.refreshTypes();
                    if (toast && toastMsg) {
                        openToast(data.message);
                    } else {
                        typeModal.showError("nebylo možné zobrazit alert");
                    }
                    typeModal.close();
                    
                    const result = await fetchData('/type/types');
                    if (result) {
                        populateSelector(result);
                    }
                } else {
                    typeModal.showError(data.message);
                }
            } catch (error) {
                console.error(error);
                typeModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                typeModal.submitBtn.disabled = false;
                typeModal.submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Type';
            }
        });
    }
}


/* ============================================================
    4. editace controllerů
   ============================================================ */
const editModal = Modal.register('editMCU');

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.edit-mcu-btn');
    if (!btn) return;

    const mcuIdToEdit = btn.dataset.id;
    
    try {
        const result = await fetchMcu(mcuIdToEdit);
        
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
        } else {
            console.error("Server vrátil success, ale chybí data 'mcu':", result);
            window.openToastError && window.openToastError('Data zařízení nebyla nalezena.');
        }
    } catch(error) {
        console.error("Chyba při otevírání modalu:", error);
    }
});

editModal.submitBtn.addEventListener("click", async () =>{
    if (editModal.form) {
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
        try {
            const response = await fetch('/mcu/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                if (window.openToast) window.openToast(result.message);
                if (window.refreshMCUs) await window.refreshMCUs();
                editModal.close();
            } else {
                editModal.showError(result.message || 'Chyba při ukládání.');
            }
        } catch (error) {
            console.error("Fetch error:", error);
            editModal.showError('Nelze navázat spojení se serverem.');
        } 
    });
}
})



/* ============================================================
    5. Sidebar
   ============================================================ */

/**
 * GLOBÁLNÍ STAV FILTRŮ
 * Ukládáme si, co má uživatel zrovna vybráno.
 */
window.currentFilters = {
    type: 'all',   // ID typu z DB nebo 'all'
    status: 'all'  // 'all', 'online', 'offline'
};

/**
 * 1. POUŽITÍ FILTRŮ (Apply Filters)
 * Prochází všechny karty a schovává ty, které nesplňují VŠECHNA kritéria.
 */
function applyFilters() {
    const cards = document.querySelectorAll('.mcu-card');
    
    cards.forEach(card => {
        // Data z karty (nastavená v renderMCUGrid)
        const typeId = card.dataset.type; 
        // Online stav poznáme podle přítomnosti zelené barvy indikátoru
        const isOnline = card.querySelector('.bg-green-400') !== null;

        // Logika "AND": Musí odpovídat typu I statusu
        const matchesType = window.currentFilters.type === 'all' || typeId === String(window.currentFilters.type);
        
        let matchesStatus = true;
        if (window.currentFilters.status === 'online') matchesStatus = isOnline;
        if (window.currentFilters.status === 'offline') matchesStatus = !isOnline;

        // Přidání/odebrání třídy hidden
        card.classList.toggle('hidden', !(matchesType && matchesStatus));
    });
}

/**
 * 2. REFRESH STATISTIK STATUSŮ (Online/Offline/Total)
 */
async function refreshSidebarStats() {
    try {
        const mcus = await fetchData('/mcu/mcus');
        if (!mcus || !Array.isArray(mcus)) return;

        const now = Date.now();
        const tenMinutesInMs = 10 * 60 * 1000;

        const stats = mcus.reduce((acc, mcu) => {
            const lastSeenDate = new Date(mcu.lastSeen + (mcu.lastSeen.includes('Z') ? '' : 'Z'));
            const diff = now - lastSeenDate.getTime();
            
            const isOnline = diff > 0 && diff < tenMinutesInMs;
            if (isOnline) acc.online++; else acc.offline++;
            return acc;
        }, { online: 0, offline: 0 });

        const elAll = document.getElementById('countAll');
        const elOnline = document.getElementById('countOnline');
        const elOffline = document.getElementById('countOffline');

        if (elAll) elAll.textContent = mcus.length;
        if (elOnline) elOnline.textContent = stats.online;
        if (elOffline) elOffline.textContent = stats.offline;
    } catch (err) {
        console.error("Chyba statistik statusů:", err);
    }
}

/**
 * 3. DYNAMICKÝ REFRESH TYPŮ V SIDEBARU
 */
async function refreshTypeStats() {
    const container = document.getElementById('dynamicTypeFilters');
    if (!container) return;

    try {
        const [types, mcus] = await Promise.all([
            fetchData('/type/types'),
            fetchData('/mcu/mcus')
        ]);

        if (!types || !mcus) return;

        const counts = mcus.reduce((acc, mcu) => {
            acc[mcu.type] = (acc[mcu.type] || 0) + 1;
            return acc;
        }, {});

        // Speciální řádek "Všechny typy"
        const isAllActive = window.currentFilters.type === 'all' ? 'bg-midnight-violet-800 text-white active' : '';
        let html = `
            <button class="type-filter w-full flex items-center justify-between px-1 py-1.5 rounded-lg text-ash-grey-400 hover:bg-midnight-violet-800 hover:text-white transition group ${isAllActive}" 
                data-type-id="all">
                <div class="flex items-center space-x-2.5 overflow-hidden flex-1">
                    <i class="fas fa-layer-group text-[10px] text-vintage-grape-400 group-hover:text-vintage-grape-300 flex-shrink-0"></i>
                    <span class="sidebar-text text-[14px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left font-medium">
                        Všechny typy
                    </span>
                </div>
                <span class="text-[12px] bg-midnight-violet-700 text-ash-grey-300 px-2 py-0.5 rounded-md min-w-[22px] text-center ml-4">
                    ${mcus.length}
                </span>
            </button>
        `;

        // Generování pouze aktivních typů (> 0)
        html += types
            .filter(t => (counts[t.id] || 0) > 0)
            .map(t => {
                const isActive = String(window.currentFilters.type) === String(t.id) ? 'bg-midnight-violet-800 text-white active' : '';
                return `
                    <button class="type-filter w-full flex items-center justify-between px-1 py-1.5 rounded-lg text-ash-grey-400 hover:bg-midnight-violet-800 hover:text-white transition group ${isActive}" 
                        data-type-id="${t.id}">
                        <div class="flex items-center space-x-2.5 overflow-hidden flex-1">
                            <i class="fas fa-microchip text-[10px] text-vintage-grape-400 group-hover:text-vintage-grape-300 flex-shrink-0"></i>
                            <span class="sidebar-text text-[14px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left">
                                ${t.type}
                            </span>
                        </div>
                        <span class="text-[12px] bg-midnight-violet-700 text-ash-grey-300 px-2 py-0.5 rounded-md min-w-[22px] text-center ml-4">
                            ${counts[t.id]}
                        </span>
                    </button>
                `;
            }).join('');

        container.innerHTML = html;
        attachFilterListeners();
    } catch (err) {
        console.error("Chyba generování typů:", err);
    }
}

/**
 * 4. PŘIPOJENÍ EVENT LISTENERŮ
 */
function attachFilterListeners() {
    // Sekce Typy (dynamická)
    document.querySelectorAll('.type-filter').forEach(btn => {
        btn.onclick = () => {
            window.currentFilters.type = btn.dataset.typeId;
            updateActiveUI(btn, '.type-filter');
            applyFilters();
        };
    });

    // Sekce Rychlé filtry (statická)
    document.querySelectorAll('.quick-filter').forEach(btn => {
        btn.onclick = () => {
            window.currentFilters.status = btn.dataset.filter;
            updateActiveUI(btn, '.quick-filter');
            applyFilters();
        };
    });
}

/**
 * 5. POMOCNÁ FUNKCE PRO STYLY
 */
function updateActiveUI(activeBtn, groupSelector) {
    document.querySelectorAll(groupSelector).forEach(b => 
        b.classList.remove('bg-midnight-violet-800', 'text-white', 'active')
    );
    activeBtn.classList.add('bg-midnight-violet-800', 'text-white', 'active');
}

/**
 * 6. HLAVNÍ REFRESH TLAČÍTKO
 */
const refreshAll = document.getElementById('refreshAll');
if (refreshAll) {
    refreshAll.addEventListener('click', async (e) => {
        e.preventDefault();
        const icon = refreshAll.querySelector('i');
        
        if (icon) icon.classList.add('fa-spin');
        refreshAll.classList.add('opacity-50', 'pointer-events-none');

        try {
            // Resetujeme filtry na výchozí stav při tvrdém refreshy (volitelné)
            // window.currentFilters = { type: 'all', status: 'all' };

            await Promise.all([
                window.refreshMCUs(),      // Načte grid
                window.refreshTypes(),     // Načte číselník typů (pokud máš)
                refreshSidebarStats(),     // Počty online/offline
                refreshTypeStats()         // Generování sidebaru a počty typů
            ]);
            
            refreshAll.classList.add('text-green-500');
            setTimeout(() => {
                refreshAll.classList.remove('text-green-500');
                // Po znovunačtení gridu aplikujeme aktuální filtry
                applyFilters();
            }, 500);
        } catch (error) {
            console.error("Chyba při hromadném refreshy:", error);
        } finally {
            if (icon) icon.classList.remove('fa-spin');
            refreshAll.classList.remove('opacity-50', 'pointer-events-none');
        }
    });
}

// Inicializace při startu
refreshSidebarStats();
refreshTypeStats();