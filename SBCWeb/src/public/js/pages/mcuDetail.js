document.addEventListener('DOMContentLoaded', async () => {
    
    // ---------------------------------------------------------
    // 1. GLOBÁLNÍ PROMĚNNÉ A KONFIGURACE
    // ---------------------------------------------------------
    window.mcuId = window.location.pathname.split('/').pop();
    let tempMetrics = []; 
    let mainChart = null;
    let currentChartChannelId = null;
    let currentChartRange = '24h';
    let currentChartData = []; // Tady si uložíme surová data ze serveru
    let currentMetric = 'avg'; // Defaultní zobrazení
    // ---------------------------------------------------------
    // 2. POMOCNÉ FUNKCE (Stylování, Překlady)
    // ---------------------------------------------------------
    function getSensorStyle(type) {
        const t = type.toLowerCase();
        if (t.includes('temp') || t.includes('teplota')) return { icon: 'fa-thermometer-half', color: 'text-vintage-grape-600' };
        if (t.includes('hum') || t.includes('vlhkost')) return { icon: 'fa-tint', color: 'text-blue-500' };
        if (t.includes('press') || t.includes('tlak')) return { icon: 'fa-tachometer-alt', color: 'text-emerald-500' };
        if (t.includes('co2') || t.includes('air')) return { icon: 'fa-wind', color: 'text-gray-600' };
        if (t.includes('light') || t.includes('světlo') || t.includes('lux')) return { icon: 'fa-sun', color: 'text-amber-500' };
        if (t.includes('volt') || t.includes('napětí') || t.includes('batt')) return { icon: 'fa-bolt', color: 'text-yellow-600' };
        if (t.includes('rssi') || t.includes('signal') || t.includes('wifi')) return { icon: 'fa-wifi', color: 'text-midnight-violet-900' };
        return { icon: 'fa-chart-line', color: 'text-gray-400' };
    }

    function translateType(type) {
        const types = { 'temperature': 'Teplota', 'humidity': 'Vlhkost', 'pressure': 'Tlak', 'voltage': 'Napětí', 'generic': 'Ostatní' };
        return types[type] || type;
    }

    // ---------------------------------------------------------
    // 3. NAČÍTÁNÍ DAT (Senzory a MCU)
    // ---------------------------------------------------------
    
    // Funkce pro načtení seznamu senzorů
    // Parametr isBackground = true znamená, že nevymažeme seznam a neukážeme loader (tichá aktualizace)
    const loadSensors = async (isBackground = false) => {
        const container = document.getElementById('sensorListContainer');
        if (!container) return;

        // Pokud to NENÍ aktualizace na pozadí, ukážeme loader
        if (!isBackground) {
            container.innerHTML = '<div class="p-4 text-center text-xs text-gray-400"><i class="fas fa-spinner fa-spin"></i> Načítám senzory...</div>';
        }

        try {
            const response = await fetch(`/sensor/device/${window.mcuId}`); // Zkontroluj si URL, zda sedí s routerem!
            const data = await response.json();

            if (data.success && data.sensors.length > 0) {
                // Tady vyčistíme kontejner a vyrenderujeme znovu
                // (Pro pokročilejší verzi by se dalo jen aktualizovat čísla, ale pro teď stačí překreslit)
                container.innerHTML = ''; 
                
                data.sensors.forEach(sensor => {
                    if (!sensor.channels || sensor.channels.length === 0) return;

                    sensor.channels.forEach((channel) => {
                        const style = getSensorStyle(channel.type);
                        const lastValue = channel.last_value !== undefined ? channel.last_value : '---'; 

                        const itemHtml = `
                        <div onclick="updateChart(null, '${channel.id}')" class="group flex items-center justify-between px-3 py-2.5 hover:bg-ash-grey-50 cursor-pointer transition-colors border-b border-ash-grey-50 last:border-0">
                            <div class="flex items-center gap-2 overflow-hidden">
                                <div class="w-6 h-6 rounded bg-white flex flex-none items-center justify-center shadow-sm border border-ash-grey-100 text-xs">
                                    <i class="fas ${style.icon} ${style.color}"></i>
                                </div>
                                <div class="flex flex-col overflow-hidden">
                                    <p class="text-xs font-medium text-gray-700 truncate group-hover:text-midnight-violet-900" title="${sensor.model} - ${channel.type}">
                                        ${translateType(channel.type)} <span class="text-[9px] text-gray-400 font-normal">(${sensor.model})</span>
                                    </p>
                                </div>
                            </div>
                            <div class="flex-none text-right ml-2">
                                <span class="text-xs font-bold text-gray-800">${lastValue}</span>
                                <span class="text-[10px] text-silver-500 ml-0.5">${channel.unit}</span>
                            </div>
                        </div>`;
                        
                        container.insertAdjacentHTML('beforeend', itemHtml);
                    });
                });
            } else {
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-32 text-silver-400">
                        <i class="fas fa-wind text-2xl mb-2 opacity-20"></i>
                        <span class="text-xs">Žádné senzory</span>
                    </div>`;
            }
        } catch (error) {
            console.error('Chyba při načítání senzorů:', error);
            if (!isBackground) container.innerHTML = '<div class="p-4 text-center text-xs text-red-400">Chyba načítání dat.</div>';
        }
    };
    
    // Zpřístupnění loadSensors pro UpdateView
    window.refreshSensors = loadSensors;


    // Funkce pro načtení info o MCU
    async function fetchMcuInfo() {
        try {
            const response = await fetch('/mcu/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: window.mcuId })
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

                // B) Logika času a statusu
                if (mcu.lastSeen) {
                    const parts = mcu.lastSeen.split(/[- :]/);
                    const lastSeenDate = new Date(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]);
                    
                    // Korekce času +1h
                    lastSeenDate.setHours(lastSeenDate.getHours() + 1);
                    
                    const now = new Date();
                    const diffMinutes = Math.floor((now - lastSeenDate) / 1000 / 60);
                    const isToday = now.toDateString() === lastSeenDate.toDateString();
                    
                    const timeString = isToday 
                        ? lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                        : lastSeenDate.toLocaleDateString('cs-CZ') + " " + lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

                    const lsEl = document.getElementById('mcu-lastseen');
                    if(lsEl) lsEl.textContent = timeString;

                    // Statusy
                    const dot = document.getElementById('mcu-status-dot');
                    const indicator = document.getElementById('mcu-status-indicator');
                    const text = document.getElementById('mcu-status-text');
                    const isOnline = diffMinutes < 70; 

                    const updateStatus = (colorClass, textContent) => {
                        if (dot) dot.className = `absolute -bottom-1 -right-1 w-4 h-4 bg-${colorClass}-500 border-2 border-white rounded-full`;
                        if (indicator) indicator.className = `w-2 h-2 rounded-full bg-${colorClass}-500`;
                        if (text) {
                            text.className = `font-bold text-${colorClass}-600 text-xs uppercase`;
                            text.textContent = textContent;
                        }
                    };

                    if (isOnline) updateStatus('green', 'Online');
                    else updateStatus('red', 'Offline');
                }
            }
        } catch (err) {
            console.error('Chyba při načítání MCU:', err);
        }
    }


    // ---------------------------------------------------------
    // 4. HLAVNÍ UPDATE FUNKCE
    // ---------------------------------------------------------
    window.updateView = async function(isBackground = false) {
        // console.log("🔄 UpdateView...", isBackground ? "(Pozadí)" : "(Full)");
        await fetchMcuInfo();
        await loadSensors(isBackground);
    }


    // ---------------------------------------------------------
    // 5. MODAL LOGIKA (Přidání senzoru a metrik)
    // ---------------------------------------------------------
    const sensorModal = Modal.register('sensor');

    function renderMetricsList() {
        const container = document.getElementById('metricsContainer');
        const emptyState = document.getElementById('emptyMetricsState');
        
        if(!container) return;

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

    window.removeMetric = (index) => {
        tempMetrics.splice(index, 1);
        renderMetricsList();
    };

    if (sensorModal) {
        // Otevření
        sensorModal.openModal?.addEventListener('click', () => {
            tempMetrics = [];
            renderMetricsList();
            sensorModal.open();
            sensorModal.hideError();
        });

        // Odeslání (SAVE SENSOR)
        sensorModal.submitBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            const sensorName = document.getElementById('sensorNameInput').value;

            if (!sensorName) return sensorModal.showError("Vyplňte název senzoru.");
            if (tempMetrics.length === 0) return sensorModal.showError("Musíte přidat alespoň jednu měřenou veličinu.");

            const formData = {
                deviceId: window.mcuId,
                model: sensorName,
                channels: tempMetrics
            };

            try {
                sensorModal.submitBtn.disabled = true;
                sensorModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
                
                const response = await fetch('/api/sensors', { // POZOR: Zkontroluj, jestli máš routu /api/sensors nebo /sensor
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    window.openToast(data.message || "Senzor přidán", true);
                    sensorModal.close();
                    // Voláme updateView pro okamžité načtení nového senzoru
                    window.updateView(false); 
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

    // Modal pro metriky (Dítě)
    const metricModal = Modal.register('metric');
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
    // ---------------------------------------------------------
    // 7. graf
    // ---------------------------------------------------------

    function initChart() {
        const ctx = document.getElementById('mainChart').getContext('2d');
        
        // ... gradient ...

        mainChart = new Chart(ctx, {
            type: 'line',
            data: { /* ... */ },
            options: {
                // --- PŘIDÁNO: Vnitřní odsazení grafu ---
                layout: {
                    padding: {
                        top: 10,
                        right: 20, // Aby se neořezal poslední bod vpravo
                        bottom: 10,
                        left: 10
                    }
                },
                // ---------------------------------------
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: '#9aa092', font: { size: 10 }, maxTicksLimit: 8 } 
                    },
                    y: { 
                        grid: { color: '#f2f3f1' }, 
                        ticks: { color: '#9aa092' } 
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
            }
        });
    }

    window.updateChart = async (range = null, channelId = null) => {
        
        // 1. Aktualizace stavu (pokud přišla nová hodnota)
        if (range) currentChartRange = range;
        if (channelId) currentChartChannelId = channelId;

        // Pokud nemáme vybraný žádný senzor, nemůžeme nic načíst
        if (!currentChartChannelId) return;

        // 2. Aktualizace vzhledu tlačítek času (zvýraznění aktivního)
        document.querySelectorAll('.chart-time-btn').forEach(btn => {
            // Kontrolujeme, jestli onclick obsahuje aktuální range (např. '24h')
            if (btn.getAttribute('onclick').includes(`'${currentChartRange}'`)) {
                // Aktivní styl
                btn.classList.add('bg-white', 'shadow-sm', 'text-midnight-violet-900');
                btn.classList.remove('text-silver-500', 'hover:bg-white/50');
            } else {
                // Neaktivní styl
                btn.classList.remove('bg-white', 'shadow-sm', 'text-midnight-violet-900');
                btn.classList.add('text-silver-500', 'hover:bg-white/50');
            }
        });

        console.log(`📈 Načítám graf: ID=${currentChartChannelId}, Range=${currentChartRange}`);

        try {
        const response = await fetch('/readings/history', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channelId: currentChartChannelId,
                range: currentChartRange
            })
        });

        const result = await response.json();
        console.log(result);
        if (result.success) {
            renderChartData(result.data);
        } else {
            console.error("Server vrátil chybu:", result.error);
        }
        } catch (error) {
            console.error("Chyba při komunikaci se serverem:", error);
        }
    };

    // Funkce volaná při kliknutí na radio button (Min/Max/Avg)
function updateChartMetric() {
    // Zjistíme, co je vybráno
    const radios = document.getElementsByName('chartMetric');
    for (const radio of radios) {
        if (radio.checked) {
            currentMetric = radio.value;
            break;
        }
    }
    // Překreslíme graf (bez stahování dat ze serveru!)
    renderChartData();
}

window.updateChartMetric = updateChartMetric;

// Hlavní vykreslovací funkce
function renderChartData(data = null) {
    // Pokud nám někdo poslal data (poprvé), uložíme je. Jinak bereme z paměti.
    if (data) currentChartData = data;
    
    // Pokud nemáme data ani graf, končíme
    if (!mainChart || !currentChartData || currentChartData.length === 0) return;

    // 1. Osy X (Čas) - stejné pro všechny
    const labels = currentChartData.map(row => {
        const date = new Date(row.timestamp);
        if (currentChartRange === '7d') {
            return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) + ' ' + 
                   date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    });

    // 2. Vymažeme staré datasety
    mainChart.data.datasets = [];

    // 3. Přidáme datasety podle výběru
    
    // Dataset pro PRŮMĚR (fialová)
    if (currentMetric === 'avg' || currentMetric === 'all') {
        mainChart.data.datasets.push({
            label: 'Průměr',
            data: currentChartData.map(row => row.avg),
            borderColor: '#886c93', // Vintage Grape
            backgroundColor: 'rgba(136, 108, 147, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            fill: currentMetric === 'avg' // Výplň jen když je samotný
        });
    }

    // Dataset pro MINIMUM (modrá)
    if (currentMetric === 'min' || currentMetric === 'all') {
        mainChart.data.datasets.push({
            label: 'Minimum',
            data: currentChartData.map(row => row.min),
            borderColor: '#3b82f6', // Blue-500
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: (currentMetric === 'all') ? 1 : 2, // Tenčí čára pokud je "Vše"
            borderDash: (currentMetric === 'all') ? [5, 5] : [], // Čárkovaně pokud je "Vše"
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            fill: false
        });
    }

    // Dataset pro MAXIMUM (červená)
    if (currentMetric === 'max' || currentMetric === 'all') {
        mainChart.data.datasets.push({
            label: 'Maximum',
            data: currentChartData.map(row => row.max),
            borderColor: '#ef4444', // Red-500
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: (currentMetric === 'all') ? 1 : 2,
            borderDash: (currentMetric === 'all') ? [5, 5] : [],
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            fill: false
        });
    }

    // 4. Update
    mainChart.data.labels = labels;
    mainChart.update();
}

    // ---------------------------------------------------------
    // 8. START APLIKACE (INIT)
    // ---------------------------------------------------------
    
    // Zobrazení toastu po reloadu
    const toastMsg = sessionStorage.getItem('toastMessage');
    const toastSuccess = sessionStorage.getItem('toastSuccess');
    if (toastMsg && window.openToast) {
        window.openToast(toastMsg, toastSuccess === 'true');
        sessionStorage.removeItem('toastMessage');
        sessionStorage.removeItem('toastSuccess');
    }

    // První načtení (s loaderem)
    await window.updateView(false);
    initChart();
    // Automatický refresh každých 30s (bez loaderu = true)
    setInterval(() => {
        window.updateView(true);
    }, 5000);

});