import { getMcuId } from './utils.js';

let currentAssignments = new Set(); // "server:1", "command:5", "mcu:3"

export async function initDeckConfig() {
    const deckSection = document.getElementById('deckConfigSection');
    if (!deckSection) return;

    const mcuId = getMcuId();
    if (!mcuId) return;

    try {
        // Parallel fetch: available entities + current assignments
        const [entitiesRes, assignmentsRes] = await Promise.all([
            fetch('/mcu/deck/entities'),
            fetch(`/mcu/${mcuId}/deck-assignments`)
        ]);

        const entitiesData = await entitiesRes.json();
        const assignmentsData = await assignmentsRes.json();

        if (!entitiesData.success) return;

        // Build current assignment set
        currentAssignments.clear();
        if (assignmentsData.success && Array.isArray(assignmentsData.assignments)) {
            for (const a of assignmentsData.assignments) {
                currentAssignments.add(`${a.entity_type}:${a.entity_id}`);
            }
        }

        renderServers(entitiesData.servers);
        renderMcus(entitiesData.mcus);
        initButtons();
    } catch (e) {
        console.error('[DeckManager] Chyba při načítání:', e);
    }
}

function renderServers(servers) {
    const container = document.getElementById('deckServersList');
    if (!container) return;

    if (!servers || servers.length === 0) {
        container.innerHTML = '<p class="text-center text-silver-400 text-xs py-4">Žádné servery v systému.</p>';
        return;
    }

    container.innerHTML = servers.map(server => {
        const serverChecked = currentAssignments.has(`server:${server.id}`);
        const commandsHtml = (server.commands || []).map(cmd => {
            const cmdChecked = currentAssignments.has(`command:${cmd.id}`);
            return `
                <label class="flex items-center gap-2.5 py-1.5 px-3 rounded hover:bg-ash-grey-50 dark:hover:bg-midnight-violet-800/50 transition-colors cursor-pointer">
                    <input type="checkbox" data-type="command" data-id="${cmd.id}" data-server="${server.id}"
                        ${cmdChecked ? 'checked' : ''}
                        class="deck-checkbox w-4 h-4 accent-vintage-grape-600 rounded cursor-pointer">
                    <span class="text-sm text-gray-700 dark:text-silver-300">${cmd.name}</span>
                    <span class="text-[10px] text-silver-400 uppercase ml-auto">${cmd.type}</span>
                </label>
            `;
        }).join('');

        return `
            <div class="border border-ash-grey-200 dark:border-midnight-violet-700 rounded-lg overflow-hidden">
                <div class="flex items-center gap-3 p-3 bg-ash-grey-50 dark:bg-midnight-violet-800/50">
                    <label class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:bg-ash-grey-100 dark:hover:bg-midnight-violet-800 rounded transition-colors">
                        <input type="checkbox" data-type="server" data-id="${server.id}"
                            ${serverChecked ? 'checked' : ''}
                            class="deck-checkbox deck-server-checkbox w-4.5 h-4.5 accent-vintage-grape-600 rounded cursor-pointer">
                        <i class="fas fa-server text-xs text-vintage-grape-500"></i>
                        <span class="font-semibold text-sm text-midnight-violet-900 dark:text-silver-100 truncate">${server.name}</span>
                        <span class="text-xs font-mono text-silver-400 ml-auto">${server.ip}</span>
                    </label>
                    <div class="flex items-center gap-1 shrink-0">
                        <button data-server-check="${server.id}" title="Zaškrtnout vše"
                            class="w-7 h-7 flex items-center justify-center rounded bg-vintage-grape-100 dark:bg-vintage-grape-900/30 text-vintage-grape-600 dark:text-vintage-grape-300 hover:bg-vintage-grape-200 dark:hover:bg-vintage-grape-900/50 transition-colors">
                            <i class="fas fa-check-double text-[10px]"></i>
                        </button>
                        <button data-server-uncheck="${server.id}" title="Odškrtnout vše"
                            class="w-7 h-7 flex items-center justify-center rounded bg-ash-grey-100 dark:bg-midnight-violet-800 text-silver-500 hover:bg-ash-grey-200 dark:hover:bg-midnight-violet-700 transition-colors">
                            <i class="fas fa-times text-[10px]"></i>
                        </button>
                    </div>
                </div>
                ${commandsHtml ? `<div class="pl-6 pr-2 py-1 border-t border-ash-grey-100 dark:border-midnight-violet-700 space-y-0.5">${commandsHtml}</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderMcus(mcus) {
    const container = document.getElementById('deckMcusList');
    if (!container) return;

    if (!mcus || mcus.length === 0) {
        container.innerHTML = '<p class="text-center text-silver-400 text-xs py-4">Žádné senzorové MCU v systému.</p>';
        return;
    }

    container.innerHTML = mcus.map(mcu => {
        const checked = currentAssignments.has(`mcu:${mcu.id}`);
        return `
            <label class="flex items-center gap-3 p-3 border border-ash-grey-200 dark:border-midnight-violet-700 rounded-lg hover:bg-ash-grey-50 dark:hover:bg-midnight-violet-800/50 transition-colors cursor-pointer">
                <input type="checkbox" data-type="mcu" data-id="${mcu.id}"
                    ${checked ? 'checked' : ''}
                    class="deck-checkbox w-4 h-4 accent-vintage-grape-600 rounded cursor-pointer">
                <i class="fas fa-microchip text-xs text-vintage-grape-500"></i>
                <span class="text-sm font-medium text-midnight-violet-900 dark:text-silver-100">${mcu.name}</span>
            </label>
        `;
    }).join('');
}

function initButtons() {
    // Per-server check/uncheck (event delegation)
    document.getElementById('deckServersList')?.addEventListener('click', (e) => {
        const checkBtn = e.target.closest('[data-server-check]');
        const uncheckBtn = e.target.closest('[data-server-uncheck]');

        if (checkBtn) {
            const serverId = checkBtn.dataset.serverCheck;
            const container = checkBtn.closest('.rounded-lg');
            container?.querySelectorAll(`.deck-checkbox[data-type="command"][data-server="${serverId}"]`).forEach(cb => cb.checked = true);
        }
        if (uncheckBtn) {
            const serverId = uncheckBtn.dataset.serverUncheck;
            const container = uncheckBtn.closest('.rounded-lg');
            container?.querySelectorAll(`.deck-checkbox[data-type="command"][data-server="${serverId}"]`).forEach(cb => cb.checked = false);
        }
    });

    // Check / Uncheck all MCUs
    document.getElementById('deckCheckAllMcus')?.addEventListener('click', () => {
        document.querySelectorAll('#deckMcusList .deck-checkbox').forEach(cb => cb.checked = true);
    });
    document.getElementById('deckUncheckAllMcus')?.addEventListener('click', () => {
        document.querySelectorAll('#deckMcusList .deck-checkbox').forEach(cb => cb.checked = false);
    });

    // Save
    document.getElementById('deckSaveBtn')?.addEventListener('click', saveDeckConfig);
}

async function saveDeckConfig() {
    const mcuId = getMcuId();
    if (!mcuId) return;

    const saveBtn = document.getElementById('deckSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
    }

    try {
        const checkboxes = document.querySelectorAll('.deck-checkbox:checked');
        const assignments = [];
        checkboxes.forEach(cb => {
            assignments.push({
                entity_type: cb.dataset.type,
                entity_id: parseInt(cb.dataset.id)
            });
        });

        const res = await fetch(`/mcu/${mcuId}/deck-assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignments })
        });

        const data = await res.json();

        if (data.success) {
            if (window.openToast) window.openToast(data.message || 'Konfigurace uložena.', true);
        } else {
            if (window.openToast) window.openToast(data.message || 'Chyba při ukládání.', false);
        }
    } catch (e) {
        console.error('[DeckManager] Save error:', e);
        if (window.openToast) window.openToast('Chyba komunikace se serverem.', false);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Uložit konfiguraci';
        }
    }
}
