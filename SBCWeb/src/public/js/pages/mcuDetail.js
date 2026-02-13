// 1. Registrace Modalu (musí odpovídat ID v HTML: sensorModal, sensorForm...)
// V HTML jsme použili malá písmena 'sensor', takže zde také 'sensor'
const sensorModal = Modal.register('sensor');

// Elementy pro manipulaci s dynamickým obsahem
const metricsContainer = document.getElementById('metricsContainer');
const emptyState = document.getElementById('emptyMetricsState');

if (sensorModal) {
    
    // --- OTEVŘENÍ MODALU ---
    if (sensorModal.openModal) {
        sensorModal.openModal.addEventListener('click', () => {
            sensorModal.open();
            sensorModal.hideError();
            
            // Volitelné: Pokud chceme při otevření rovnou přidat jeden prázdný řádek, pokud tam nic není
            if (metricsContainer && metricsContainer.children.length === 0) {
                // Předpokládá existenci funkce addMetricRow z předchozího kroku
                if (typeof addMetricRow === 'function') {
                    addMetricRow(); 
                }
            }
        });
    }

    // --- ODESLÁNÍ FORMULÁŘE ---
    if (sensorModal.submitBtn) {
        sensorModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Zabráníme standardnímu submitu formuláře

            // 1. Získání dat
            const nameInput = document.getElementById('sensorNameInput');
            const metricSelects = document.querySelectorAll('select[name="metricType[]"]');
            const metricUnits = document.querySelectorAll('input[name="metricUnit[]"]');

            // 2. Validace na klientovi
            if (!nameInput.value.trim()) {
                sensorModal.showError("Prosím vyplňte název senzoru.");
                return;
            }

            if (metricSelects.length === 0) {
                sensorModal.showError("Musíte přidat alespoň jednu měřenou veličinu.");
                return;
            }

            // 3. Sestavení objektu pro odeslání
            const metrics = [];
            metricSelects.forEach((select, index) => {
                metrics.push({
                    type: select.value,
                    unit: metricUnits[index].value || '' // Ošetření prázdné jednotky
                });
            });

            const formData = {
                name: nameInput.value,
                metrics: metrics
            };

            // 4. Komunikace se serverem
            try {
                // UI Loading stav
                const originalBtnText = sensorModal.submitBtn.innerHTML;
                sensorModal.submitBtn.disabled = true;
                sensorModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
                
                // Změňte URL endpointu podle vaší API struktury
                const response = await fetch('/sensor/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // A) Úspěch
                    
                    // Toast notifikace (pokud používáte globální funkci)
                    if (window.openToast) {
                        window.openToast("Senzor byl úspěšně přidán!", true);
                    }

                    // Zavřít a vyčistit modal
                    sensorModal.close(); 
                    
                    // Důležité: Vyčistit i dynamické řádky (Modal.close maže jen inputy)
                    if (metricsContainer) metricsContainer.innerHTML = '';
                    if (emptyState) emptyState.classList.remove('hidden');

                    // Refresh seznamu senzorů (pokud existuje funkce)
                    if (window.refreshSensors) {
                        await window.refreshSensors();
                    } else {
                        // Fallback refresh stránky
                        // location.reload(); 
                    }

                } else {
                    // B) Chyba vrácená serverem
                    sensorModal.showError(data.message || "Nepodařilo se uložit senzor.");
                }

            } catch (error) {
                // C) Chyba sítě / kódu
                console.error("Chyba při ukládání senzoru:", error);
                sensorModal.showError("Chyba při komunikaci se serverem.");
                
            } finally {
                // Reset tlačítka
                sensorModal.submitBtn.disabled = false;
                sensorModal.submitBtn.innerHTML = 'Uložit senzor';
            }
        });
    }

    // --- LOGIKA ZRUŠENÍ / ZAVŘENÍ (Úklid dynamických řádků) ---
    // Protože Modal.js při close() volá jen form.reset(), musíme ručně vymazat přidané řádky
    const cleanupDynamicRows = () => {
        if (metricsContainer) metricsContainer.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
    };

    if (sensorModal.closeBtn) sensorModal.closeBtn.addEventListener('click', cleanupDynamicRows);
    if (sensorModal.cancelBtn) sensorModal.cancelBtn.addEventListener('click', cleanupDynamicRows);
}