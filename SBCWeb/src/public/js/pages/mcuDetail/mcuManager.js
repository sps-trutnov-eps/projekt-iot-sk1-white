import { getMcuId } from './utils.js';

// Sem si uložíme referenci na socket
let socket = null;

export async function fetchMcuInfo() {
    const mcuId = getMcuId();
    if (!mcuId) return;

    // 1. JEDNORÁZOVÉ NAČTENÍ STATICKÝCH DAT
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

            // OPRAVA: Už nepřevádíme na boolean. Necháme původní číslo.
            let initialStatus = null;
            if (mcu.isOnline !== undefined) initialStatus = mcu.isOnline;
            else if (mcu.is_online !== undefined) initialStatus = mcu.is_online;
            
            updateMcuStatusUI(mcu.lastSeen, initialStatus);
        }
    } catch (e) { 
        console.error("Chyba při stahování MCU info:", e); 
    }

    // 2. SOCKET.IO PRO ŽIVÉ AKTUALIZACE STAVU
    if (!socket) {
        socket = io(); 

        socket.on('connect', () => {
            socket.emit('subscribe_mcu', mcuId);
        });

        socket.on('mcu_status', (payload) => {
            if (payload.mcuId == mcuId) {
                // OPRAVA: Předáváme rovnou status z payloadu (0, 1, 2)
                updateMcuStatusUI(payload.lastSeen, payload.status);
            }
        });
    } else {
        socket.emit('subscribe_mcu', mcuId);
    }
}

// Vyčleněná funkce, aby se kód neopakoval. Stará se jen o čas a barvu tečky.
export function updateMcuStatusUI(lastSeenDbTime, statusVal = null) {
    if (!lastSeenDbTime) return;

    let dbTime = lastSeenDbTime;
    if (typeof dbTime === 'string') {
        dbTime = dbTime.replace(' ', 'T');
        if (!dbTime.endsWith('Z')) dbTime += 'Z';
    }
    
    const lastSeenDate = new Date(dbTime);
    const now = new Date();
    
    // Zjistíme, jaký je to vlastně stav (0 = Offline, 1 = Online, 2 = Passive)
    let currentStatus = 0;
    
    if (statusVal !== null) {
        // Pokud to někde projde jako boolean (true/false), převedeme zpět na 1 a 0
        if (statusVal === true) currentStatus = 1;
        else if (statusVal === false) currentStatus = 0;
        else currentStatus = parseInt(statusVal, 10);
    } else {
        // Fallback: Pokud nám server nepošle stav, odhadneme to podle času
        currentStatus = Math.floor((now - lastSeenDate) / 1000 / 60) < 70 ? 1 : 0; 
    }

    const isToday = 
        lastSeenDate.getDate() === now.getDate() &&
        lastSeenDate.getMonth() === now.getMonth() &&
        lastSeenDate.getFullYear() === now.getFullYear();

    let formattedTime = "";
    if (isToday) {
        formattedTime = lastSeenDate.toLocaleTimeString('cs-CZ', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
    } else {
        formattedTime = lastSeenDate.toLocaleDateString('cs-CZ', { 
            day: 'numeric', month: 'numeric' 
        }) + ' ' + lastSeenDate.toLocaleTimeString('cs-CZ', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
    }

    // --- NASTAVENÍ VZHLEDU (BAREv A TEXTŮ) ---
    let statusText = 'Offline';
    let dotColor = 'bg-red-500';
    let textColor = 'text-red-600';

    if (currentStatus === 1) {
        statusText = 'Online';
        dotColor = 'bg-green-500';
        textColor = 'text-green-600';
    } else if (currentStatus === 2) {
        statusText = 'Passive';
        dotColor = 'bg-yellow-400';
        textColor = 'text-yellow-600';
    }

    // Aktualizace UI
    const dot = document.getElementById('mcu-status-dot');
    const text = document.getElementById('mcu-status-text');
    
    if (dot) dot.className = `absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${dotColor}`;
    if (text) {
        text.textContent = statusText;
        text.className = `font-bold text-xs uppercase ${textColor}`;
    }
    
    const lastSeenEl = document.getElementById('mcu-lastseen');
    if (lastSeenEl) lastSeenEl.textContent = formattedTime;
}

export function initApiKeyListeners() {
    // ... [Zbytek tvého kódu zůstává stejný] ...
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