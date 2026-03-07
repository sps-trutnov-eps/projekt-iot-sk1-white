/**
 * COMMAND MANAGER - UI logika příkazů
 */
export const CommandManager = {
    render() {
        const grid = document.getElementById('commandsGrid');
        if (!grid) return;
        
        const commands = window.DashboardManager.favoriteCommands;
        
        if (commands.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-ash-grey-200 rounded-xl text-ash-grey-400 min-h-[150px]">
                    <i class="far fa-star text-3xl mb-3 text-ash-grey-300"></i>
                    <span class="text-sm font-medium">Zatím nemáš žádné oblíbené zkratky.</span>
                    <span class="text-xs mt-1 text-ash-grey-400">Přidej si je pomocí hvězdičky v sekci Serverů.</span>
                </div>
            `;
            return;
        }

        grid.innerHTML = commands.map(item => {
            const safeName = window.DashboardManager.escapeQuotes(item.name);
            const iconClass = item.type === 'wol' ? 'fa-power-off' : (item.icon || 'fa-terminal');
            const serverNameText = item.server_name || "Neznámý server";
            const cmdValue = item.value || item.command;
            
            return `
                <div class="fav-card relative bg-white border border-vintage-grape-200 rounded-[14px] p-4 shadow-sm flex flex-col justify-between min-h-[120px]" data-cmd-id="${item.id}">
                    <div class="flex items-center justify-between mb-4 pr-1"> 
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-[#e6e6e6] rounded-[10px] flex items-center justify-center shrink-0">
                                <i class="fas ${iconClass} text-gray-700 text-sm"></i>
                            </div>
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-gray-900 text-base truncate max-w-[120px] md:max-w-[150px]">${item.name}</span>
                                    <button onclick="window.toggleFavOnDashboard(event, ${item.id})" class="focus:outline-none transition-transform hover:scale-110" title="Odebrat z oblíbených">
                                        <i class="fas fa-star text-yellow-400 text-sm"></i>
                                    </button>
                                </div>
                                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">${serverNameText}</span>
                            </div>
                        </div>
                        <div class="flex gap-1.5 shrink-0">
                            <button class="w-8 h-8 flex items-center justify-center bg-[#f0f0f0] border border-[#d1d1d1] text-gray-600 hover:bg-gray-200 hover:text-green-600 rounded-md transition-colors" onclick="window.runCommand(${item.id}, this)">
                                <i class="fas fa-play text-[10px] ml-0.5"></i>
                            </button>
                            <button class="w-8 h-8 flex items-center justify-center bg-[#f0f0f0] border border-[#d1d1d1] text-gray-600 hover:bg-gray-200 rounded-md transition-colors" onclick="window.handleEditClick(${item.id})">
                                <i class="fas fa-edit text-xs"></i>
                            </button>
                            <button class="w-8 h-8 flex items-center justify-center bg-[#f0f0f0] border border-[#d1d1d1] text-gray-600 hover:bg-gray-200 hover:text-red-500 rounded-md transition-colors" onclick="window.handleDeleteClick(${item.id}, '${safeName}')">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mt-auto">
                        <p class="text-[12px] font-mono text-gray-500 truncate bg-[#e2e2e2] px-3 py-2 rounded-md border border-[#c4c4c4]">
                            ${cmdValue}
                        </p>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// --- GLOBÁLNÍ FUNKCE PRO HTML ---

window.runCommand = async (id, btnElement) => {
    if (btnElement && btnElement.disabled) return;
    let originalHtml = btnElement ? btnElement.innerHTML : '';
    if (btnElement) {
        btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin text-[10px] ml-0.5"></i>';
        btnElement.disabled = true;
    }
    try {
        const response = await fetch(`/command/run/${id}`, { method: 'POST' });
        const result = await response.json();
        const icon = result.success ? 'fa-check text-green-500' : 'fa-times text-red-500';
        if (btnElement) {
            btnElement.innerHTML = `<i class="fas ${icon} text-[10px] ml-0.5"></i>`;
            setTimeout(() => { btnElement.innerHTML = originalHtml; btnElement.disabled = false; }, 2000);
        }
    } catch (err) {
        if (btnElement) {
            btnElement.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-[10px] ml-0.5"></i>';
            setTimeout(() => { btnElement.innerHTML = originalHtml; btnElement.disabled = false; }, 2000);
        }
    }
};

window.handleEditClick = (id) => {
    const item = window.DashboardManager.favoriteCommands.find(c => c.id == id);
    if (!item || !window.editModal) return;

    window.editModal.clear();
    
    // 1. NAPLNĚNÍ SELECTU (Synchronně z dat v DashboardManageru)
    const select = document.getElementById('editCommandServer');
    if (select) {
        // Vygenerujeme optiony
        select.innerHTML = window.DashboardManager.availableServers.map(s => 
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
        
        // 2. DŮLEŽITÉ: Nastavení správného serveru (použijeme server_id nebo serverId)
        const targetServerId = item.server_id || item.serverId || "";
        select.value = targetServerId;
    }

    const cmdValue = item.value || item.command;
    document.getElementById('editCommandId').value = item.id;
    document.getElementById('editCommandName').value = item.name;
    document.getElementById('editCommandType').value = item.type || 'shell';
    
    // Logika zobrazení Shell vs WoL
    const isWol = item.type === 'wol';
    const shellWrapper = document.getElementById('editShellInputWrapper');
    const wolWrapper = document.getElementById('editWolInputWrapper');

    if (shellWrapper && wolWrapper) {
        shellWrapper.classList.toggle('hidden', isWol);
        wolWrapper.classList.toggle('hidden', !isWol);
    }

    if (isWol) {
        const macInput = document.getElementById('editCommandMac');
        if (macInput) macInput.value = cmdValue;
    } else {
        const valInput = document.getElementById('editCommandValue');
        if (valInput) valInput.value = cmdValue;
    }

    window.editModal.open();
};

window.handleDeleteClick = (id, name) => {
    if (!window.deleteModal) return;
    window.deleteModal.clear();
    document.getElementById('deleteTargetId').value = id;
    document.getElementById('deleteTargetType').value = 'command'; 
    document.getElementById('deleteTargetName').textContent = name;
    window.deleteModal.open();
};

window.toggleFavOnDashboard = async (event, commandId) => {
    if (event) event.stopPropagation();
    const card = document.querySelector(`.fav-card[data-cmd-id="${commandId}"]`);
    if (card) card.style.display = 'none';

    try {
        const res = await fetch(`/command/${commandId}/favorite`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await res.json();
        if (result.success) window.DashboardManager.loadData();
        else if (card) card.style.display = 'block';
    } catch (e) {
        if (card) card.style.display = 'block';
    }
};

window.CommandManager = CommandManager;