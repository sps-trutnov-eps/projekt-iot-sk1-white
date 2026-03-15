import { DashboardManager } from './dashboardManager.js';
import { CommandManager } from './commandManager.js';
import { DashboardModals } from './modalManager.js';

/**
 * DASHBOARD MAIN - Vstupní bod
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Registrace modalů
    window.addCommandModal = Modal.register('addCommand');
    window.addServerModal = Modal.register('addServer');
    window.editModal = Modal.register('editCommand');
    window.deleteModal = Modal.register('delete');

    // 2. Inicializace modulů
    DashboardManager.init();
    DashboardModals.init();

    // 3. Logika pro formulářové eventy (přepínání Shell/WoL)
    const editTypeSelect = document.getElementById('editCommandType');
    if (editTypeSelect) {
        editTypeSelect.addEventListener('change', (e) => {
            const isWol = e.target.value === 'wol';
            document.getElementById('editShellInputWrapper').classList.toggle('hidden', isWol);
            document.getElementById('editWolInputWrapper').classList.toggle('hidden', !isWol);
        });
    }

    // 4. WebSocket Spojení pro statistiky
    const socket = io();
    let currentStats = { activeMcus: 0, totalSensors: 0, dataPointsToday: 0, alertsToday: 0 };

    const renderStats = () => {
        const ids = ['statActiveMCUs', 'statConnectedSensors', 'statDataPoints', 'statAlerts'];
        const keys = ['activeMcus', 'totalSensors', 'dataPointsToday', 'alertsToday'];
        ids.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.innerText = currentStats[keys[i]];
        });
    };

    socket.on('connect', () => {
        console.log('[Socket] Připojeno k dashboardu.');
        socket.emit('subscribe_all');
        socket.emit('request_dashboard_stats');
    });

    socket.on('dashboard_stats_update', (stats) => {
        Object.assign(currentStats, stats);
        renderStats();
    });

    socket.on('system_alert', () => {
        socket.emit('request_dashboard_stats');
    });

    socket.on('mcu_status', () => {
        socket.emit('request_dashboard_stats');
    });

    socket.on('alerts_changed', () => {
        socket.emit('request_dashboard_stats');
    });


});