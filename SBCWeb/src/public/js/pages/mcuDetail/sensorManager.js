import { getMcuId, getSensorStyle, translateType } from './utils.js';
import { updateChart } from './chartManager.js';

let tempMetrics = [];

export async function loadSensors(isBackground = false) {
    const container = document.getElementById('sensorListContainer');
    if (!container) return;

    if (!isBackground) container.innerHTML = '<div class="p-4 text-center text-xs text-gray-400"><i class="fas fa-spinner fa-spin"></i> Načítám...</div>';

    try {
        const response = await fetch(`/sensor/device/${getMcuId()}`);
        const data = await response.json();

        if (data.success && data.sensors.length > 0) {
            container.innerHTML = '';
            data.sensors.forEach(sensor => {
                sensor.channels.forEach(channel => {
                    const style = getSensorStyle(channel.type);
                    const translated = translateType(channel.type);
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
                    container.insertAdjacentHTML('beforeend', itemHtml);
                });
            });

            // Auto-select prvního
            if (!window.currentChartChannelId) {
                const first = data.sensors.find(s => s.channels?.length > 0);
                if (first) updateChart(null, first.channels[0].id, first.channels[0].unit, first.model, translateType(first.channels[0].type));
            }
        }
    } catch (e) { console.error(e); }
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

    // Přepínáme maskování (hvězdičky)
    const isHidden = apiKeyText.style.webkitTextSecurity === 'disc' || apiKeyText.classList.contains('[webkit-text-security:disc]');

    if (isHidden) {
        apiKeyText.style.webkitTextSecurity = 'none'; // Odmaskovat
        apiKeyText.classList.remove('blur-[4px]', '[webkit-text-security:disc]');
        apiKeyEye.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        apiKeyText.style.webkitTextSecurity = 'disc'; // Zamaskovat
        apiKeyText.classList.add('blur-[4px]');
        apiKeyEye.classList.replace('fa-eye-slash', 'fa-eye');
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

export function initModals() {
    const sensorModal = Modal.register('sensor');
    const metricModal = Modal.register('metric');

    // ... sem přesuň zbývající event listenery (submitBtn atd.) ...
}

export function removeMetric(index) {
    tempMetrics.splice(index, 1);
    // renderMetricsList() musíš mít definovanou v tomto souboru
}