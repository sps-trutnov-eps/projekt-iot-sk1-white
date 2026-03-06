import { getMcuId } from './utils.js';
import { updateMcuStatusUI } from './mcuManager.js';
import { initEventManager } from './eventManager.js';

export async function initLiveData() {
    const socket = io(); 

    initEventManager(socket);

    socket.on('connect', () => {
        // 1. Získáme ID konkrétního MCU
        const currentMcuId = getMcuId();
        
        // 2. Pošleme serveru žádost o připojení do místnosti pro toto konkrétní MCU
        socket.emit('subscribe_mcu', currentMcuId); 
    });

    // 3. Nasloucháme na nová naměřená data
    socket.on('live_reading', (payload) => {
        // 1. Najdeme prvek na kartičce podle jeho ID
        const valueElement = document.getElementById(`card-value-${payload.channelId}`);
        
        // 2. Pokud prvek existuje, tiše přepíšeme hodnotu
        if (valueElement) {
            valueElement.innerText = payload.value;
        }
    });

    // 4. Nasloucháme na událost z backendu o změně stavu
    socket.on('mcu_status', (payload) => {
        const currentMcuId = getMcuId(); 
        
        if (payload.mcuId == currentMcuId) {
            // OPRAVA: Už nepřevádíme na boolean. Posíláme rovnou číslo 0, 1 nebo 2!
            updateMcuStatusUI(payload.lastSeen, payload.status);
        }
    });
}