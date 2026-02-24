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

    let dataStatus = 'offline';
    let dotColor = 'bg-red-500';
    let timeColor = 'text-red-500 font-semibold text-xs';
    let statusText = '';
    let pulseEffect = '';

    if (statusVal === 1 || statusVal === true) {
        dataStatus = 'online';
        dotColor = 'bg-green-400';
        pulseEffect = 'animate-pulse';
        timeColor = 'text-green-600 font-medium text-xs';
        statusText = 'Online';
    } else if (statusVal === 2) {
        dataStatus = 'warning'; // Přejmenováno
        dotColor = 'bg-yellow-400'; // Žlutá tečka
        pulseEffect = '';
        timeColor = 'text-yellow-600 font-medium text-xs'; // Žlutý text
        statusText = 'Pasivní'; // Nový text
    }

    card.dataset.status = dataStatus;

    const dot = card.querySelector('.status-dot');
    if (dot) {
        dot.className = `status-dot absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${dotColor} ${pulseEffect}`;
    }

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
        
        if (statusVal === 1 || statusVal === 2) {
            timeSpan.textContent = statusText;
            timeSpan.className = timeColor;
        } else {
            timeSpan.textContent = formattedTime;
            timeSpan.className = timeColor; 
        }
    }

    applyFilters();
    refreshSidebarStats();
}