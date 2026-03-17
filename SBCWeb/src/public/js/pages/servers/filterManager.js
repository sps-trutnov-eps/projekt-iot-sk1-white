// pages/servers/filterManager.js
import { state } from './state.js';

export function applyFilters() {
    const blocks = document.querySelectorAll('.server-block');
    const searchTerm = state.filters.search.toLowerCase();

    blocks.forEach(block => {
        const blockStatus = block.dataset.status || 'offline';
        const blockType = block.dataset.type || '';

        const nameElement = block.querySelector('h2');
        const ipElement = block.querySelector('.font-mono');

        const name = nameElement ? nameElement.textContent.toLowerCase() : '';
        const ip = ipElement ? ipElement.textContent.toLowerCase() : '';

        const matchesSearch = name.includes(searchTerm) || ip.includes(searchTerm);
        const matchesType = state.filters.type === 'all' || blockType === state.filters.type;
        const matchesStatus = state.filters.status === 'all' || blockStatus === state.filters.status;

        block.classList.toggle('hidden', !(matchesSearch && matchesType && matchesStatus));
    });
}

export function attachFilterListeners() {
    document.querySelectorAll('.quick-filter').forEach(btn => {
        btn.onclick = () => {
            state.filters.status = btn.dataset.filter;
            updateActiveUI(btn, '.quick-filter');
            applyFilters();
        };
    });

    document.querySelectorAll('.type-filter').forEach(btn => {
        btn.onclick = () => {
            state.filters.type = btn.dataset.typeId;
            updateActiveUI(btn, '.type-filter');
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
    const searchInput = document.getElementById('searchServer');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        applyFilters();
    });
}
