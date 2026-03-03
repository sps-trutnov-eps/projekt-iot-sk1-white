// public/js/pages/servers/serverManager.js

// Globální proměnná pro uchování aktuálních dat (využívá ji modalManager.js pro editaci)
export let currentServersData = [];

// Helper pro bezpečné vložení textu s apostrofy do onclick atributů
function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Skeleton loader - zobrazí se při načítání dat
function showLoadingState() {
    const container = document.getElementById('servers-container');
    if (container) {
        container.innerHTML = `
            <div class="server-block animate-pulse">
                <div class="bg-white rounded-t-xl shadow-sm border border-ash-grey-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div class="flex items-center gap-5">
                        <div class="w-14 h-14 bg-ash-grey-200 rounded-xl"></div>
                        <div>
                            <div class="h-6 bg-ash-grey-200 rounded w-48 mb-2"></div>
                            <div class="flex items-center gap-4 mt-1">
                                <div class="h-6 bg-ash-grey-100 rounded w-24"></div>
                                <div class="h-6 bg-ash-grey-100 rounded w-16"></div>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 w-full md:w-auto">
                        <div class="h-10 bg-ash-grey-100 rounded-lg w-32"></div>
                        <div class="h-10 bg-ash-grey-100 rounded-lg w-12"></div>
                        <div class="h-10 bg-ash-grey-100 rounded-lg w-12"></div>
                    </div>
                </div>
                <div class="bg-ash-grey-50 rounded-b-xl shadow-sm border border-ash-grey-200 border-t-0 p-6 w-full">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="bg-white border border-ash-grey-100 rounded-xl p-5 min-h-[130px]">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-10 h-10 bg-ash-grey-100 rounded-lg"></div>
                                <div class="h-5 bg-ash-grey-100 rounded w-24"></div>
                            </div>
                            <div class="h-8 bg-ash-grey-50 rounded w-full"></div>
                        </div>
                        <div class="bg-white border border-ash-grey-100 rounded-xl p-5 min-h-[130px] hidden md:block">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-10 h-10 bg-ash-grey-100 rounded-lg"></div>
                                <div class="h-5 bg-ash-grey-100 rounded w-32"></div>
                            </div>
                            <div class="h-8 bg-ash-grey-50 rounded w-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Chybový nebo prázdný stav s Inbox ikonou
function showErrorOrEmptyState(message, subMessage) {
    const container = document.getElementById('servers-container');
    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-center">
                <div class="w-24 h-24 bg-ash-grey-100 rounded-full flex items-center justify-center mb-5 text-ash-grey-400 shadow-inner">
                    <i class="fas fa-inbox text-4xl"></i>
                </div>
                <h2 class="text-xl font-bold text-midnight-violet-900">${message}</h2>
                <p class="text-ash-grey-500 mt-2 max-w-sm">${subMessage}</p>
                <button onclick="window.loadServers()" class="mt-6 px-5 py-2.5 bg-white border border-ash-grey-200 text-midnight-violet-900 font-semibold rounded-lg hover:bg-ash-grey-50 transition-colors shadow-sm flex items-center gap-2">
                    <i class="fas fa-sync-alt text-silver-500"></i> Zkusit znovu
                </button>
            </div>
        `;
    }
}

// Hlavní funkce pro načtení a vykreslení serverů
export async function loadServers(isBackground = false) {
    const container = document.getElementById('servers-container');
    if (!container) return;

    if (!isBackground) {
        showLoadingState();
    }

    try {
        const response = await fetch('/server/all'); 
        
        if (!response.ok) throw new Error("API server neodpověděl správně.");

        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            currentServersData = result.data; // Uložení do globální paměti pro modály
            container.innerHTML = ''; 
            
            result.data.forEach(server => {
                const isOnline = (server.status === 'online' || server.status === 1);
                const isDatabase = (server.type === 'database');
                
                // --- Generování příkazů ---
                let commandsHtml = '';
                if (server.commands && server.commands.length > 0) {
                    server.commands.forEach(cmd => {
                        const safeCmdName = escapeQuotes(cmd.name);
                        commandsHtml += `
                            <div class="group relative bg-white border border-ash-grey-200 rounded-xl p-5 hover:border-vintage-grape-400 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[130px]" data-cmd-id="${cmd.id}">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 bg-silver-50 border border-ash-grey-100 rounded-lg flex items-center justify-center shrink-0">
                                        <i class="fas ${cmd.icon || 'fa-terminal text-silver-600'} text-sm"></i>
                                    </div>
                                    <span class="font-bold text-midnight-violet-900 text-base truncate">${cmd.name}</span>
                                </div>
                                <p class="mt-4 text-[11px] font-mono text-ash-grey-500 truncate bg-ash-grey-50 px-3 py-2 rounded border border-ash-grey-100">
                                    ${cmd.value}
                                </p>
                                <div class="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button class="p-1.5 bg-white text-silver-500 hover:text-vintage-grape-600 rounded border border-ash-grey-200 shadow-sm" title="Spustit" onclick="window.runCommand(${cmd.id})">
                                        <i class="fas fa-play text-xs"></i>
                                    </button>
                                    <button class="p-1.5 bg-white text-silver-500 hover:text-vintage-grape-600 rounded border border-ash-grey-200" title="Upravit" onclick="window.openEditCommandModal(${server.id}, ${cmd.id})">
                                        <i class="fas fa-edit text-xs"></i>
                                    </button>
                                    <button class="p-1.5 bg-white text-silver-500 hover:text-red-500 rounded border border-ash-grey-200" title="Smazat" onclick="window.openDeleteModal(${cmd.id}, 'command', '${safeCmdName}')">
                                        <i class="fas fa-trash text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    commandsHtml = `
                        <div class="flex items-center justify-center p-6 border-2 border-dashed border-ash-grey-200 rounded-xl text-ash-grey-400 bg-white/50 min-h-[130px] col-span-full">
                            <span class="text-[11px] font-medium">Tento server nemá další akce</span>
                        </div>
                    `;
                }

                // --- Generování celého bloku serveru ---
                const safeServerName = escapeQuotes(server.name);
                const serverHtml = `
                    <div class="server-block" data-id="${server.id}">
                        <div class="bg-white rounded-t-xl shadow-sm border border-ash-grey-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                            <div class="flex items-center gap-5">
                                <div class="w-14 h-14 rounded-xl flex items-center justify-center shadow-md shrink-0 ${isDatabase ? 'bg-gradient-to-br from-ash-grey-500 to-silver-600' : 'bg-gradient-to-br from-midnight-violet-700 to-vintage-grape-600'}">
                                    <i class="fas ${isDatabase ? 'fa-database' : 'fa-server'} text-2xl text-white"></i>
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold text-midnight-violet-900">${server.name}</h2>
                                    <div class="flex items-center gap-4 mt-1 text-sm text-silver-600">
                                        <span class="flex items-center gap-1 font-mono bg-ash-grey-100 px-2 py-0.5 rounded border border-ash-grey-200">
                                            <i class="fas fa-network-wired text-xs"></i> ${server.ip}
                                        </span>
                                        ${isOnline 
                                            ? `<span class="flex items-center gap-1 text-green-600 font-medium"><i class="fas fa-circle text-[8px] animate-pulse"></i> Online</span>` 
                                            : `<span class="flex items-center gap-1 text-red-500 font-medium"><i class="fas fa-circle text-[8px]"></i> Offline</span>`
                                        }
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex gap-2 w-full md:w-auto">
                                <button onclick="window.openAddCommandModal(${server.id})" class="flex-1 md:flex-none px-4 py-2 bg-vintage-grape-50 border border-vintage-grape-200 text-vintage-grape-700 font-semibold rounded-lg hover:bg-vintage-grape-100 transition-colors shadow-sm flex items-center justify-center gap-2" title="Nová akce">
                                    <i class="fas fa-plus"></i> Nová akce
                                </button>
                                <button onclick="window.openEditServerModal(${server.id})" class="flex-none px-4 py-2 bg-white border border-ash-grey-300 text-midnight-violet-900 font-semibold rounded-lg hover:bg-ash-grey-50 transition-colors shadow-sm" title="Upravit server">
                                    <i class="fas fa-pen text-silver-400"></i>
                                </button>
                                <button onclick="window.openDeleteModal(${server.id}, 'server', '${safeServerName}')" class="flex-none px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors shadow-sm" title="Smazat server">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>

                        <div class="bg-ash-grey-100/50 rounded-b-xl shadow-sm border border-ash-grey-200 border-t-0 p-6 w-full">
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                ${commandsHtml}
                            </div>
                        </div>
                    </div>
                `;
                
                container.insertAdjacentHTML('beforeend', serverHtml);
            });

        } else if (result.success && (!result.data || result.data.length === 0)) {
            currentServersData = [];
            showErrorOrEmptyState("Zatím tu nic není", "Seznam serverů je prázdný. Přidej svůj první server přes tlačítko v levém menu.");
        } else {
            showErrorOrEmptyState("Data se nepodařilo načíst", result.message || "Server hlásí neznámou chybu.");
        }
    } catch (error) {
        console.error("Chyba loadServers:", error);
        showErrorOrEmptyState("Chyba při komunikaci", "Nepodařilo se připojit k backendu. Zkontrolujte připojení nebo zkuste obnovit stránku.");
    }
}