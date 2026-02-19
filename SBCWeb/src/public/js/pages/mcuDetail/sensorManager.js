import { getMcuId, getSensorStyle, translateType } from './utils.js';
import { updateChart } from './chartManager.js';

let tempMetrics = [];


export async function loadSensors(isBackground = false) {
    const listContainer = document.getElementById('sensorListContainer');
    const cardsContainer = document.getElementById('sensorCardsContainer'); // Přidáno

    if (!listContainer || !cardsContainer) return;

    if (!isBackground) {
        listContainer.innerHTML = '<div class="p-4 text-center text-xs text-gray-400"><i class="fas fa-spinner fa-spin"></i> Načítám...</div>';
        cardsContainer.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-gray-400 py-4 text-xs"><i class="fas fa-spinner fa-spin mr-2"></i> Načítám karty...</div>';
    }

    try {
        const response = await fetch(`/sensor/device/${getMcuId()}`);
        const data = await response.json();

        if (data.success && data.sensors.length > 0) {
            listContainer.innerHTML = '';
            cardsContainer.innerHTML = ''; // Vyčistíme kontejner pro karty

            data.sensors.forEach(sensor => {
                sensor.channels.forEach(channel => {
                    const style = getSensorStyle(channel.type);
                    const translated = translateType(channel.type);
                    
                    // --- 1. VYKRESLENÍ POLOŽKY DO SEZNAMU (Tvoje původní) ---
                    const itemHtml = `
                        <div onclick="updateChart(null, '${channel.id}', '${channel.unit}', '${sensor.model}', '${translated}')" class="group flex items-center justify-between px-3 py-2.5 hover:bg-ash-grey-50 cursor-pointer border-b border-ash-grey-50 last:border-0">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded bg-white flex items-center justify-center border shadow-sm text-xs">
                                    <i class="fas ${style.icon} ${style.color}"></i>
                                </div>
                                <p class="text-xs font-medium text-gray-700">${translated} <span class="text-[9px] text-gray-400">(${sensor.model})</span></p>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] text-silver-500">unit:</span>    
                                <span class="text-xs font-bold text-gray-800">${channel.unit} </span>
                            </div>
                        </div>`;
                    listContainer.insertAdjacentHTML('beforeend', itemHtml);

                    // --- 2. VYKRESLENÍ KARTIČKY NA DASHBOARD ---
                    // Pokud už ze serveru přijde live hodnota (current_value), použijeme ji. Jinak dáme "---"
                    const displayValue = (channel.current_value !== null && channel.current_value !== undefined) 
                                         ? channel.current_value 
                                         : '---';

                    const cardHtml = `
                        <div class="bg-white rounded-xl border border-ash-grey-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                            <div class="absolute top-0 left-0 w-full h-1 ${style.color.replace('text-', 'bg-')} opacity-75"></div>
                            
                            <div class="flex justify-between items-start mb-4 mt-1">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-ash-grey-50 flex items-center justify-center border border-ash-grey-100 shadow-inner text-lg">
                                        <i class="fas ${style.icon} ${style.color}"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-sm font-bold text-midnight-violet-900">${translated}</h3>
                                        <p class="text-[10px] text-silver-500 font-medium tracking-wide uppercase">${sensor.model}</p>
                                    </div>
                                </div>
                                
                                <div class="flex gap-3">
                                    <button onclick="updateChart(null, '${channel.id}', '${channel.unit}', '${sensor.model}', '${translated}')" title="Zobrazit graf" class="text-silver-300 hover:text-midnight-violet-500 transition-colors">
                                        <i class="fas fa-chart-line"></i>
                                    </button>
                                    <button onclick="deleteSensorHandler('${sensor.id}')" title="Smazat senzor" class="text-silver-300 hover:text-red-500 transition-colors">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="mt-2 flex items-baseline gap-1.5">
                                <span id="card-value-${channel.id}" class="text-3xl font-black text-gray-800 tracking-tight transition-colors duration-300">
                                    ${displayValue}
                                </span>
                                <span class="text-sm font-bold text-silver-400">${channel.unit}</span>
                            </div>
                        </div>`;
                    cardsContainer.insertAdjacentHTML('beforeend', cardHtml);
                });
            });

            // Auto-select prvního pro graf
            if (!window.currentChartChannelId) {
                const first = data.sensors.find(s => s.channels?.length > 0);
                if (first) updateChart(null, first.channels[0].id, first.channels[0].unit, first.model, translateType(first.channels[0].type));
            }
        } else {
            // PRÁZDNÝ STAV (Žádné senzory)
            const emptyHtml = `
                <div class="flex flex-col items-center justify-center h-full py-10 bg-white text-silver-400">
                    <div class="w-12 h-12 bg-ash-grey-50 rounded-full flex items-center justify-center mb-3">
                        <i class="fas fa-inbox text-xl text-silver-300"></i>
                    </div>
                    <span class="text-xs font-medium">Seznam je prázdný</span>
                    <span class="text-[10px] text-silver-300 mt-1">Zatím žádná data</span>
                </div>`;
            
            listContainer.innerHTML = emptyHtml;
            cardsContainer.innerHTML = `<div class="col-span-1 md:col-span-2">${emptyHtml}</div>`;
        }
    } catch (e) { 
        console.error(e); 
        listContainer.innerHTML = '<div class="p-4 text-center text-xs text-red-400">Chyba načítání</div>';
        cardsContainer.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-xs text-red-400 py-4">Chyba načítání karet</div>';
    }
}

export async function fetchMcuInfo() {
    try {
        const res = await fetch('/mcu/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: getMcuId() })
        });
        const data = await res.json();
        
        if (data.success && data.mcu) {
            const mcu = data.mcu;
            // Základní texty
            document.getElementById('mcu-name').textContent = mcu.name;
            document.getElementById('mcu-ip').textContent = mcu.ipAddress || '---';
            document.getElementById('mcu-mac').textContent = mcu.macAddress || '---';

            const apiKeyEl = document.getElementById('mcu-api-key');
            if (apiKeyEl) {
                // Naplníme reálný klíč z DB
                apiKeyEl.textContent = mcu.apiKey || 'Žádný klíč';
                // Zajistíme, že při novém načtení je klíč opět skrytý (pokud chceš)
                apiKeyEl.style.webkitTextSecurity = 'disc'; 
                // Pokud používáš ten blur, přidáme ho taky
                apiKeyEl.classList.add('blur-[4px]');
            }

            // Logika času a statusu (tohle ti pravděpodobně chybělo)
            if (mcu.lastSeen) {
                const parts = mcu.lastSeen.split(/[- :]/);
                const lastSeenDate = new Date(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]);
                lastSeenDate.setHours(lastSeenDate.getHours() + 1); // Korekce pásma
                
                const now = new Date();
                const diffMinutes = Math.floor((now - lastSeenDate) / 1000 / 60);
                const isOnline = diffMinutes < 70; 

                // Aktualizace kontrolek v DOM
                const dot = document.getElementById('mcu-status-dot');
                const text = document.getElementById('mcu-status-text');
                
                if (dot) dot.className = `absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`;
                if (text) {
                    text.textContent = isOnline ? 'Online' : 'Offline';
                    text.className = `font-bold text-xs uppercase ${isOnline ? 'text-green-600' : 'text-red-600'}`;
                }
                
                document.getElementById('mcu-lastseen').textContent = lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
            }
        }
    } catch (e) { console.error("Chyba MCU info:", e); }
}

const apiKeyContainer = document.getElementById('api-key-container');
const apiKeyText = document.getElementById('mcu-api-key');
const apiKeyEye = document.getElementById('api-key-eye');
const apiKeyCopy = document.getElementById('api-key-copy');


apiKeyContainer.addEventListener('click', (e) => {
    // Ignorujeme kliknutí na kopírovací ikonku
    if (e.target.closest('#api-key-copy')) return;

    // ZJEDNODUŠENÁ LOGIKA:
    // Ptáme se: Je to právě teď rozmazané?
    const isBlurred = apiKeyText.classList.contains('blur-[4px]');

    if (isBlurred) {
        // --- ODHALIT (Smazat blur, smazat tečky) ---
        
        // 1. Odstraníme rozmazání
        apiKeyText.classList.remove('blur-[4px]');
        
        // 2. Vypneme "heslové" tečky (nastavíme na none)
        apiKeyText.style.webkitTextSecurity = 'none'; 
        
        // 3. Změna ikony oka
        apiKeyEye.classList.replace('fa-eye', 'fa-eye-slash');
        apiKeyEye.classList.add('text-midnight-violet-600'); // Volitelné: zvýraznění ikony

    } else {
        // --- SKRÝT (Přidat blur, přidat tečky) ---
        
        // 1. Přidáme rozmazání
        apiKeyText.classList.add('blur-[4px]');
        
        // 2. Zapneme "heslové" tečky
        apiKeyText.style.webkitTextSecurity = 'disc';
        
        // 3. Změna ikony oka zpět
        apiKeyEye.classList.replace('fa-eye-slash', 'fa-eye');
        apiKeyEye.classList.remove('text-midnight-violet-600');
    }
});



apiKeyCopy.addEventListener('click', async (e) => {
    // 1. Zastavíme šíření kliknutí, aby se neotevřel/nezavřel blur klíče
    e.stopPropagation();

    const textToCopy = apiKeyText.textContent.trim();
    
    // 2. Samotné kopírování
    try {
        await navigator.clipboard.writeText(textToCopy);
        
        // 3. Vizuální feedback pro 2K monitor (změna barvy a ikony)
        apiKeyCopy.classList.replace('fa-copy', 'fa-check');
        apiKeyCopy.classList.replace('text-silver-400', 'text-green-500');
        
        // Po 2 sekundách vrátíme původní stav
        setTimeout(() => {
            apiKeyCopy.classList.replace('fa-check', 'fa-copy');
            apiKeyCopy.classList.replace('text-green-500', 'text-silver-400');
        }, 2000);

    } catch (err) {
        console.error('Kopírování selhalo:', err);
    }
});



/**
 * Vykreslí seznam metrik v modalu pro přidání senzoru
 */
function renderMetricsList() {
    const container = document.getElementById('metricsContainer');
    const emptyState = document.getElementById('emptyMetricsState');
    
    if (!container) return;

    container.innerHTML = '';
    if (tempMetrics.length === 0) {
        emptyState?.classList.remove('hidden');
    } else {
        emptyState?.classList.add('hidden');
    }

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

/**
 * Veřejná funkce pro smazání metriky z dočasného seznamu
 */
export function removeMetric(index) {
    tempMetrics.splice(index, 1);
    renderMetricsList();
}

/**
 * Inicializace veškeré modalové logiky
 */
export function initModals() {
    const sensorModal = Modal.register('sensor');
    const metricModal = Modal.register('metric');

    // --- LOGIKA HLAVNÍHO MODALU (PŘIDÁNÍ SENZORU) ---
    if (sensorModal) {
        // Otevření modalu a reset dat
        sensorModal.openModal?.addEventListener('click', () => {
            tempMetrics = [];
            renderMetricsList();
            sensorModal.open();
            sensorModal.hideError();
            document.getElementById('sensorNameInput').value = '';
        });

        // Odeslání senzoru na server
        sensorModal.submitBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            const sensorName = document.getElementById('sensorNameInput').value;

            if (!sensorName) return sensorModal.showError("Vyplňte název senzoru.");
            if (tempMetrics.length === 0) return sensorModal.showError("Přidejte alespoň jednu veličinu.");

            const formData = {
                deviceId: getMcuId(),
                model: sensorName,
                channels: tempMetrics
            };

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
                    window.openToast(data.message || "Senzor přidán", true);
                    sensorModal.close();
                    window.updateView(false); // Refresh seznamu
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

    // --- LOGIKA POD-MODALU (PŘIDÁNÍ JEDNÉ METRIKY) ---
    if (metricModal) {
        document.getElementById('metricOpen')?.addEventListener('click', (e) => {
            e.preventDefault();
            metricModal.open();
            metricModal.hideError();
            metricModal.clear();
        });

        metricModal.submitBtn?.addEventListener('click', (e) => {
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