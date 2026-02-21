import { getMcuId } from './utils.js';
import { updateMcuStatusUI } from './mcuManager.js';
// liveData.js

export async function initLiveData() {
    const socket = io(); 

    socket.on('connect', () => {
        
        // 1. Získáme ID konkrétního MCU
        const currentMcuId = getMcuId();
        
        // 2. Pošleme serveru žádost o připojení do místnosti pro toto konkrétní MCU
        socket.emit('subscribe_mcu', currentMcuId); 
    });

    // 3. Nasloucháme na nová naměřená data
    // Uvnitř funkce initLiveData()
    socket.on('live_reading', (payload) => {
        // 1. Najdeme prvek na kartičce podle jeho ID
        const valueElement = document.getElementById(`card-value-${payload.channelId}`);
        
        // 2. Pokud prvek existuje, tiše přepíšeme hodnotu
        if (valueElement) {
            valueElement.innerText = payload.value;
        }
    });

    // Nasloucháme na událost z backendu
        socket.on('mcu_status', (payload) => {
            
            // OPRAVA TADY: Získáme aktuální ID bezpečně přímo z URL při každé zprávě
            const currentMcuId = getMcuId(); 
            
            if (payload.mcuId == currentMcuId) {
                // Posíláme do UI i ten vynucený status ze socketu
                const isOnlineForce = (payload.status === 1 || payload.status === true);
                updateMcuStatusUI(payload.lastSeen, isOnlineForce);
            }
        });

}