import { getMcuId } from './utils.js';

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
            document.getElementById('mcu-name').textContent = mcu.name;
            document.getElementById('mcu-ip').textContent = mcu.ipAddress || '---';
            document.getElementById('mcu-mac').textContent = mcu.macAddress || '---';

            const apiKeyEl = document.getElementById('mcu-api-key');
            if (apiKeyEl) {
                apiKeyEl.textContent = mcu.apiKey || 'Žádný klíč';
                apiKeyEl.style.webkitTextSecurity = 'disc'; 
                apiKeyEl.classList.add('blur-[4px]');
            }

            if (mcu.lastSeen) {
                const parts = mcu.lastSeen.split(/[- :]/);
                const lastSeenDate = new Date(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]);
                lastSeenDate.setHours(lastSeenDate.getHours() + 1); 
                
                const now = new Date();
                const isOnline = Math.floor((now - lastSeenDate) / 1000 / 60) < 70; 

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

export function initApiKeyListeners() {
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