// TODO: Implementuj sidebar toggle funkci
// Elementy:
// - sidebar: document.getElementById('sidebar')
// - mainContent: document.getElementById('mainContent')
// - toggleSidebarBtn: document.getElementById('toggleSidebarBtn')
// - overlay: document.getElementById('sidebarOverlay')


const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const toggleSidebarDesktop = document.getElementById('toggleSidebarDesktop');
const overlay = document.getElementById('sidebarOverlay');

// Sidebar toggle funkce
let sidebarVisible = true; // Sidebar je defaultně zobrazený

toggleSidebarDesktop.addEventListener('click', function() {
  sidebarVisible = !sidebarVisible;
  
  // 1. Skrytí/zobrazení sidebaru
  sidebar.classList.toggle('-translate-x-full');
  
  // 2. Změna marginu main contentu
  mainContent.classList.toggle('lg:ml-64');
  mainContent.classList.toggle('lg:ml-0');
  
  // 3. Otočení šipek
  const icon = toggleSidebarDesktop.querySelector('i');
  if (sidebarVisible) {
    icon.classList.remove('fa-angles-right');
    icon.classList.add('fa-angles-left');
  } else {
    icon.classList.remove('fa-angles-left');
    icon.classList.add('fa-angles-right');
  }
});


// Globální proměnné pro dashboard stats (inicializuj z DB při startu)
window.dashboardLiveStats = {
    uniqueSensors: new Set(),
    dataPointsToday: 0,
    alertsToday: 0
};

function initDashboardSockets() {
    if (!dashboardSocket) {
        dashboardSocket = io();

        dashboardSocket.on('connect', () => {
            console.log("Dashboard připojen k socketům.");
            dashboardSocket.emit('subscribe_all'); 
        });

        // 1. Změna stavu MCU (Active MCUs)
        dashboardSocket.on('mcu_status', (payload) => {
            const isOnline = (payload.status === 1 || payload.status === true);
            updateMcuCardStatus(payload.mcuId, isOnline, payload.lastSeen);
            
            // Po každé změně stavu aktualizujeme i hlavní kartu "Active MCUs"
            // Využijeme k tomu už vypočítanou hodnotu ze sidebar stats
            setTimeout(() => {
                const onlineCount = document.getElementById('countOnline')?.textContent || "0";
                const el = document.getElementById('statActiveMCUs');
                if (el) el.textContent = onlineCount;
            }, 100);
        });

        // 2. Příchozí měření (Connected Sensors & Data Points)
        dashboardSocket.on('live_reading', (payload) => {
            // Data Points: prostá inkrementace
            window.dashboardLiveStats.dataPointsToday++;
            const elData = document.getElementById('statDataPoints');
            if (elData) elData.textContent = window.dashboardLiveStats.dataPointsToday.toLocaleString();

            // Sensors: Použijeme Set, abychom počítali unikátní ID kanálů (channelId)
            if (!window.dashboardLiveStats.uniqueSensors.has(payload.channelId)) {
                window.dashboardLiveStats.uniqueSensors.add(payload.channelId);
                const elSensors = document.getElementById('statConnectedSensors');
                if (elSensors) elSensors.textContent = window.dashboardLiveStats.uniqueSensors.size;
            }
        });

        // 3. Systémové alerty
        dashboardSocket.on('system_alert', (payload) => {
            window.dashboardLiveStats.alertsToday++;
            const elAlerts = document.getElementById('statAlerts');
            if (elAlerts) elAlerts.textContent = window.dashboardLiveStats.alertsToday;
        });
    }
}

async function loadInitialDashboardStats() {
    try {
        // Předpokládám, že máš endpoint, který vrátí sumární data
        const stats = await fetchData('/api/dashboard-summary'); 
        
        if (stats) {
            window.dashboardStats.dataPointsToday = stats.totalReadings || 0;
            window.dashboardStats.alertsToday = stats.totalAlerts || 0;
            // Naplníme Set existujícími senzory z DB
            if (stats.sensorIds) stats.sensorIds.forEach(id => window.dashboardStats.sensors.add(id));

            // Zápis do UI
            document.getElementById('stat-data-points').textContent = window.dashboardStats.dataPointsToday;
            document.getElementById('stat-alerts').textContent = window.dashboardStats.alertsToday;
            document.getElementById('stat-sensors').textContent = window.dashboardStats.sensors.size;
        }
    } catch (err) {
        console.error("Nepodařilo se načíst počáteční statistiky:", err);
    }
}

// Přidej do svého DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... tvůj stávající kód ...
    
    // Propojení Active MCUs karty s počty v sidebaru (po malém zpoždění, až se sidebar spočítá)
    setTimeout(() => {
        const onlineVal = document.getElementById('countOnline')?.textContent || "0";
        const statActive = document.getElementById('statActiveMCUs');
        if (statActive) statActive.textContent = onlineVal;
    }, 1000);
});