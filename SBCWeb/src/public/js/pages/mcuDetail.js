/* ---------------------------------------------------------
   GLOBÁLNÍ PROMĚNNÉ
   --------------------------------------------------------- */
// Zde budeme dočasně držet metriky před tím, než se odešlou na server
let tempMetrics = []; 


/* ---------------------------------------------------------
    Vyplnění mcu dat
    --------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. ZÍSKÁNÍ ID Z URL
    const mcuId = window.location.pathname.split('/').pop();

    // 2. KONTROLA TOASTU PO RELOADU (pokud jsme uložili zprávu do session)
    const toastMsg = sessionStorage.getItem('toastMessage');
    const toastSuccess = sessionStorage.getItem('toastSuccess');
    
    if (toastMsg && window.openToast) {
        window.openToast(toastMsg, toastSuccess === 'true');
        // Vyčistíme, aby se neukazoval znovu
        sessionStorage.removeItem('toastMessage');
        sessionStorage.removeItem('toastSuccess');
    }
    
    // 3. NAČTENÍ DAT O MCU
    try {
        const response = await fetch('/mcu/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mcuId })
        });

        const data = await response.json();

        if (data.success && data.mcu) {
            const mcu = data.mcu;

            // A) Základní info
            const nameEl = document.getElementById('mcu-name');
            const ipEl = document.getElementById('mcu-ip');
            const macEl = document.getElementById('mcu-mac');
            
            if(nameEl) nameEl.textContent = mcu.name;
            if(ipEl) ipEl.textContent = mcu.ipAddress || '---';
            if(macEl) macEl.textContent = mcu.macAddress || '---';

            // B) Parsování času z DB (očekává YYYY-MM-DD HH:mm:ss)
            if (mcu.lastSeen) {
                const parts = mcu.lastSeen.split(/[- :]/);
                // JS měsíce jsou 0-11, proto parts[1]-1
                const lastSeenDate = new Date(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]);
                
                // Korekce +1 hodina (podle tvého původního kódu)
                lastSeenDate.setHours(lastSeenDate.getHours() + 1);
                
                const now = new Date();
                const diffMinutes = Math.floor((now - lastSeenDate) / 1000 / 60);

                // C) Formátování textu času (Dnes / Datum)
                const isToday = now.toDateString() === lastSeenDate.toDateString();
                const timeString = isToday 
                    ? lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                    : lastSeenDate.toLocaleDateString('cs-CZ') + " " + lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

                const lsEl = document.getElementById('mcu-lastseen');
                if(lsEl) lsEl.textContent = timeString;

                // D) Statusy (Online = rozdíl < 70 minut)
                const dot = document.getElementById('mcu-status-dot');
                const indicator = document.getElementById('mcu-status-indicator'); // Pokud máš i ten malý indikátor v rohu
                const text = document.getElementById('mcu-status-text');
                
                const isOnline = diffMinutes < 70; 

                if (isOnline) {
                    // ZELENÁ - ONLINE
                    if (dot) dot.className = "absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full";
                    if (indicator) indicator.className = "w-2 h-2 rounded-full bg-green-500";
                    if (text) {
                        text.className = "font-bold text-green-600 text-xs uppercase";
                        text.textContent = "Online";
                    }
                } else {
                    // ČERVENÁ - OFFLINE
                    if (dot) dot.className = "absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full";
                    if (indicator) indicator.className = "w-2 h-2 rounded-full bg-red-500";
                    if (text) {
                        text.className = "font-bold text-red-600 text-xs uppercase";
                        text.textContent = "Offline";
                    }
                }
            }
        }
    } catch (err) {
        console.error('Chyba při načítání MCU:', err);
        if (window.openToast) window.openToast("Nepodařilo se načíst data zařízení.", false);
    }
});



/* ---------------------------------------------------------
   LOGIKA PRO SENSOR MODAL (Rodičovský formulář)
   --------------------------------------------------------- */
const sensorModal = Modal.register('sensor');

// Funkce pro vykreslení seznamu metrik v sensor modalu
function renderMetricsList() {
    const container = document.getElementById('metricsContainer');
    const emptyState = document.getElementById('emptyMetricsState');

    // Vyčistit kontejner
    container.innerHTML = '';

    // Řízení viditelnosti "Prázdného stavu"
    if (tempMetrics.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    // Vykreslení položek
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

// Pomocná funkce pro překlad typu (pro hezčí zobrazení)
function translateType(type) {
    const types = {
        'temperature': 'Teplota',
        'humidity': 'Vlhkost',
        'pressure': 'Tlak',
        'voltage': 'Napětí',
        'generic': 'Ostatní'
    };
    return types[type] || type;
}

// Funkce pro smazání metriky z pole (volaná z HTML tlačítka)
window.removeMetric = (index) => {
    tempMetrics.splice(index, 1); // Odstraní položku z pole
    renderMetricsList(); // Překreslí seznam
};

if (sensorModal) {
    // 1. Otevření modalu senzoru
    if (sensorModal.openModal) {
        sensorModal.openModal.addEventListener('click', () => {
            tempMetrics = []; // RESET pole při novém otevření
            renderMetricsList(); // Vyresetuje UI
            sensorModal.open();
            sensorModal.hideError();
        });
    }

    // 2. Odeslání celého senzoru (Save Sensor)
    if (sensorModal.submitBtn) {
        sensorModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const sensorName = document.getElementById('sensorNameInput').value;
            const mcuId = window.location.pathname.split('/').pop();

            // Validace
            if (!sensorName) {
                sensorModal.showError("Vyplňte název senzoru.");
                return;
            }

            if (tempMetrics.length === 0) {
                sensorModal.showError("Musíte přidat alespoň jednu měřenou veličinu.");
                return;
            }

            // Příprava dat pro Controller
            // Controller očekává: { deviceId, model (name), channels (tempMetrics) }
            const formData = {
                deviceId: mcuId,     // Odpovídá MCURepository
                model: sensorName,   // Odpovídá Sensor.js
                channels: tempMetrics // Pole objektů {name, type, unit}
            };

            try {
                sensorModal.submitBtn.disabled = true;
                sensorModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
                
                const response = await fetch('/sensor', { // Upravte URL dle vaší routy
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                window.openToast(data.message, data.success);
                if (response.ok) { // Kontrola HTTP 200/201
                    // window.openToast("Senzor byl úspěšně přidán!", true); // Pokud máte toast
                    sensorModal.close();
                } else {
                    sensorModal.showError(data.error || "Chyba při ukládání.");
                }
            } catch (error) {
                console.error(error);
                sensorModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                sensorModal.submitBtn.disabled = false;
                sensorModal.submitBtn.innerHTML = 'Uložit senzor';
            }
        });
    }
}


/* ---------------------------------------------------------
   LOGIKA PRO METRIC MODAL (Dítě - přidává do pole)
   --------------------------------------------------------- */
const metricModal = Modal.register('metric');

if (metricModal) {
    // 1. Otevření modalu (kliknutí na "Přidat veličinu" v Sensor modalu)
    const openBtn = document.getElementById('metricOpen'); // Tlačítko uvnitř sensorForm
    if(openBtn){
        openBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Aby se nerefreshnula stránka
            metricModal.open();
            metricModal.hideError();
            metricModal.clear();
        });
    }

    // 2. Potvrzení metriky (přidání do pole, NE odeslání na server)
    if (metricModal.submitBtn) {
        metricModal.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Získání hodnot z formuláře
            const nameVal = document.getElementById('metricNameInput').value;
            const typeVal = document.getElementById('metricTypeInput').value;
            const unitVal = document.getElementById('metricUnitInput').value;

            // Jednoduchá validace
            if (!nameVal || !unitVal) {
                metricModal.showError("Vyplňte název a jednotku.");
                return;
            }

            // Vytvoření objektu metriky
            const newMetric = {
                name: nameVal, // Volitelné, pokud to chcete ukládat do DB (v SensorService jsme měli jen type a unit, ale name se hodí pro UI)
                type: typeVal,
                unit: unitVal
            };

            // PŘIDÁNÍ DO DOČASNÉHO POLE
            tempMetrics.push(newMetric);

            // Aktualizace UI v rodičovském modalu
            renderMetricsList();

            // Zavření modalu metriky (data jsou v poli, takže o ně nepřijdeme)
            metricModal.close();
        });
    }
}