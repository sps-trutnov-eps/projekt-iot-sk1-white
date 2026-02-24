// pages/mcus/modalManager.js
import { applyFilters, refreshSidebarStats, refreshTypeStats } from './filterManager.js';
import { fetchData, fetchMcu, refreshMCUs, refreshTypes, populateSelector, dedupeTypes } from '../../common/loadDataMCUs.js';

export function initModals() {
    initDeleteMcuModal();
    initDeleteTypeModal();
    initAddTypeModal();
    initEditMcuModal();
}

function initDeleteMcuModal() {
    const deleteMcuModal = window.Modal?.register('deletemcu');
    if (!deleteMcuModal) return;

    let mcuIdToDelete = null;

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.delete-mcu-btn');
        if (!btn) return;

        mcuIdToDelete = btn.dataset.id;
        if (!mcuIdToDelete) {
            window.openToast && window.openToast('Chybí ID MCU.', false);
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
                    await refreshMCUs();
                    refreshSidebarStats();
                    refreshTypeStats();
                    applyFilters();
                    
                    window.openToast?.("Zařízení bylo úspěšně smazáno!", true);
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

function initDeleteTypeModal() {
    const deleteTypeModal = window.Modal?.register('deletetype');
    if (!deleteTypeModal) return;

    let typeIdToDelete = null;

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.delete-type-btn');
        if (!btn) return;

        typeIdToDelete = btn.dataset.id;
        if (!typeIdToDelete) {
            window.openToast && window.openToast('Chybí ID Typu.', false);
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
                    await refreshTypes();
                    deleteTypeModal.close();
                    window.openToast?.(data.message, true);
                } else {
                    window.openToast?.(data.message, false);
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

function initAddTypeModal() {
    const typeModal = window.Modal?.register('Type');
    if (!typeModal) return;

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
                    await refreshTypes();
                    window.openToast?.("Typ byl úspěšně přidán!", true);
                    typeModal.clear();
                    
                    const result = await fetchData('/type/types');
                    if (result) {
                        const dedupedTypes = dedupeTypes(result);
                        populateSelector("TypeSelectorSearchBar", dedupedTypes);
                        populateSelector("TypeSelectorMCUForm", dedupedTypes);
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

function initEditMcuModal() {
    const editModal = window.Modal?.register('editMCU');
    if (!editModal) return;

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
                window.openToast?.('Data zařízení nebyla nalezena.', false);
            }
        } catch(error) {
            console.error("Chyba při otevírání modalu:", error);
        }
    });

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
                editModal.submitBtn.disabled = true;

                const response = await fetch('/mcu/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    window.openToast?.(result.message, true);
                    await refreshMCUs();
                    editModal.close();
                } else {
                    editModal.showError(result.message || 'Chyba při ukládání.');
                }
            } catch (error) {
                console.error("Fetch error:", error);
                editModal.showError('Nelze navázat spojení se serverem.');
            } finally {
                editModal.submitBtn.disabled = false;
            }
        });
    }
}