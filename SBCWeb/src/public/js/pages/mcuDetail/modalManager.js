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
    // Registrace všech modalů
    const sensorModal = window.Modal?.register('sensor');
    const metricModal = window.Modal?.register('metric');
    const deleteSensorModal = window.Modal?.register('deleteSensor');
    const thresholdModal = window.Modal?.register('threshold');

    // --- LOGIKA PRO SENZOR MODAL ---
    if (sensorModal) {
        if (sensorModal.openModal) {
            sensorModal.openModal.addEventListener('click', () => {
                tempMetrics = [];
                renderMetricsList();
                sensorModal.open();
                sensorModal.hideError();
                document.getElementById('sensorNameInput').value = '';
            });
        }

        if (sensorModal.submitBtn) {
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
    }

    // --- LOGIKA PRO METRIC MODAL ---
    if (metricModal) {
        if (metricModal.openModal) {
            metricModal.openModal.addEventListener('click', (e) => {
                e.preventDefault();
                metricModal.open();
                metricModal.hideError();
                metricModal.clear();
            });
        }

        if (metricModal.submitBtn) {
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
    }

    // --- LOGIKA PRO DELETE SENSOR ---
    if (deleteSensorModal && deleteSensorModal.submitBtn) {
        deleteSensorModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Tady si přečteme ID z value inputu
            const sensorId = document.getElementById('deleteSensorIdInput').value;
            
            if (!sensorId) {
                return deleteSensorModal.showError("Nebylo nalezeno ID senzoru.");
            }

            try {
                deleteSensorModal.submitBtn.disabled = true;
                deleteSensorModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Mažu...';

                // API volání pro smazání
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

    // --- LOGIKA PRO THRESHOLDS ---
    if (thresholdModal && thresholdModal.submitBtn) {
        thresholdModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Přečtení channel ID z value
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
}


// ==========================================
// GLOBÁLNÍ FUNKCE PRO OTEVÍRÁNÍ MODALŮ
// ==========================================

// 1. Nastavení limitů
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

// 2. Mazání senzoru
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