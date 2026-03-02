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


/*******************************************
    Vykreslování kartiček příkazů
*******************************************/


const commands = [
  { id: 1, title: "Restart Apache", cmd: "sudo systemctl restart apache2", icon: "fa-sync", iconColor: "text-blue-500" },
  { id: 2, title: "Vyčistit logy", cmd: "sudo journalctl --vacuum-time=1d", icon: "fa-broom", iconColor: "text-yellow-600" },
  { id: 3, title: "Update Systému", cmd: "sudo apt update && sudo apt upgrade -y", icon: "fa-download", iconColor: "text-green-600" },
  { id: 5, title: "Update Systému", cmd: "sudo apt update && sudo apt upgrade -y", icon: "fa-download", iconColor: "text-green-600" }
];

function renderCommands() {
  const grid = document.getElementById('commandsGrid');
  
  const cardsHtml = commands.map(item => `
    <div class="group relative bg-silver-50 border border-ash-grey-200 rounded-xl p-5 hover:border-vintage-grape-400 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[130px]">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
          <i class="fas ${item.icon} text-sm ${item.iconColor}"></i>
        </div>
        <span class="font-bold text-midnight-violet-900 text-base truncate">${item.title}</span>
      </div>
      <p class="mt-4 text-[11px] font-mono text-ash-grey-500 truncate bg-ash-grey-100 px-3 py-2 rounded border border-ash-grey-200">${item.cmd}</p>
      
      <div class="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onclick="editCmd(${item.id})" class="p-1.5 bg-white text-silver-500 hover:text-vintage-grape-600 rounded border border-ash-grey-200"><i class="fas fa-edit text-xs"></i></button>
        <button onclick="deleteCmd(${item.id})" class="p-1.5 bg-white text-silver-500 hover:text-red-500 rounded border border-ash-grey-200"><i class="fas fa-trash text-xs"></i></button>
      </div>
    </div>
  `).join('');

  grid.innerHTML = cardsHtml + `
    <button id="addCommandCard" class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-ash-grey-200 rounded-xl text-ash-grey-400 hover:border-vintage-grape-300 hover:text-vintage-grape-400 transition-all min-h-[130px] group">
      <i class="fas fa-plus-circle text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
      <span class="text-xs font-bold uppercase tracking-wider">Přidat novou zkratku</span>
    </button>
  `;
}

renderCommands();