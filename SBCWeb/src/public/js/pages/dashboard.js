document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializace spojení se serverem
    // (Jelikož voláme io() bez parametrů, automaticky se připojí na hostitele, ze kterého běží stránka)
    const socket = io();

    // 2. Zachycení DOM elementů (tvých kartiček)
    const elActiveMCUs = document.getElementById('statActiveMCUs');
    const elConnectedSensors = document.getElementById('statConnectedSensors');
    const elDataPoints = document.getElementById('statDataPoints');
    const elAlerts = document.getElementById('statAlerts');

    // 3. Lokální stav (State) pro ukládání aktuálních čísel, abychom je mohli inkrementovat
    let currentStats = {
        activeMcus: 0,
        totalSensors: 0,
        dataPointsToday: 0,
        alertsToday: 0
    };

    // Pomocná funkce pro vypsání dat do HTML
    const renderStats = () => {
        if (elActiveMCUs) elActiveMCUs.innerText = currentStats.activeMcus;
        if (elConnectedSensors) elConnectedSensors.innerText = currentStats.totalSensors;
        if (elDataPoints) elDataPoints.innerText = currentStats.dataPointsToday;
        if (elAlerts) elAlerts.innerText = currentStats.alertsToday;
    };

    // --- SOCKET EVENTY ---

    // A) Po úspěšném připojení
    socket.on('connect', () => {
        console.log('[Dashboard] Připojeno k WebSocket serveru.');
        
        // Přihlásíme se k odběru všech dat (nastaveno na backendu)
        socket.emit('subscribe_all');
        
        // Vyžádáme si aktuální čísla z DB pro prvotní zobrazení
        socket.emit('request_dashboard_stats');
    });

    // B) Příjem počátečních dat z backendu
    socket.on('dashboard_stats_update', (stats) => {
        console.log('[Dashboard] Přijata úvodní data:', stats);
        
        // Přepíšeme náš lokální stav daty ze serveru
        currentStats.activeMcus = stats.activeMcus ?? 0;
        currentStats.totalSensors = stats.totalSensors ?? 0;
        currentStats.dataPointsToday = stats.dataPointsToday ?? 0;
        currentStats.alertsToday = stats.alertsToday ?? 0;
        
        renderStats();
    });

    // C) ŽIVÉ UPDATY (Inkrementace)
    
 

    // Nový Alert (přičteme +1 do Alerts)
    socket.on('system_alert', (payload) => {
        currentStats.alertsToday += 1;
        if (elAlerts) elAlerts.innerText = currentStats.alertsToday;
    });

    // Změna stavu MCU (online / offline)
    socket.on('mcu_status', (payload) => {
        // Zde je nejbezpečnější požádat server o přepočet celkového počtu, 
        // abychom nemuseli složitě řešit, jestli se zapnul, nebo vypnul a vyhnuli se desynchronizaci.
        socket.emit('request_dashboard_stats');
    });

    // D) Ztráta spojení
    socket.on('disconnect', () => {
        console.warn('[Dashboard] Ztraceno spojení se serverem.');
    });
});