// flashManager.js — Flash MCU přes USB z webového rozhraní

let isFlashing = false;

// === MODAL OVLÁDÁNÍ ===
export function initFlashModal() {
    const closeBtn = document.getElementById('flashModalClose');
    const cancelBtn = document.getElementById('flashCancel');
    const startBtn = document.getElementById('flashStartBtn');
    const refreshBtn = document.getElementById('refreshPorts');
    const uploadInput = document.getElementById('templateUpload');
    const deleteBtn = document.getElementById('deleteTemplate');
    const toggleNetwork = document.getElementById('toggleNetworkConfig');
    const templateSelect = document.getElementById('flashTemplate');

    if (closeBtn) closeBtn.addEventListener('click', closeFlashModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeFlashModal);
    if (startBtn) startBtn.addEventListener('click', startFlash);
    if (refreshBtn) refreshBtn.addEventListener('click', loadPorts);
    if (uploadInput) uploadInput.addEventListener('change', handleTemplateUpload);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDeleteTemplate);
    if (templateSelect) templateSelect.addEventListener('change', onTemplateSelected);

    if (toggleNetwork) {
        toggleNetwork.addEventListener('click', () => {
            const config = document.getElementById('networkConfig');
            const arrow = document.getElementById('networkConfigArrow');
            config.classList.toggle('hidden');
            arrow.style.transform = config.classList.contains('hidden') ? '' : 'rotate(90deg)';
        });
    }

    // Socket.IO listener pro progress
    initSocketListeners();
}

export async function openFlashModal() {
    const modal = document.getElementById('flashModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    resetProgress();

    // Načteme porty a šablony paralelně
    await Promise.all([loadPorts(), loadTemplates()]);
}

function closeFlashModal() {
    if (isFlashing) return; // Nepovolíme zavřít během flashování
    const modal = document.getElementById('flashModal');
    if (modal) modal.classList.add('hidden');
}

// === PORTY ===
async function loadPorts() {
    const select = document.getElementById('flashPort');
    const warning = document.getElementById('mpremoteWarning');
    select.innerHTML = '<option value="">Hledám porty...</option>';
    warning.classList.add('hidden');

    try {
        const res = await fetch('/mcu/serial-ports');
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        // mpremote check
        if (!data.mpremote.available) {
            warning.classList.remove('hidden');
        }

        // Porty
        if (data.ports.length === 0) {
            select.innerHTML = '<option value="">Žádné USB zařízení nenalezeno</option>';
            return;
        }

        select.innerHTML = '<option value="">-- Vyberte port --</option>';
        data.ports.forEach(port => {
            const opt = document.createElement('option');
            opt.value = port.path;
            const picoTag = port.isPico ? ' [Pico]' : '';
            opt.textContent = `${port.path} — ${port.manufacturer}${picoTag}`;
            if (port.isPico) opt.selected = true; // Auto-select Pico
            select.appendChild(opt);
        });
    } catch (e) {
        select.innerHTML = '<option value="">Chyba při načítání portů</option>';
        showError(e.message);
    }
}

// === ŠABLONY ===
async function loadTemplates() {
    const select = document.getElementById('flashTemplate');
    select.innerHTML = '<option value="">Načítám šablony...</option>';

    try {
        const res = await fetch('/mcu/templates');
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        if (data.templates.length === 0) {
            select.innerHTML = '<option value="">Žádné šablony — nahrajte .py soubor</option>';
            return;
        }

        select.innerHTML = '<option value="">-- Vyberte šablonu --</option>';
        data.templates.forEach(tpl => {
            const opt = document.createElement('option');
            opt.value = tpl.filename;
            const sizeKb = (tpl.size / 1024).toFixed(1);
            opt.textContent = `${tpl.name} (${sizeKb} KB)`;
            select.appendChild(opt);
        });
    } catch (e) {
        select.innerHTML = '<option value="">Chyba při načítání šablon</option>';
    }
}

async function onTemplateSelected() {
    const select = document.getElementById('flashTemplate');
    const deleteBtn = document.getElementById('deleteTemplate');
    const placeholderInfo = document.getElementById('placeholderInfo');
    const placeholderList = document.getElementById('placeholderList');

    if (!select.value) {
        deleteBtn.classList.add('hidden');
        placeholderInfo.classList.add('hidden');
        return;
    }

    deleteBtn.classList.remove('hidden');

    // Načti placeholdery
    try {
        const res = await fetch(`/mcu/templates/${select.value}`);
        const data = await res.json();

        if (data.placeholders && data.placeholders.length > 0) {
            placeholderInfo.classList.remove('hidden');
            placeholderList.innerHTML = data.placeholders.map(p =>
                `<span class="inline-block px-2 py-0.5 bg-vintage-grape-100 dark:bg-vintage-grape-900/30 text-vintage-grape-700 dark:text-vintage-grape-300 rounded text-xs font-mono">{{${p}}}</span>`
            ).join('');
        } else {
            placeholderInfo.classList.add('hidden');
        }
    } catch (_) {
        placeholderInfo.classList.add('hidden');
    }
}

async function handleTemplateUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('template', file);

    try {
        const res = await fetch('/mcu/templates/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        if (window.openToast) window.openToast(data.message, true);

        // Refresh šablon a vyber novou
        await loadTemplates();
        const select = document.getElementById('flashTemplate');
        select.value = data.filename;
        onTemplateSelected();
    } catch (err) {
        showError(err.message);
    }

    e.target.value = ''; // Reset input
}

async function handleDeleteTemplate() {
    const select = document.getElementById('flashTemplate');
    if (!select.value) return;

    const name = select.value;
    if (!confirm(`Opravdu smazat šablonu "${name}"?`)) return;

    try {
        const res = await fetch(`/mcu/templates/${name}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        if (window.openToast) window.openToast('Šablona smazána.', true);
        await loadTemplates();
    } catch (err) {
        showError(err.message);
    }
}

// === FLASH PROCES ===
async function startFlash() {
    if (isFlashing) return;

    const portPath = document.getElementById('flashPort').value;
    const templateFilename = document.getElementById('flashTemplate').value;
    const wifiSsid = document.getElementById('flashWifiSsid').value.trim();
    const wifiPassword = document.getElementById('flashWifiPass').value.trim();

    // Validace
    if (!portPath) return showError('Vyberte USB port.');
    if (!templateFilename) return showError('Vyberte šablonu.');
    if (!wifiSsid) return showError('Zadejte WiFi SSID.');
    if (!wifiPassword) return showError('Zadejte WiFi heslo.');

    // Extra config
    const extraConfig = {
        gateway: document.getElementById('flashGateway').value.trim() || '192.168.1.1',
        subnet: document.getElementById('flashSubnet').value.trim() || '255.255.255.0',
        dns: document.getElementById('flashDns').value.trim() || '192.168.1.1'
    };

    // MCU ID z URL
    const mcuId = window.location.pathname.split('/').pop();

    isFlashing = true;
    setFlashUI(true);
    resetProgress();
    showProgress();
    hideError();

    try {
        const res = await fetch(`/mcu/${mcuId}/flash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portPath, templateFilename, wifiSsid, wifiPassword, extraConfig })
        });
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message);
        }
        // Progress přijde přes Socket.IO
    } catch (err) {
        isFlashing = false;
        setFlashUI(false);
        showError(err.message);
    }
}

// === SOCKET.IO PROGRESS ===
let flashSocket = null;

function initSocketListeners() {
    const tryAttach = () => {
        if (typeof io === 'undefined') {
            setTimeout(tryAttach, 500);
            return;
        }
        flashSocket = io();
        flashSocket.on('flash_progress', handleFlashProgress);
    };
    setTimeout(tryAttach, 1000);
}

function handleFlashProgress(data) {
    const log = document.getElementById('flashLog');
    const bar = document.getElementById('flashProgressBar');
    const spinner = document.getElementById('flashSpinner');

    if (!log || !bar) return;

    showProgress();

    // Progress bar
    const percent = data.total > 0 ? (data.step / data.total) * 100 : 0;
    bar.style.width = `${percent}%`;

    // Barva podle stavu
    if (data.status === 'success') {
        bar.className = bar.className.replace('bg-vintage-grape-500', 'bg-green-500');
        bar.classList.add('bg-green-500');
        spinner.className = 'fas fa-check-circle mr-1 text-green-500';
        isFlashing = false;
        setFlashUI(false);
    } else if (data.status === 'error') {
        bar.className = bar.className.replace('bg-vintage-grape-500', 'bg-red-500');
        bar.classList.add('bg-red-500');
        spinner.className = 'fas fa-times-circle mr-1 text-red-500';
        isFlashing = false;
        setFlashUI(false);
    }

    // Log zpráva
    const iconClass = data.status === 'success' ? 'text-green-500 fa-check'
        : data.status === 'error' ? 'text-red-500 fa-times'
        : 'text-vintage-grape-400 fa-circle-notch fa-spin';

    const entry = document.createElement('div');
    entry.className = 'flex items-center gap-2 text-gray-700 dark:text-silver-300';
    entry.innerHTML = `
        <i class="fas ${iconClass} text-xs w-4"></i>
        <span class="text-xs">${data.message}</span>
        <span class="text-xs text-gray-400 ml-auto">${data.step}/${data.total}</span>
    `;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// === UTILITY ===
function showError(msg) {
    const el = document.getElementById('flashError');
    if (!el) return;
    el.classList.remove('hidden');
    el.querySelector('p').textContent = msg;
}

function hideError() {
    const el = document.getElementById('flashError');
    if (el) el.classList.add('hidden');
}

function showProgress() {
    const el = document.getElementById('flashProgress');
    if (el) el.classList.remove('hidden');
}

function resetProgress() {
    const bar = document.getElementById('flashProgressBar');
    const log = document.getElementById('flashLog');
    const spinner = document.getElementById('flashSpinner');

    if (bar) {
        bar.style.width = '0%';
        bar.className = 'bg-vintage-grape-500 h-3 rounded-full transition-all duration-500';
    }
    if (log) log.innerHTML = '';
    if (spinner) spinner.className = 'fas fa-spinner fa-spin mr-1';

    const el = document.getElementById('flashProgress');
    if (el) el.classList.add('hidden');

    hideError();
}

function setFlashUI(flashing) {
    const btn = document.getElementById('flashStartBtn');
    const closeBtn = document.getElementById('flashModalClose');
    const cancelBtn = document.getElementById('flashCancel');

    if (btn) {
        btn.disabled = flashing;
        btn.classList.toggle('opacity-50', flashing);
        btn.classList.toggle('cursor-not-allowed', flashing);
    }
    if (closeBtn) closeBtn.disabled = flashing;
    if (cancelBtn) cancelBtn.disabled = flashing;
}
