import { getMcuId, translateType } from './utils.js';

let tempMetrics = [];

function renderMetricsList() {
    const container = document.getElementById('metricsContainer');
    const emptyState = document.getElementById('emptyMetricsState');
    if (!container) return;

    container.innerHTML = '';
    if (tempMetrics.length === 0) emptyState?.classList.remove('hidden');
    else emptyState?.classList.add('hidden');

    tempMetrics.forEach((metric, index) => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-ash-grey-50 p-2 rounded border border-ash-grey-200 text-sm";
        div.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold text-midnight-violet-900">${metric.name}</span>
                <span class="text-xs text-silver-500 bg-white px-1.5 py-0.5 rounded border border-ash-grey-200">${metric.unit}</span>
                <span class="text-[10px] text-silver-400 uppercase tracking-wide ml-2">${translateType(metric.type)}</span>
            </div>
            <button type="button" onclick="removeMetric(${index})" class="text-red-400 hover:text-red-600 transition-colors px-2">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

export function removeMetric(index) {
    tempMetrics.splice(index, 1);
    renderMetricsList();
}

export function initModals() {
    const sensorModal = window.Modal?.register('sensor');
    const metricModal = window.Modal?.register('metric');
    const deleteSensorModal = window.Modal?.register('deleteSensor');
    const thresholdModal = window.Modal?.register('threshold');
    const addChannelModal = window.Modal?.register('addChannel');
    const deleteChannelModal = window.Modal?.register('deleteChannel');
    
    // Zaregistrujeme i tvůj Edit modal z té druhé stránky!
    const editMCUModal = window.Modal?.register('editMCU');

    // --- SENSOR MODAL ---
    if (sensorModal && sensorModal.openModal) {
        sensorModal.openModal.addEventListener('click', () => {
            tempMetrics = [];
            renderMetricsList();
            sensorModal.open();
            sensorModal.hideError();
            document.getElementById('sensorNameInput').value = '';
        });
    }

    if (sensorModal && sensorModal.submitBtn) {
        sensorModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const sensorName = document.getElementById('sensorNameInput').value;
            if (!sensorName) return sensorModal.showError("Vyplňte název senzoru.");
            if (tempMetrics.length === 0) return sensorModal.showError("Přidejte alespoň jednu veličinu.");

            const formData = { deviceId: getMcuId(), model: sensorName, channels: tempMetrics };

            try {
                sensorModal.submitBtn.disabled = true;
                sensorModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
                
                const response = await fetch('/sensor/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                
                if (response.ok) {
                    if(window.openToast) window.openToast(data.message || "Senzor přidán", true);
                    sensorModal.close();
                    if(window.updateView) window.updateView(false); 
                } else {
                    sensorModal.showError(data.error || "Chyba při ukládání.");
                }
            } catch (error) {
                sensorModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                sensorModal.submitBtn.disabled = false;
                sensorModal.submitBtn.innerHTML = 'Uložit senzor';
            }
        });
    }

    // --- METRIC MODAL ---
    if (metricModal && metricModal.openModal) {
        metricModal.openModal.addEventListener('click', (e) => {
            e.preventDefault();
            metricModal.open();
            metricModal.hideError();
            metricModal.clear();
        });
    }

    if (metricModal && metricModal.submitBtn) {
        metricModal.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const nameVal = document.getElementById('metricNameInput').value;
            const typeVal = document.getElementById('metricTypeInput').value;
            const unitVal = document.getElementById('metricUnitInput').value;

            if (!nameVal || !unitVal) return metricModal.showError("Vyplňte název a jednotku.");
            tempMetrics.push({ name: nameVal, type: typeVal, unit: unitVal });
            renderMetricsList();
            metricModal.close();
        });
    }

    // --- DELETE SENSOR MODAL ---
    if (deleteSensorModal && deleteSensorModal.submitBtn) {
        deleteSensorModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const sensorId = document.getElementById('deleteSensorIdInput').value;
            
            if (!sensorId) {
                return deleteSensorModal.showError("Nebylo nalezeno ID senzoru.");
            }

            try {
                deleteSensorModal.submitBtn.disabled = true;
                deleteSensorModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Mažu...';

                const response = await fetch(`/sensor/${sensorId}`, { method: 'DELETE' });
                const data = await response.json();

                if (response.ok && data.success !== false) {
                    if (window.openToast) window.openToast("Senzor byl úspěšně odstraněn", true);
                    deleteSensorModal.close();
                    if (window.updateView) window.updateView(false);
                } else {
                    deleteSensorModal.showError(data.message || data.error || "Chyba při mazání senzoru.");
                }
            } catch (error) {
                deleteSensorModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                deleteSensorModal.submitBtn.disabled = false;
                deleteSensorModal.submitBtn.innerHTML = 'Smazat senzor';
            }
        });
    }

    // --- THRESHOLD MODAL ---
    if (thresholdModal && thresholdModal.submitBtn) {
        thresholdModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const channelId = document.getElementById('thresholdChannelIdInput').value;
            const minInput = document.getElementById('thresholdMinInput').value;
            const maxInput = document.getElementById('thresholdMaxInput').value;

            if (!channelId) {
                return thresholdModal.showError("Chyba: Neznámý kanál.");
            }

            const formData = {
                channelId: channelId,
                min_value: minInput !== "" ? parseFloat(minInput) : null,
                max_value: maxInput !== "" ? parseFloat(maxInput) : null
            };

            try {
                thresholdModal.submitBtn.disabled = true;
                thresholdModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Ukládám...';

                const response = await fetch('/sensor/threshold', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();

                if (response.ok) {
                    if (window.openToast) window.openToast(data.message || "Limity byly uloženy", true);
                    thresholdModal.close(); 
                } else {
                    thresholdModal.showError(data.error || data.message || "Chyba při ukládání limitů.");
                }
            } catch (error) {
                thresholdModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                thresholdModal.submitBtn.disabled = false;
                thresholdModal.submitBtn.innerHTML = 'Uložit limity';
            }
        });
    }

    // --- ADD CHANNEL MODAL ---
    if (addChannelModal && addChannelModal.submitBtn) {
        addChannelModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const sensorId = document.getElementById('addChannelSensorIdInput').value;
            const typeVal = document.getElementById('addChannelTypeInput').value;
            const unitVal = document.getElementById('addChannelUnitInput').value;

            if (!sensorId) return addChannelModal.showError("Nebylo nalezeno ID senzoru.");
            if (!typeVal || !unitVal) return addChannelModal.showError("Vyplňte typ a jednotku.");

            const formData = {
                type: typeVal,
                unit: unitVal
            };

            try {
                addChannelModal.submitBtn.disabled = true;
                addChannelModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Ukládám...';

                const response = await fetch(`/sensor/${sensorId}/channels`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();

                if (response.ok) {
                    if (window.openToast) window.openToast(data.message || "Kanál byl přidán", true);
                    addChannelModal.close();
                    if (window.updateView) window.updateView(false);
                } else {
                    addChannelModal.showError(data.error || data.message || "Chyba při ukládání kanálu.");
                }
            } catch (error) {
                addChannelModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                addChannelModal.submitBtn.disabled = false;
                addChannelModal.submitBtn.innerHTML = 'Přidat kanál';
            }
        });
    }

    // --- DELETE CHANNEL MODAL ---
    if (deleteChannelModal && deleteChannelModal.submitBtn) {
        deleteChannelModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const channelId = document.getElementById('deleteChannelIdInput').value;
            
            if (!channelId) {
                return deleteChannelModal.showError("Nebylo nalezeno ID kanálu.");
            }

            try {
                deleteChannelModal.submitBtn.disabled = true;
                deleteChannelModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Mažu...';

                const response = await fetch(`/sensor/channel/${channelId}`, { method: 'DELETE' });
                const data = await response.json();

                if (response.ok && data.success !== false) {
                    if (window.openToast) window.openToast("Kanál byl úspěšně odstraněn", true);
                    deleteChannelModal.close();
                    if (window.updateView) window.updateView(false);
                } else {
                    deleteChannelModal.showError(data.message || data.error || "Chyba při mazání kanálu.");
                }
            } catch (error) {
                deleteChannelModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                deleteChannelModal.submitBtn.disabled = false;
                deleteChannelModal.submitBtn.innerHTML = 'Smazat kanál';
            }
        });
    }

    // --- LOGIKA PRO EDIT MCU MODAL ---
    // Tohle je upravená verze toho, co jsi mi poslal.
    if (editMCUModal && editMCUModal.submitBtn) {
        editMCUModal.submitBtn.addEventListener('click', async (e) => {
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
                editMCUModal.submitBtn.disabled = true;
                editMCUModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Ukládám...';

                const response = await fetch('/mcu/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    if (window.openToast) window.openToast(result.message, true);
                    editMCUModal.close();
                    
                    // Po editaci načteme znovu aktuální info do hlavičky (funkce v main.js)
                    if (window.updateView) await window.updateView(false); 
                } else {
                    editMCUModal.showError(result.message || 'Chyba při ukládání.');
                }
            } catch (error) {
                console.error("Fetch error:", error);
                editMCUModal.showError('Nelze navázat spojení se serverem.');
            } finally {
                editMCUModal.submitBtn.disabled = false;
                editMCUModal.submitBtn.innerHTML = '<i class="fas fa-save"></i> Update MCU';
            }
        });
    }
}


// ==========================================
// GLOBÁLNÍ FUNKCE PRO OTEVÍRÁNÍ MODALŮ
// ==========================================

window.openThresholdModal = function(channelId, label) {
    const modal = window.Modal?.register('threshold');
    if (!modal) return;

    const channelInput = document.getElementById('thresholdChannelIdInput');
    const labelElement = document.getElementById('thresholdTargetLabel');

    if (channelInput) channelInput.value = channelId;
    if (labelElement) labelElement.textContent = label;

    modal.hideError();
    modal.open();
};

window.openDeleteSensorModal = function(sensorId) {
    const modal = window.Modal?.register('deleteSensor');
    if (!modal) return;

    const idInput = document.getElementById('deleteSensorIdInput');
    if (idInput) {
        idInput.value = sensorId;
    }

    modal.hideError();
    modal.open();
};

window.openAddChannelModal = function(sensorId, sensorModel) {
    const modal = window.Modal?.register('addChannel');
    if (!modal) return;

    const sensorIdInput = document.getElementById('addChannelSensorIdInput');
    const labelElement = document.getElementById('addChannelSensorModelLabel');

    if (sensorIdInput) sensorIdInput.value = sensorId;
    if (labelElement) labelElement.textContent = sensorModel;

    modal.clear();
    modal.hideError();
    modal.open();
};

window.openDeleteChannelModal = function(channelId) {
    const modal = window.Modal?.register('deleteChannel');
    if (!modal) return;

    const idInput = document.getElementById('deleteChannelIdInput');
    if (idInput) {
        idInput.value = channelId;
    }

    modal.hideError();
    modal.open();
};

// Funkce pro otevření Editace MCU. Zjistí aktuální ID a načte pro něj data!
// Funkce pro otevření Editace MCU. Zjistí aktuální ID a načte pro něj data!
window.openEditMCUModal = async function() {
    const modal = window.Modal?.register('editMCU');
    if (!modal) return;

    // Zjistíme ID
    const mcuId = getMcuId(); 
    if (!mcuId) return;

    try {
        // 1. STAŽENÍ DAT O MCU
        const response = await fetch('/mcu/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mcuId })
        }); 
        const result = await response.json();
        
        // 2. STAŽENÍ TYPŮ PRO SELECTBOX
        let types = [];
        try {
            const typesResponse = await fetch('/type/types'); 
            if (typesResponse.ok) {
                const typesData = await typesResponse.json();
                // OPRAVA: Tvůj backend vrací data v "result" (jak bylo ve fetchData)
                types = typesData.result || typesData.types || (Array.isArray(typesData) ? typesData : []);
            }
        } catch (e) {
            console.warn("Nepodařilo se načíst seznam typů:", e);
        }
        
        const mcu = result.mcu;

        // 3. PŘEDVYPLNĚNÍ FORMULÁŘE
        if (response.ok && mcu) {
            
            document.getElementById('editMcuId').value = mcu.id || mcu.device_id || '';
            document.getElementById('editMcuName').value = mcu.name || '';
            
            // OPRAVA: Naplnění Select boxu s typy (stejná logika jako tvůj populateSelector)
            const typeSelect = document.getElementById('editTypeSelector');
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">-- Vyberte typ --</option>'; 
                
                if (Array.isArray(types)) {
                    const seen = new Set();
                    types.forEach(item => {
                        // Ošetření různých formátů ID (id, _id, type)
                        const id = String(item.id ?? item._id ?? item.type ?? item);
                        if (seen.has(id)) return; // Deduplikace
                        seen.add(id);

                        const text = item.type ?? String(item);
                        const isSelected = id === String(mcu.type || mcu.type_id) ? 'selected' : '';
                        
                        typeSelect.innerHTML += `<option value="${id}" ${isSelected}>${text}</option>`;
                    });
                }
            }

            document.getElementById('editMcuLocation').value = mcu.location || '';
            document.getElementById('editMcuIP').value = mcu.ipAddress || mcu.ip_address || '';
            document.getElementById('editMcuMAC').value = mcu.macAddress || mcu.mac_address || '';
            document.getElementById('editMcuDescription').value = mcu.description || '';

            try { modal.hideError(); } catch (e) {}
            modal.open();
        } else {
            if (window.openToast) window.openToast('Data zařízení nebyla nalezena.', false);
        }
    } catch(error) {
        console.error("Chyba při otevírání modalu pro editaci:", error);
        if (window.openToast) window.openToast('Chyba komunikace se serverem.', false);
    }
};