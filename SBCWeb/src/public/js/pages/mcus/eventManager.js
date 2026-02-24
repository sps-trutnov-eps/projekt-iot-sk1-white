// pages/mcus/eventManager.js
import { applyFilters, refreshSidebarStats, refreshTypeStats } from './filterManager.js';
import { refreshMCUs, refreshTypes } from '../../common/loadDataMCUs.js';

export function initGlobalEvents() {
    const gridElement = document.getElementById('mcuGrid');
    if (gridElement) {
        gridElement.addEventListener('click', (e) => {
            const card = e.target.closest('.mcu-card');
            if (!card) return;
            if (e.target.closest('button')) return; 

            const mcuId = card.dataset.id;
            window.location.href = `/mcu/${mcuId}`;
        });
    }

    const refreshAll = document.getElementById('refreshAll');
    if (refreshAll) {
        refreshAll.addEventListener('click', async (e) => {
            e.preventDefault();
            const icon = refreshAll.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            refreshAll.classList.add('opacity-50', 'pointer-events-none');

            try {
                await Promise.all([
                    refreshMCUs(),      
                    refreshTypes(),     
                    refreshSidebarStats(),    
                    refreshTypeStats()        
                ]);
                
                refreshAll.classList.add('text-green-500');
                setTimeout(() => {
                    refreshAll.classList.remove('text-green-500');
                    applyFilters();
                }, 500);
            } catch (error) {
                console.error("Chyba při hromadném refreshy:", error);
            } finally {
                if (icon) icon.classList.remove('fa-spin');
                refreshAll.classList.remove('opacity-50', 'pointer-events-none');
            }
        });
    }
}