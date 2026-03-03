// pages/mcus/liveData.js
import { applyFilters, refreshSidebarStats } from './filterManager.js';

let dashboardSocket = null;

export function initDashboardSockets() {
    if (!dashboardSocket) {
        dashboardSocket = io();

        dashboardSocket.on('connect', () => {
            console.log("Dashboard připojen k socketům.");
            dashboardSocket.emit('subscribe_all'); 
        });

        dashboardSocket.on('mcu_status', (payload) => {
            updateMcuCardStatus(payload.mcuId, payload.status, payload.lastSeen);
        });
    }
}

function updateMcuCardStatus(mcuId, statusVal, lastSeenStr) {
    const card = document.querySelector(`.mcu-card[data-id="${mcuId}"]`);
    if (!card) return;

    // --- VÝCHOZÍ STAV (OFFLINE - 0) ---
    let dataStatus = 'offline';
    let dotColor = 'bg-red-500'; // Tečka stavu bude červená
    let timeColor = 'text-gray-500 font-medium text-xs'; // OPRAVA: Text času bude neutrální šedý
    let statusText = 'Offline';
    let pulseEffect = '';

    // --- ONLINE (1) ---
    if (statusVal === 1 || statusVal === true) {
        dataStatus = 'online';
        dotColor = 'bg-green-400';
        pulseEffect = 'animate-pulse';
        timeColor = 'text-green-600 font-medium text-xs'; // Zelený text "Online"
        statusText = 'Online';
    } 
    // --- PASSIVE (2) ---
    else if (statusVal === 2) {
        dataStatus = 'frozen'; 
        dotColor = 'bg-yellow-400';
        pulseEffect = '';
        timeColor = 'text-yellow-600 font-medium text-xs'; // Žlutý text "Passive"
        statusText = 'Passive'; 
    }

    card.dataset.status = dataStatus;

    // Aktualizace tečky
    const dot = card.querySelector('.status-dot');
    if (dot) {
        dot.className = `status-dot absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${dotColor} ${pulseEffect}`;
    }

    // Volitelné: Aktualizace i samotné ikonky hodin, aby nebyla zbarvená podle okolí
    const clockIcon = card.querySelector('.fa-clock');
    if (clockIcon) {
        // Nastavíme ikonce fixní šedou barvu pro všechny stavy, ať to vypadá čistě
        clockIcon.className = 'fa-solid fa-clock text-gray-400 mr-1'; 
    }

    // Aktualizace textu času/stavu
    const timeSpan = card.querySelector('.fa-clock')?.nextElementSibling;
    if (timeSpan && lastSeenStr) {
        let dbTime = lastSeenStr;
        if (typeof dbTime === 'string') {
            dbTime = dbTime.replace(' ', 'T');
            if (!dbTime.endsWith('Z')) dbTime += 'Z'; 
        }
        
        const date = new Date(dbTime);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        let formattedTime = "";
        if (isToday) {
            formattedTime = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
            formattedTime = date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) + ' ' + 
                          date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        
        // Změna textu podle stavu
        if (statusVal === 1 || statusVal === 2) {
            timeSpan.textContent = statusText;
            timeSpan.className = timeColor; // Bude zelená nebo žlutá
        } else {
            timeSpan.textContent = formattedTime; // Vypíše přesný čas výpadku
            timeSpan.className = timeColor; // Bude šedá, už ne červená!
        }
    }

    applyFilters();
    refreshSidebarStats();
}