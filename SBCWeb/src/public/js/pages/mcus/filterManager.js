// pages/mcus/filterManager.js
import { state } from './state.js';
import { fetchData } from '../../common/loadDataMCUs.js';

export function applyFilters() {
    const cards = document.querySelectorAll('.mcu-card');
    const searchTerm = state.filters.search.toLowerCase();
    
    cards.forEach(card => {
        const typeId = card.dataset.type;
        const cardStatus = card.dataset.status || 'offline'; 
        
        const nameElement = card.querySelector('h3');
        const ipElement = card.querySelector('.font-mono');
        
        const name = nameElement ? nameElement.textContent.toLowerCase() : '';
        const ip = ipElement ? ipElement.textContent.toLowerCase() : '';

        const matchesSearch = name.includes(searchTerm) || ip.includes(searchTerm);
        const matchesType = state.filters.type === 'all' || typeId === String(state.filters.type);

        let matchesStatus = true;
        if (state.filters.status !== 'all') {
            matchesStatus = (cardStatus === state.filters.status);
        }

        card.classList.toggle('hidden', !(matchesSearch && matchesType && matchesStatus));
    });
}

export async function refreshSidebarStats() {
    try {
        const mcus = await fetchData('/mcu/mcus');
        if (!mcus || !Array.isArray(mcus)) return;
        
        const stats = mcus.reduce((acc, mcu) => {
            if (mcu.isOnline === 1 || mcu.isOnline === true) acc.online++;
            else if (mcu.isOnline === 2) acc.warning++; // Přejmenováno pro statistiky
            else acc.offline++;
            return acc;
        }, { online: 0, offline: 0, warning: 0 }); // Výchozí warning

        const elAll = document.getElementById('countAll');
        const elOnline = document.getElementById('countOnline');
        const elOffline = document.getElementById('countOffline');
        const elWarning = document.getElementById('countWarning'); // Upravené ID z countFrozen na countWarning

        if (elAll) elAll.textContent = mcus.length;
        if (elOnline) elOnline.textContent = stats.online;
        if (elOffline) elOffline.textContent = stats.offline;
        if (elWarning) elWarning.textContent = stats.warning;
    } catch (err) {
        console.error("Chyba statistik statusů:", err);
    }
}

export async function refreshTypeStats() {
    const container = document.getElementById('dynamicTypeFilters');
    if (!container) return;

    try {
        const [types, mcus] = await Promise.all([
            fetchData('/type/types'),
            fetchData('/mcu/mcus')
        ]);

        if (!types || !mcus) return;

        window.typeMap = {};
        if (types && Array.isArray(types)) {
            types.forEach(t => {
                window.typeMap[t.id] = t.type;
            });
        }

        const counts = mcus.reduce((acc, mcu) => {
            acc[mcu.type] = (acc[mcu.type] || 0) + 1;
            return acc;
        }, {});

        const isAllActive = state.filters.type === 'all' ? 'bg-midnight-violet-800 text-white active' : '';
        let html = `
            <button class="type-filter w-full flex items-center justify-between px-1 py-1.5 rounded-lg text-ash-grey-400 hover:bg-midnight-violet-800 hover:text-white transition group ${isAllActive}" 
                data-type-id="all">
                <div class="flex items-center space-x-2.5 overflow-hidden flex-1">
                    <i class="fas fa-layer-group text-[10px] text-vintage-grape-400 group-hover:text-vintage-grape-300 flex-shrink-0"></i>
                    <span class="sidebar-text text-[14px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left font-medium">
                        Všechny typy
                    </span>
                </div>
                <span class="text-[12px] bg-midnight-violet-700 text-ash-grey-300 px-2 py-0.5 rounded-md min-w-[22px] text-center ml-4">
                    ${mcus.length}
                </span>
            </button>
        `;

        html += types
            .filter(t => (counts[t.id] || 0) > 0)
            .map(t => {
                const isActive = String(state.filters.type) === String(t.id) ? 'bg-midnight-violet-800 text-white active' : '';
                return `
                    <button class="type-filter w-full flex items-center justify-between px-1 py-1.5 rounded-lg text-ash-grey-400 hover:bg-midnight-violet-800 hover:text-white transition group ${isActive}" 
                        data-type-id="${t.id}">
                        <div class="flex items-center space-x-2.5 overflow-hidden flex-1">
                            <i class="fas fa-microchip text-[10px] text-vintage-grape-400 group-hover:text-vintage-grape-300 flex-shrink-0"></i>
                            <span class="sidebar-text text-[14px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left">
                                ${t.type}
                            </span>
                        </div>
                        <span class="text-[12px] bg-midnight-violet-700 text-ash-grey-300 px-2 py-0.5 rounded-md min-w-[22px] text-center ml-4">
                            ${counts[t.id]}
                        </span>
                    </button>
                `;
            }).join('');

        container.innerHTML = html;
        attachFilterListeners();
    } catch (err) {
        console.error("Chyba generování typů:", err);
    }
}

export function attachFilterListeners() {
    document.querySelectorAll('.type-filter').forEach(btn => {
        btn.onclick = () => {
            state.filters.type = btn.dataset.typeId;
            updateActiveUI(btn, '.type-filter');
            applyFilters();
        };
    });

    document.querySelectorAll('.quick-filter').forEach(btn => {
        btn.onclick = () => {
            state.filters.status = btn.dataset.filter;
            updateActiveUI(btn, '.quick-filter');
            applyFilters();
        };
    });
}

function updateActiveUI(activeBtn, groupSelector) {
    document.querySelectorAll(groupSelector).forEach(b => 
        b.classList.remove('bg-midnight-violet-800', 'text-white', 'active')
    );
    activeBtn.classList.add('bg-midnight-violet-800', 'text-white', 'active');
}

export function initSearchBar() {
    const searchInput = document.getElementById('searchMCU');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        applyFilters();
    });
}