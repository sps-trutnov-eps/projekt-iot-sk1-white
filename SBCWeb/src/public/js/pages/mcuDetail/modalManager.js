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

// Upravená část tvého initModals v souboru modalManager.js
export function initModals() {
    const sensorModal = window.Modal?.register('sensor');
    const metricModal = window.Modal?.register('metric');
    // REGISTRACE NOVÉHO MODALU
    const thresholdModal = window.Modal?.register('threshold');

    // ... tvůj stávající kód pro sensorModal a metricModal ...

    if (thresholdModal) {
        thresholdModal.submitBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const channelId = document.getElementById('thresholdChannelIdInput').value;
            const minValue = document.getElementById('thresholdMinInput').value;
            const maxValue = document.getElementById('thresholdMaxInput').value;

            const formData = {
                channelId: channelId,
                minValue: minValue === '' ? null : parseFloat(minValue),
                maxValue: maxValue === '' ? null : parseFloat(maxValue)
            };

            try {
                thresholdModal.submitBtn.disabled = true;
                thresholdModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';

                const response = await fetch('/sensor/threshold', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    window.openToast(data.message || "Limity uloženy", true);
                    thresholdModal.close();
                } else {
                    thresholdModal.showError(data.error || "Chyba při ukládání limitů.");
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

// GLOBÁLNÍ FUNKCE PRO OTEVŘENÍ (volaná z tlačítka na kartě senzoru)
window.openThresholdModal = async function(channelId, label) {
    const modal = window.Modal.register('threshold'); // Získáme referenci přes tvůj systém
    if (!modal) return;

    modal.open();
    modal.hideError();
    modal.clear();

    // Nastavení základních info
    document.getElementById('thresholdChannelIdInput').value = channelId;
    document.getElementById('thresholdTargetLabel').textContent = label;

    // VOLITELNÉ: Načtení stávajících limitů z DB, aby uživatel viděl, co tam má
    try {
        const response = await fetch(`/sensor/threshold/${channelId}`);
        const data = await response.json();
        if (data.success && data.threshold) {
            document.getElementById('thresholdMinInput').value = data.threshold.min_value ?? '';
            document.getElementById('thresholdMaxInput').value = data.threshold.max_value ?? '';
        }
    } catch (e) {
        console.warn("Nepodařilo se načíst stávající limity.");
    }
};