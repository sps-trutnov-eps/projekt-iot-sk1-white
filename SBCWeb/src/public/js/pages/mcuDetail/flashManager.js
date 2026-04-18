// flashManager.js — Flash MCU přes Web Serial API (client-side)

let isFlashing = false;
let serialPort = null;

const CTRL_A = 0x01;
const CTRL_B = 0x02;
const CTRL_C = 0x03;
const CTRL_D = 0x04;
const PICO_VENDOR_ID = 0x2E8A;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// === MODAL OVLÁDÁNÍ ===
export function initFlashModal() {
    const closeBtn = document.getElementById('flashModalClose');
    const cancelBtn = document.getElementById('flashCancel');
    const startBtn = document.getElementById('flashStartBtn');
    const connectBtn = document.getElementById('flashConnectUsb');
    const disconnectBtn = document.getElementById('flashDisconnectUsb');
    const uploadInput = document.getElementById('templateUpload');
    const deleteBtn = document.getElementById('deleteTemplate');
    const toggleNetwork = document.getElementById('toggleNetworkConfig');
    const templateSelect = document.getElementById('flashTemplate');

    if (closeBtn) closeBtn.addEventListener('click', closeFlashModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeFlashModal);
    if (startBtn) startBtn.addEventListener('click', startFlash);
    if (connectBtn) connectBtn.addEventListener('click', connectUsb);
    if (disconnectBtn) disconnectBtn.addEventListener('click', disconnectUsb);
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

    // Check Web Serial API support
    if (!('serial' in navigator)) {
        const warning = document.getElementById('webSerialWarning');
        if (warning) warning.classList.remove('hidden');
    }
}

export async function openFlashModal() {
    const modal = document.getElementById('flashModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    resetProgress();
    updatePortStatus();

    await loadTemplates();
}

function closeFlashModal() {
    if (isFlashing) return;
    const modal = document.getElementById('flashModal');
    if (modal) modal.classList.add('hidden');
}

// === WEB SERIAL API ===
async function connectUsb() {
    if (!('serial' in navigator)) {
        showError(window.i18n?.errorWebSerial ?? 'Web Serial API is not supported. Please use Chrome or Edge.');
        return;
    }

    try {
        serialPort = await navigator.serial.requestPort({
            filters: [{ usbVendorId: PICO_VENDOR_ID }]
        });

        const info = serialPort.getInfo();
        updatePortStatus(info);

        if (window.openToast) window.openToast(window.i18n?.usbConnected ?? 'USB device connected.', true);
    } catch (e) {
        if (e.name === 'NotAllowedError') return; // User cancelled
        showError((window.i18n?.errorConnect ?? 'Failed to connect: ') + e.message);
    }
}

async function disconnectUsb() {
    if (serialPort) {
        try {
            if (serialPort.readable || serialPort.writable) {
                await serialPort.close();
            }
        } catch (_) {}
        serialPort = null;
    }
    updatePortStatus();
}

function updatePortStatus(info) {
    const statusEl = document.getElementById('flashPortStatus');
    const connectBtn = document.getElementById('flashConnectUsb');
    const disconnectBtn = document.getElementById('flashDisconnectUsb');

    if (!statusEl) return;

    if (serialPort) {
        const vendorId = info?.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : '';
        const productId = info?.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : '';
        const label = vendorId === '0x2E8A' ? 'Raspberry Pi Pico' : `USB ${vendorId}`;
        
        statusEl.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-2"></i><span class="font-medium">${label}</span><span class="text-xs text-gray-400 ml-2">${vendorId}:${productId}</span>`;
        statusEl.className = statusEl.className.replace('border-ash-grey-300 dark:border-midnight-violet-700', 'border-green-500 dark:border-green-600');
        
        if (connectBtn) connectBtn.classList.add('hidden');
        if (disconnectBtn) disconnectBtn.classList.remove('hidden');
    } else {
        // OPRAVA CHYBY: Použití bezpečných proměnných a backticks místo kombinování apostrofů
        const txtNoDevice = window.i18n?.noDevice ?? 'No device connected';
        
        statusEl.innerHTML = `<i class="fas fa-usb text-gray-400 mr-2"></i><span class="text-gray-500 dark:text-silver-400">${txtNoDevice}</span>`;
        statusEl.className = statusEl.className.replace('border-green-500 dark:border-green-600', 'border-ash-grey-300 dark:border-midnight-violet-700');
        
        if (connectBtn) connectBtn.classList.remove('hidden');
        if (disconnectBtn) disconnectBtn.classList.add('hidden');
    }
}

// === WEB SERIAL PROTOCOL ===
async function writeSerial(writer, data) {
    if (typeof data === 'string') {
        await writer.write(encoder.encode(data));
    } else {
        await writer.write(data);
    }
}

async function readUntil(reader, marker, timeoutMs = 10000) {
    let buffer = '';
    const start = Date.now();
    while (!buffer.includes(marker)) {
        if (Date.now() - start > timeoutMs) {
            throw new Error('Device response timeout.');
        }
        const { value, done } = await reader.read();
        if (done) throw new Error('Serial port was closed.');
        buffer += decoder.decode(value);
    }
    return buffer;
}

async function enterRawRepl(writer, reader) {
    // Interrupt anything running
    await writeSerial(writer, new Uint8Array([0x0D, CTRL_C]));
    await new Promise(r => setTimeout(r, 200));
    await writeSerial(writer, new Uint8Array([CTRL_C]));
    await new Promise(r => setTimeout(r, 200));

    // Enter raw REPL
    await writeSerial(writer, new Uint8Array([0x0D, CTRL_A]));
    await readUntil(reader, '>');
}

async function execRaw(writer, reader, code) {
    await writeSerial(writer, code);
    await writeSerial(writer, new Uint8Array([CTRL_D]));

    // Read until OK + stdout \x04 + stderr \x04
    let raw = '';
    let okFound = false;
    let stdoutDone = false;
    let stdout = '';
    let stderr = '';

    const start = Date.now();
    while (Date.now() - start < 15000) {
        const { value, done } = await reader.read();
        if (done) break;
        raw += decoder.decode(value);

        if (!okFound) {
            const okIdx = raw.indexOf('OK');
            if (okIdx !== -1) {
                okFound = true;
                raw = raw.substring(okIdx + 2);
            }
        }

        if (okFound && !stdoutDone) {
            const eotIdx = raw.indexOf('\x04');
            if (eotIdx !== -1) {
                stdout = raw.substring(0, eotIdx);
                raw = raw.substring(eotIdx + 1);
                stdoutDone = true;
            }
        }

        if (stdoutDone) {
            const eotIdx = raw.indexOf('\x04');
            if (eotIdx !== -1) {
                stderr = raw.substring(0, eotIdx);
                break;
            }
        }
    }

    if (stderr.trim()) {
        throw new Error(`MicroPython chyba: ${stderr.trim()}`);
    }

    return stdout;
}

async function uploadFileToDevice(port, fileContent, destPath, onProgress) {
    await port.open({ baudRate: 115200 });

    const writer = port.writable.getWriter();
    const reader = port.readable.getReader();

    try {
        onProgress(0, 100, 'Connecting to raw REPL...');
        await enterRawRepl(writer, reader);

        onProgress(10, 100, 'Opening file on device...');
        await execRaw(writer, reader, `f=open('${destPath}','wb')\nw=f.write`);

        // Send in chunks
        const CHUNK_SIZE = 256;
        const data = encoder.encode(fileContent);
        const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
            const chunk = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

            // Convert chunk to Python bytes literal
            let pyBytes = "w(b'";
            for (const byte of chunk) {
                if (byte === 0x27) pyBytes += "\\'";
                else if (byte === 0x5C) pyBytes += '\\\\';
                else if (byte >= 0x20 && byte <= 0x7E) {
                    pyBytes += String.fromCharCode(byte);
                } else {
                    pyBytes += '\\x' + byte.toString(16).padStart(2, '0');
                }
            }
            pyBytes += "')";

            await execRaw(writer, reader, pyBytes);

            const percent = 10 + Math.round(((i + 1) / totalChunks) * 75);
            onProgress(percent, 100, `Nahrávám... ${Math.round(((i + 1) / totalChunks) * 100)}%`);
        }

        onProgress(90, 100, 'Closing file...');
        await execRaw(writer, reader, 'f.close()');

        onProgress(95, 100, 'Restarting device...');
        // Exit raw REPL and soft reset
        await writeSerial(writer, new Uint8Array([CTRL_B]));
        await new Promise(r => setTimeout(r, 100));
        await writeSerial(writer, new Uint8Array([CTRL_D]));

        onProgress(100, 100, 'Flash complete!');
    } finally {
        reader.releaseLock();
        writer.releaseLock();
        try { await port.close(); } catch (_) {}
    }
}

// === ŠABLONY ===
async function loadTemplates() {
    const select = document.getElementById('flashTemplate');
    const txtLoading = window.i18n?.loadingTemplates ?? 'Loading templates...';
    select.innerHTML = `<option value="">${txtLoading}</option>`;

    try {
        const res = await fetch('/mcu/templates');
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        if (data.templates.length === 0) {
            const txtNoTemplates = window.i18n?.noTemplates ?? 'No templates — upload a .py file';
            select.innerHTML = `<option value="">${txtNoTemplates}</option>`;
            return;
        }

        const txtSelectTemplate = window.i18n?.selectTemplate ?? '-- Select template --';
        select.innerHTML = `<option value="">${txtSelectTemplate}</option>`;
        
        data.templates.forEach(tpl => {
            const opt = document.createElement('option');
            opt.value = tpl.filename;
            const sizeKb = (tpl.size / 1024).toFixed(1);
            opt.textContent = `${tpl.name} (${sizeKb} KB)`;
            select.appendChild(opt);
        });
    } catch (e) {
        const txtError = window.i18n?.templateLoadError ?? 'Error loading templates';
        select.innerHTML = `<option value="">${txtError}</option>`;
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

        await loadTemplates();
        const select = document.getElementById('flashTemplate');
        select.value = data.filename;
        onTemplateSelected();
    } catch (err) {
        showError(err.message);
    }

    e.target.value = '';
}

async function handleDeleteTemplate() {
    const select = document.getElementById('flashTemplate');
    if (!select.value) return;

    const name = select.value;
    if (!confirm(`Really delete template "${name}"?`)) return;

    try {
        const res = await fetch(`/mcu/templates/${name}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        if (window.openToast) window.openToast(window.i18n?.successTemplateDel ?? 'Template deleted.', true);
        await loadTemplates();
    } catch (err) {
        showError(err.message);
    }
}

// === FLASH PROCES ===
async function startFlash() {
    if (isFlashing) return;

    if (!serialPort) return showError(window.i18n?.errorConnectUsb ?? 'Connect USB device.');

    const templateFilename = document.getElementById('flashTemplate').value;
    const wifiSsid = document.getElementById('flashWifiSsid').value.trim();
    const wifiPassword = document.getElementById('flashWifiPass').value.trim();

    if (!templateFilename) return showError(window.i18n?.errorSelectTemplate ?? 'Select a template.');
    if (!wifiSsid) return showError('Zadejte WiFi SSID.');
    if (!wifiPassword) return showError('Zadejte WiFi heslo.');

    const extraConfig = {
        gateway: document.getElementById('flashGateway').value.trim() || '192.168.1.1',
        subnet: document.getElementById('flashSubnet').value.trim() || '255.255.255.0',
        dns: document.getElementById('flashDns').value.trim() || '192.168.1.1'
    };

    const mcuId = window.location.pathname.split('/').pop();

    isFlashing = true;
    setFlashUI(true);
    resetProgress();
    showProgress();
    hideError();

    try {
        // 1. Get rendered template from server
        addLog(window.i18n?.generatingCode ?? 'Generating code from template...', 'running');
        const res = await fetch(`/mcu/${mcuId}/render-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateFilename, wifiSsid, wifiPassword, extraConfig })
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        addLog(window.i18n?.successCodeGenerated ?? 'Code generated.', 'success');

        // 2. Upload via Web Serial
        await uploadFileToDevice(serialPort, data.code, 'main.py', (percent, total, message) => {
            const bar = document.getElementById('flashProgressBar');
            if (bar) bar.style.width = `${percent}%`;
            addLog(message, percent >= 100 ? 'success' : 'running');
        });

        // Done
        const bar = document.getElementById('flashProgressBar');
        const spinner = document.getElementById('flashSpinner');
        if (bar) {
            bar.style.width = '100%';
            bar.className = bar.className.replace('bg-vintage-grape-500', 'bg-green-500');
            bar.classList.add('bg-green-500');
        }
        if (spinner) spinner.className = 'fas fa-check-circle mr-1 text-green-500';

        if (window.openToast) window.openToast(window.i18n?.successFlashed ?? 'Code uploaded to device successfully!', true);

    } catch (err) {
        addLog(`Chyba: ${err.message}`, 'error');

        const bar = document.getElementById('flashProgressBar');
        const spinner = document.getElementById('flashSpinner');
        if (bar) {
            bar.className = bar.className.replace('bg-vintage-grape-500', 'bg-red-500');
            bar.classList.add('bg-red-500');
        }
        if (spinner) spinner.className = 'fas fa-times-circle mr-1 text-red-500';

        showError(err.message);
    } finally {
        isFlashing = false;
        setFlashUI(false);
        serialPort = null;
        updatePortStatus();
    }
}

// === UTILITY ===
function addLog(message, status) {
    const log = document.getElementById('flashLog');
    if (!log) return;

    const iconClass = status === 'success' ? 'text-green-500 fa-check'
        : status === 'error' ? 'text-red-500 fa-times'
        : 'text-vintage-grape-400 fa-circle-notch fa-spin';

    const entry = document.createElement('div');
    entry.className = 'flex items-center gap-2 text-gray-700 dark:text-silver-300';
    entry.innerHTML = `
        <i class="fas ${iconClass} text-xs w-4"></i>
        <span class="text-xs">${message}</span>
    `;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

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