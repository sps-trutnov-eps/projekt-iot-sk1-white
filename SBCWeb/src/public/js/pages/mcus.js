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

const refreshAll = document.getElementById('refreshAll');

refreshAll.addEventListener('click', (e) => {
    e.preventDefault();
    window.refreshMCUs();
    window.refreshTypes();
});

async function getMcuStats() {
    try {
        const mcus = await fetchData('/mcu/mcus');
        if (!mcus || !Array.isArray(mcus)) return { online: 0, offline: 0, total: 0 };

        // Získáme aktuální čas v milisekundách (vždy UTC)
        const now = Date.now(); 
        const tenMinutesInMs = 10 * 60 * 1000;

        let onlineCount = 0;
        let offlineCount = 0;

        mcus.forEach(mcu => {

            const lastSeenDate = new Date(mcu.lastSeen + (mcu.lastSeen.includes('Z') ? '' : 'Z'));
            const lastSeenTime = lastSeenDate.getTime();

            const timeDifference = now - lastSeenTime;



            if (timeDifference > 0 && timeDifference < tenMinutesInMs) {
                onlineCount++;
            } else {
                offlineCount++;
            }
        });

        return {
            online: onlineCount,
            offline: offlineCount,
            total: mcus.length
        };

    } catch (error) {
        console.error("Chyba při výpočtu statistik:", error);
        return { online: 0, offline: 0, total: 0 };
    }
}

