/**
 * MCU List Page JavaScript
 * Načítání, filtrování a správa MCU karet
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Elementy
    const mcuGrid = document.getElementById('mcuGrid');
    const searchInput = document.getElementById('searchMCU');
    const filterType = document.getElementById('filterType');
    const filterStatus = document.getElementById('filterStatus');
    const emptyState = document.getElementById('emptyState');
    const emptyAddMCU = document.getElementById('emptyAddMCU');
    
    // Delete modal
    const deleteModal = document.getElementById('deleteModal');
    const deleteCancel = document.getElementById('deleteCancel');
    const deleteConfirm = document.getElementById('deleteConfirm');
    let deleteTargetId = null;

    // Uložené MCU data
    let mcuList = [];

    /**
     * Načte seznam MCU z API
     */
    async function loadMCUs() {
        try {
            const response = await fetch('/mcu');
            const data = await response.json();
            mcuList = data.controllers || [];
            renderMCUs(mcuList);
        } catch (error) {
            console.error('Chyba při načítání MCU:', error);
        }
    }

    /**
     * Vykreslí MCU karty
     */
    function renderMCUs(mcus) {
        // Odstraň existující karty (kromě emptyState)
        const existingCards = mcuGrid.querySelectorAll('.mcu-card');
        existingCards.forEach(card => card.remove());

        if (mcus.length === 0) {
            emptyState?.classList.remove('hidden');
            return;
        }

        emptyState?.classList.add('hidden');

        mcus.forEach(mcu => {
            const card = createMCUCard(mcu);
            mcuGrid.insertBefore(card, emptyState);
        });

        // Připoj event listenery
        attachCardListeners();
    }

    /**
     * Vytvoří HTML kartu pro MCU
     */
    function createMCUCard(mcu) {
        const isOnline = isDeviceOnline(mcu.lastSeen);
        const gradientClass = isOnline 
            ? 'from-midnight-violet-700 to-vintage-grape-600' 
            : 'from-silver-500 to-silver-400';
        const opacityClass = isOnline ? '' : 'opacity-60';
        const statusColor = isOnline ? 'green' : 'red';
        const timeClass = isOnline ? 'text-green-600' : 'text-red-500';

        const card = document.createElement('div');
        card.className = `mcu-card bg-white rounded-lg shadow-sm border border-ash-grey-200 hover:shadow-md transition-shadow ${opacityClass}`;
        card.dataset.id = mcu.id;

        card.innerHTML = `
            <div class="flex items-center p-4">
                <div class="flex items-center space-x-4">
                    <div class="relative">
                        <div class="w-12 h-12 bg-gradient-to-br ${gradientClass} rounded-xl flex items-center justify-center">
                            <i class="fas fa-microchip text-xl text-white"></i>
                        </div>
                        <span class="absolute -bottom-1 -right-1 w-4 h-4 bg-${statusColor}-400 border-2 border-white rounded-full"></span>
                    </div>
                    
                    <div class="min-w-[140px]">
                        <h3 class="font-semibold text-midnight-violet-900">${escapeHtml(mcu.name)}</h3>
                        <span class="text-xs text-silver-500">${escapeHtml(mcu.type || 'Unknown')}</span>
                    </div>
                </div>
                
                <div class="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 mx-6 text-sm">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-network-wired text-silver-400 w-4"></i>
                        <span class="text-silver-700 font-mono">${escapeHtml(mcu.ipAddress || '-')}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-fingerprint text-silver-400 w-4"></i>
                        <span class="text-silver-700 font-mono text-xs">${escapeHtml(mcu.macAddress || '-')}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-map-marker-alt text-silver-400 w-4"></i>
                        <span class="text-silver-700">${escapeHtml(mcu.location || '-')}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-clock text-silver-400 w-4"></i>
                        <span class="${timeClass}">${formatLastSeen(mcu.lastSeen)}</span>
                    </div>
                </div>
                
                <div class="flex items-center space-x-2">
                    <button class="view-data-btn w-9 h-9 text-vintage-grape-600 hover:bg-vintage-grape-50 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Zobrazit data">
                        <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="edit-mcu-btn w-9 h-9 text-silver-600 hover:bg-ash-grey-100 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Upravit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="delete-mcu-btn w-9 h-9 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Smazat">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Připojí event listenery na karty
     */
    function attachCardListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-mcu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                openEditModal(id);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-mcu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                openDeleteModal(id);
            });
        });

        // View data buttons
        document.querySelectorAll('.view-data-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                window.location.href = `/mcu/${id}/data`;
            });
        });
    }

    /**
     * Otevře modal pro editaci MCU
     */
    function openEditModal(id) {
        const mcu = mcuList.find(m => m.id == id);
        if (!mcu) return;

        // Naplň formulář daty
        document.getElementById('mcuName').value = mcu.name || '';
        document.getElementById('mcuType').value = mcu.type || '';
        document.getElementById('mcuIP').value = mcu.ipAddress || '';
        document.getElementById('mcuMAC').value = mcu.macAddress || '';
        document.getElementById('mcuLocation').value = mcu.location || '';
        document.getElementById('mcuDescription').value = mcu.description || '';

        // Nastav edit mode (můžeš přidat hidden input nebo data atribut)
        const form = document.getElementById('MCUForm');
        if (form) {
            form.dataset.editId = id;
        }

        // Otevři modal
        const modal = document.getElementById('MCUModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Otevře delete confirmation modal
     */
    function openDeleteModal(id) {
        deleteTargetId = id;
        deleteModal?.classList.remove('hidden');
        deleteModal?.classList.add('flex');
    }

    /**
     * Zavře delete modal
     */
    function closeDeleteModal() {
        deleteTargetId = null;
        deleteModal?.classList.add('hidden');
        deleteModal?.classList.remove('flex');
    }

    /**
     * Smaže MCU
     */
    async function deleteMCU(id) {
        try {
            const response = await fetch(`/mcu/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                closeDeleteModal();
                loadMCUs(); // Reload seznam
            } else {
                const data = await response.json();
                alert(data.message || 'Chyba při mazání MCU');
            }
        } catch (error) {
            console.error('Chyba při mazání MCU:', error);
            alert('Něco se pokazilo. Zkuste to znovu.');
        }
    }

    /**
     * Filtruje MCU seznam
     */
    function filterMCUs() {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const typeFilter = filterType?.value || '';
        const statusFilter = filterStatus?.value || '';

        const filtered = mcuList.filter(mcu => {
            // Search filter
            const matchesSearch = !searchTerm || 
                mcu.name?.toLowerCase().includes(searchTerm) ||
                mcu.ipAddress?.toLowerCase().includes(searchTerm) ||
                mcu.macAddress?.toLowerCase().includes(searchTerm) ||
                mcu.location?.toLowerCase().includes(searchTerm);

            // Type filter
            const matchesType = !typeFilter || mcu.type === typeFilter;

            // Status filter
            const isOnline = isDeviceOnline(mcu.lastSeen);
            const matchesStatus = !statusFilter || 
                (statusFilter === 'online' && isOnline) ||
                (statusFilter === 'offline' && !isOnline);

            return matchesSearch && matchesType && matchesStatus;
        });

        renderMCUs(filtered);
    }

    // Helper funkce
    function isDeviceOnline(lastSeen) {
        if (!lastSeen) return false;
        const lastSeenDate = new Date(lastSeen);
        const now = new Date();
        const diffMinutes = (now - lastSeenDate) / (1000 * 60);
        return diffMinutes < 5; // Online pokud aktivní v posledních 5 minutách
    }

    function formatLastSeen(lastSeen) {
        if (!lastSeen) return 'Nikdy';
        
        const date = new Date(lastSeen);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'právě teď';
        if (diffMinutes < 60) return `před ${diffMinutes} min`;
        if (diffHours < 24) return `před ${diffHours} hod`;
        return `před ${diffDays} dny`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event Listeners
    searchInput?.addEventListener('input', filterMCUs);
    filterType?.addEventListener('change', filterMCUs);
    filterStatus?.addEventListener('change', filterMCUs);

    deleteCancel?.addEventListener('click', closeDeleteModal);
    deleteConfirm?.addEventListener('click', () => {
        if (deleteTargetId) {
            deleteMCU(deleteTargetId);
        }
    });

    emptyAddMCU?.addEventListener('click', () => {
        document.getElementById('MCUOpen')?.click();
    });

    // Ghost card pro přidání MCU
    const addMCUCard = document.getElementById('addMCUCard');
    addMCUCard?.addEventListener('click', () => {
        document.getElementById('MCUOpen')?.click();
    });

    // Escape zavře delete modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !deleteModal?.classList.contains('hidden')) {
            closeDeleteModal();
        }
    });

    // Initial load
    loadMCUs();

});
