// pages/mcus/main.js
import { initDataLoad } from '../../common/loadDataMCUs.js';
import { refreshSidebarStats, refreshTypeStats, initSearchBar } from './filterManager.js';
import { initDashboardSockets } from './liveData.js';
import { initModals } from './modalManager.js';
import { initGlobalEvents } from './eventManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Nastartujeme počáteční data přes utilitu
    await initDataLoad();

    // 2. Nastartujeme statistiky z filtrů
    await refreshSidebarStats();
    await refreshTypeStats();
    initSearchBar(); 

    // 3. Napojíme sockety pro real-time data
    initDashboardSockets();

    // 4. Zaktivujeme modály
    initModals();

    // 5. Zapneme obecné posluchače
    initGlobalEvents();
});