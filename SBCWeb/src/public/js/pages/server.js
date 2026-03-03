document.addEventListener('DOMContentLoaded', () => {
    loadServers();
});

// Zástupná data/HTML při načítání (žádný točící se spinner)
function showLoadingState() {
    const container = document.getElementById('servers-container');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center animate-pulse">
            <i class="fas fa-server text-5xl text-ash-grey-200 mb-4"></i>
            <h2 class="text-lg font-bold text-ash-grey-400">Načítám servery...</h2>
            <p class="text-ash-grey-300 mt-2 text-sm">Prosím o strpení, získávám data z databáze.</p>
        </div>
    `;
}

async function loadServers(isBackground = false) {
    const container = document.getElementById('servers-container');
    if (!container) return;

    if (!isBackground) {
        showLoadingState();
    }

    try {
        // Tuto routu si musíš vytvořit v backendu!
        const response = await fetch('/api/servers'); 
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            container.innerHTML = ''; // Vyčistíme kontejner
            
            result.data.forEach(server => {
                const isOnline = (server.status === 'online' || server.status === 1);
                const isDatabase = (server.type === 'database');
                
                // --- Generování příkazů ---
                let commandsHtml = '';
                if (server.commands && server.commands.length > 0) {
                    server.commands.forEach(cmd => {
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
                                    <button class="p-1.5 bg-white text-silver-500 hover:text-vintage-grape-600 rounded border border-ash-grey-200 shadow-sm" title="Spustit" onclick="window.runCommand(${cmd.id})"><i class="fas fa-play text-xs"></i></button>
                                    <button class="p-1.5 bg-white text-silver-500 hover:text-vintage-grape-600 rounded border border-ash-grey-200" title="Upravit"><i class="fas fa-edit text-xs"></i></button>
                                    <button class="p-1.5 bg-white text-silver-500 hover:text-red-500 rounded border border-ash-grey-200" title="Smazat"><i class="fas fa-trash text-xs"></i></button>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    commandsHtml = `
                        <div class="flex items-center justify-center p-6 border-2 border-dashed border-ash-grey-200 rounded-xl text-ash-grey-400 bg-white/50 min-h-[130px] col-span-full">
                            <span class="text-xs font-semibold">Tento server nemá další akce</span>
                        </div>
                    `;
                }

                // --- Generování celého bloku serveru ---
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
                                <button class="flex-none px-4 py-2 bg-white border border-ash-grey-300 text-midnight-violet-900 font-semibold rounded-lg hover:bg-ash-grey-50 transition-colors shadow-sm" title="Upravit server">
                                    <i class="fas fa-pen text-silver-400"></i>
                                </button>
                                <button class="flex-none px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors shadow-sm" title="Smazat server">
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
                
                // Přidání bloku do kontejneru po jednom (stejně jako v loadSensors)
                container.insertAdjacentHTML('beforeend', serverHtml);
            });

        } else {
            // Pokud přijde úspěch, ale pole je prázdné
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center">
                    <i class="fas fa-server text-6xl text-ash-grey-300 mb-4"></i>
                    <h2 class="text-xl font-bold text-midnight-violet-900">Zatím tu nejsou žádné servery</h2>
                    <p class="text-ash-grey-500 mt-2">Přidej svůj první server pomocí tlačítka v levém menu.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Chyba loadServers:", error);
        container.innerHTML = `
            <div class="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p class="font-bold">Nepodařilo se načíst data.</p>
            </div>
        `;
    }
}

// Globální funkce (připojené na window, abys je mohl volat z onclick atributů HTML)
window.openAddCommandModal = function(serverId) {
    console.log("Otevírám modal pro server ID:", serverId);
    const modal = document.getElementById('addCommandModal');
    if(modal) {
        // Můžeš si tady nastavit ID serveru do nějakého input hidden fieldu
        modal.classList.remove('hidden');
    }
}

window.runCommand = function(cmdId) {
    console.log("Spouštím příkaz s ID:", cmdId);
    // Zde bude logika pro socket.emit nebo fetch
}