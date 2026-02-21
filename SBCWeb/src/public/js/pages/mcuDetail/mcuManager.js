import { getMcuId } from './utils.js';

// Sem si uložíme referenci na socket
let socket = null;

export async function fetchMcuInfo() {
    const mcuId = getMcuId();
    if (!mcuId) return;

    // 1. JEDNORÁZOVÉ NAČTENÍ STATICKÝCH DAT (Jméno, IP, MAC, API klíč)
    try {
        const res = await fetch('/mcu/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mcuId })
        });
        const data = await res.json();
        
        if (data.success && data.mcu) {
            const mcu = data.mcu;
            document.getElementById('mcu-name').textContent = mcu.name || '---';
            document.getElementById('mcu-ip').textContent = mcu.ipAddress || '---';
            document.getElementById('mcu-mac').textContent = mcu.macAddress || '---';

            const apiKeyEl = document.getElementById('mcu-api-key');
            if (apiKeyEl && apiKeyEl.textContent !== mcu.apiKey) {
                apiKeyEl.textContent = mcu.apiKey || 'Žádný klíč';
                apiKeyEl.style.webkitTextSecurity = 'disc'; 
                apiKeyEl.classList.add('blur-[4px]');
            }

            // Nastavení počátečního času a statusu
            updateMcuStatusUI(mcu.lastSeen);
        }
    } catch (e) { 
        console.error("Chyba při stahování MCU info:", e); 
    }

    // 2. SOCKET.IO PRO ŽIVÉ AKTUALIZACE STAVU
    // Pokud už ve svém projektu máš socket inicializovaný jinde (např. window.socket), 
    // použij ten. Jinak ho vytvoříme zavoláním io().
    if (!socket) {
        socket = io(); // Založí spojení k tvému serveru

        socket.on('connect', () => {
            socket.emit('subscribe_mcu', mcuId);
        });

        // Nasloucháme na událost z backendu
        socket.on('mcu_status', (payload) => {
            if (payload.mcuId == mcuId) {
                updateMcuStatusUI(payload.lastSeen);
            }
        });
    } else {
        // Pokud funkce běží znovu (např. při změně stránky) a socket už existuje
        socket.emit('subscribe_mcu', mcuId);
    }
}

// Vyčleněná funkce, aby se kód neopakoval. Stará se jen o čas a barvu tečky.
// Vyčleněná funkce, aby se kód neopakoval. Stará se jen o čas a barvu tečky.
function updateMcuStatusUI(lastSeenDbTime) {
    if (!lastSeenDbTime) return;

    let dbTime = lastSeenDbTime;
    if (typeof dbTime === 'string') {
        dbTime = dbTime.replace(' ', 'T');
        if (!dbTime.endsWith('Z')) dbTime += 'Z';
    }
    
    const lastSeenDate = new Date(dbTime);
    const now = new Date();
    
    // Logika pro Online/Offline (70 minut)
    const isOnline = Math.floor((now - lastSeenDate) / 1000 / 60) < 70; 

    const isToday = 
        lastSeenDate.getDate() === now.getDate() &&
        lastSeenDate.getMonth() === now.getMonth() &&
        lastSeenDate.getFullYear() === now.getFullYear();

    let formattedTime = "";
    if (isToday) {
        // Zde jsou přidané vteřiny (second: '2-digit')
        formattedTime = lastSeenDate.toLocaleTimeString('cs-CZ', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    } else {
        // Zde jsou také přidané vteřiny (second: '2-digit')
        formattedTime = lastSeenDate.toLocaleDateString('cs-CZ', { 
            day: 'numeric', 
            month: 'numeric' 
        }) + ' ' + lastSeenDate.toLocaleTimeString('cs-CZ', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }

    // Aktualizace UI
    const dot = document.getElementById('mcu-status-dot');
    const text = document.getElementById('mcu-status-text');
    
    if (dot) dot.className = `absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`;
    if (text) {
        text.textContent = isOnline ? 'Online' : 'Offline';
        text.className = `font-bold text-xs uppercase ${isOnline ? 'text-green-600' : 'text-red-600'}`;
    }
    
    const lastSeenEl = document.getElementById('mcu-lastseen');
    if (lastSeenEl) lastSeenEl.textContent = formattedTime;
}

export function initApiKeyListeners() {
    // ... tento kód zůstává naprosto beze změny ...
    const apiKeyContainer = document.getElementById('api-key-container');
    const apiKeyText = document.getElementById('mcu-api-key');
    const apiKeyEye = document.getElementById('api-key-eye');
    const apiKeyCopy = document.getElementById('api-key-copy');

    if(!apiKeyContainer) return;

    apiKeyContainer.addEventListener('click', (e) => {
        if (e.target.closest('#api-key-copy')) return;
        const isBlurred = apiKeyText.classList.contains('blur-[4px]');

        if (isBlurred) {
            apiKeyText.classList.remove('blur-[4px]');
            apiKeyText.style.webkitTextSecurity = 'none'; 
            apiKeyEye.classList.replace('fa-eye', 'fa-eye-slash');
            apiKeyEye.classList.add('text-midnight-violet-600'); 
        } else {
            apiKeyText.classList.add('blur-[4px]');
            apiKeyText.style.webkitTextSecurity = 'disc';
            apiKeyEye.classList.replace('fa-eye-slash', 'fa-eye');
            apiKeyEye.classList.remove('text-midnight-violet-600');
        }
    });

    apiKeyCopy.addEventListener('click', async (e) => {
        e.stopPropagation();
        const textToCopy = apiKeyText.textContent.trim();
        try {
            await navigator.clipboard.writeText(textToCopy);
            apiKeyCopy.classList.replace('fa-copy', 'fa-check');
            apiKeyCopy.classList.replace('text-silver-400', 'text-green-500');
            setTimeout(() => {
                apiKeyCopy.classList.replace('fa-check', 'fa-copy');
                apiKeyCopy.classList.replace('text-green-500', 'text-silver-400');
            }, 2000);
        } catch (err) { console.error(err); }
    });
}