import { getMcuId } from './utils.js';

let deckData = null;

function createCheckbox(entity, type, isChecked) {
    const id = `deck-${type}-${entity.id}`;
    const label = type === 'command'
        ? `${entity.name} <span class="text-[10px] text-silver-400">(${entity.serverName || '?'})</span>`
        : entity.name;

    return `
        <label for="${id}" class="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all
            ${isChecked
                ? 'border-vintage-grape-500 bg-vintage-grape-50 dark:bg-vintage-grape-900/20'
                : 'border-ash-grey-200 dark:border-midnight-violet-700 hover:border-vintage-grape-300'}">
            <input type="checkbox" id="${id}" value="${entity.id}" data-type="${type}"
                ${isChecked ? 'checked' : ''}
                class="w-4 h-4 rounded border-ash-grey-300 text-vintage-grape-600 focus:ring-vintage-grape-500 accent-vintage-grape-600" />
            <span class="text-sm text-midnight-violet-900 dark:text-silver-200">${label}</span>
        </label>
    `;
}

function renderList(containerId, entities, type, assignedIds) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!entities || entities.length === 0) {
        container.innerHTML = '<p class="text-sm text-silver-400 italic col-span-2">Žádné dostupné položky.</p>';
        return;
    }

    container.innerHTML = entities.map(e =>
        createCheckbox(e, type, assignedIds.includes(e.id))
    ).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const label = cb.closest('label');
            if (cb.checked) {
                label.classList.add('border-vintage-grape-500', 'bg-vintage-grape-50', 'dark:bg-vintage-grape-900/20');
                label.classList.remove('border-ash-grey-200', 'dark:border-midnight-violet-700');
            } else {
                label.classList.remove('border-vintage-grape-500', 'bg-vintage-grape-50', 'dark:bg-vintage-grape-900/20');
                label.classList.add('border-ash-grey-200', 'dark:border-midnight-violet-700');
            }
        });
    });
}

function getCheckedIds(type) {
    const checkboxes = document.querySelectorAll(`input[data-type="${type}"]:checked`);
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function toggleAllInContainer(type) {
    // Hledá v inline i v modalu
    const checkboxes = document.querySelectorAll(`input[data-type="${type}"]`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.dispatchEvent(new Event('change'));
    });
}

// ── Načtení dat (sdílené pro inline i modal) ──
export async function loadDeckConfig() {
    const mcuId = getMcuId();
    try {
        const res = await fetch(`/mcu/${mcuId}/deck-config/available`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        deckData = data;
        const assigned = data.assigned || {};

        // Inline sekce
        renderList('deckInlineServers', data.available.servers, 'server', assigned.servers || []);
        renderList('deckInlineCommands', data.available.commands, 'command', assigned.commands || []);
        renderList('deckInlineMcus', data.available.mcus, 'mcu', assigned.mcus || []);

    } catch (e) {
        console.error('[Deck] Chyba při načítání konfigurace:', e);
        const errorEl = document.getElementById('deckInlineError');
        if (errorEl) {
            errorEl.querySelector('p').textContent = e.message || 'Nepodařilo se načíst konfiguraci.';
            errorEl.classList.remove('hidden');
        }
    }
}

async function saveDeckConfig() {
    const mcuId = getMcuId();
    const saveBtn = document.getElementById('deckInlineSave');
    const errorEl = document.getElementById('deckInlineError');

    const config = {
        servers: getCheckedIds('server'),
        commands: getCheckedIds('command'),
        mcus: getCheckedIds('mcu')
    };

    if (saveBtn) saveBtn.disabled = true;
    errorEl?.classList.add('hidden');

    try {
        const res = await fetch(`/mcu/${mcuId}/deck-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        if (window.openToast) {
            window.openToast('Konfigurace decku uložena a odeslána.', true);
        }
    } catch (e) {
        if (errorEl) {
            errorEl.querySelector('p').textContent = e.message || 'Nepodařilo se uložit konfiguraci.';
            errorEl.classList.remove('hidden');
        }
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function pushDeckConfig() {
    const mcuId = getMcuId();
    const pushBtn = document.getElementById('deckInlinePush');
    if (pushBtn) pushBtn.disabled = true;

    try {
        const res = await fetch(`/mcu/${mcuId}/deck-push`, { method: 'POST' });
        const data = await res.json();
        if (data.success && window.openToast) {
            window.openToast('Konfigurace odeslána na deck.', true);
        }
    } catch (e) {
        console.error('[Deck] Push chyba:', e);
    } finally {
        if (pushBtn) pushBtn.disabled = false;
    }
}

export function initDeckManager() {
    // Inline tlačítka
    document.getElementById('deckInlineSave')?.addEventListener('click', saveDeckConfig);
    document.getElementById('deckInlinePush')?.addEventListener('click', pushDeckConfig);

    // Toggle all tlačítka (inline)
    document.querySelectorAll('.deck-toggle-all').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.toggle;
            if (type) toggleAllInContainer(type);
        });
    });
}
