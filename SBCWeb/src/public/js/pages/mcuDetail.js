document.addEventListener('DOMContentLoaded', async () => {
    const mcuId = window.location.pathname.split('/').pop();
    
    try {
        const response = await fetch('/mcu/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mcuId })
        });

        const data = await response.json();

        if (data.success && data.mcu) {
            const mcu = data.mcu;

            // 1. Základní info
            document.getElementById('mcu-name').textContent = mcu.name;
            document.getElementById('mcu-ip').textContent = mcu.ipAddress;
            document.getElementById('mcu-mac').textContent = mcu.macAddress;

            // 2. Parsování času z DB (očekává YYYY-MM-DD HH:mm:ss)
            const parts = mcu.lastSeen.split(/[- :]/);
            // JS měsíce jsou 0-11, proto parts[1]-1
            const lastSeenDate = new Date(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]);
            
            // Korekce +1 hodina (pokud server ukládá o hodinu méně)
            lastSeenDate.setHours(lastSeenDate.getHours() + 1);
            console.log(lastSeenDate);
            const now = new Date();
            console.log(now);
            const diffMinutes = Math.floor((now - lastSeenDate) / 1000 / 60);
            console.log(diffMinutes)
            // DEBUG - tohle uvidíš v konzoli (F12) - zkontroluj si ty časy!
            console.log("Aktuální čas v PC:", now.toLocaleString());
            console.log("Upravený čas z DB:", lastSeenDate.toLocaleString());
            console.log("Rozdíl v minutách:", diffMinutes);

            // 3. Formátování textu času
            const isToday = now.toDateString() === lastSeenDate.toDateString();
            const timeString = isToday 
                ? lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : lastSeenDate.toLocaleDateString('cs-CZ') + " " + lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

            document.getElementById('mcu-lastseen').textContent = timeString;

            // 4. Statusy (Online = rozdíl 0 až 10 minut)
            const dot = document.getElementById('mcu-status-dot');
            const indicator = document.getElementById('mcu-status-indicator');
            const text = document.getElementById('mcu-status-text');
            
            // Podmínka: Pokud je to dnes a rozdíl je 0-10 minut
// Upravená podmínka podle tvého zadání:
// "Online" je cokoliv, co má rozdíl menší než 70 minut oproti tvé korekci
// (nebo 10 minut reálně, pokud započítáme ten 60min posun v DB)
                const isOnline = diffMinutes < 70; 

                if (isOnline) {
                    if (dot) dot.className = "absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full";
                    if (indicator) indicator.className = "w-2 h-2 rounded-full bg-green-500";
                    text.className = "font-bold text-green-600 text-xs uppercase";
                    text.textContent = "Online";
                } else {
                    if (dot) dot.className = "absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full";
                    if (indicator) indicator.className = "w-2 h-2 rounded-full bg-red-500";
                    text.className = "font-bold text-red-600 text-xs uppercase";
                    text.textContent = "Offline";
                }            
            
        }
    } catch (err) {
        console.error('Chyba aplikace:', err);
    }
});



const sensorModal = Modal.register('sensor');

if (sensorModal) {
    // 1. Otevírání modalu
    if (sensorModal.openModal) {
        sensorModal.openModal.addEventListener('click', () => {
            sensorModal.open();
            sensorModal.hideError();
            // Resetujeme kontejner metrik při každém otevření, pokud chceš začít čistý
            const container = document.getElementById('metricsContainer');
            if (container) container.innerHTML = ''; 
            const emptyState = document.getElementById('emptyMetricsState');
            if (emptyState) emptyState.classList.remove('hidden');
        });
    }

    // 2. Odeslání formuláře
    if (sensorModal.submitBtn) {
        sensorModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // Sběr dat z hlavních polí
            const sensorName = document.getElementById('sensorNameInput').value;
            const mcuId = window.location.pathname.split('/').pop();

            // Dynamický sběr metrik (veličin)
            const metrics = [];
            const container = document.getElementById('metricsContainer');
            const rows = container.querySelectorAll('.flex.items-center.gap-2'); // Zaměření na řádky metrik

            rows.forEach(row => {
                metrics.push({
                    name: row.querySelector('input[name="metricName[]"]').value,
                    type: row.querySelector('select[name="metricType[]"]').value,
                    unit: row.querySelector('input[name="metricUnit[]"]').value
                });
            });

            // Validace: Musí být alespoň jedna metrika
            if (metrics.length === 0) {
                sensorModal.showError("Musíte přidat alespoň jednu měřenou veličinu.");
                return;
            }

            const formData = {
                mcuId: mcuId,
                name: sensorName,
                metrics: metrics
            };

            try {
                sensorModal.submitBtn.disabled = true;
                sensorModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
                
                const response = await fetch('/sensor/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    window.openToast("Senzor byl úspěšně přidán!", true);
                    sensorModal.clear();
                    // Zavření modalu
                    sensorModal.close();
                    // Volitelný refresh dat na stránce
                    if (window.refreshSensors) await window.refreshSensors();
                    else window.location.reload(); 
                } else {
                    sensorModal.showError(data.message);
                }
            } catch (error) {
                console.error(error);
                sensorModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                sensorModal.submitBtn.disabled = false;
                sensorModal.submitBtn.innerHTML = '<i class="fas fa-plus"></i> Přidat Senzor';
            }
        });
    }
}



const metricModal = Modal.register('metric');

if (metricModal) {
    // 1. Otevírání modalu (předpokládá se volání odjinud s ID senzoru)
    // Příklad: <button onclick="openAddMetricModal(12)">...</button>
    window.openAddMetricModal = (sensorId) => {
        metricModal.open();
        metricModal.hideError();
        metricModal.clear();
        document.getElementById('metricSensorIdInput').value = sensorId;
    };

    if (metricModal.openModal) {
        metricModal.openModal.addEventListener('click', () => {
            metricModal.open();
            metricModal.hideError();
        });
    }

    // 2. Odeslání formuláře
    if (metricModal.submitBtn) {
        metricModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const formData = {
                sensorId: document.getElementById('metricSensorIdInput').value,
                name: document.getElementById('metricNameInput').value,
                type: document.getElementById('metricTypeInput').value,
                unit: document.getElementById('metricUnitInput').value
            };

            // Jednoduchá validace
            if (!formData.name || !formData.unit) {
                metricModal.showError("Vyplňte prosím všechna pole.");
                return;
            }

            try {
                metricModal.submitBtn.disabled = true;
                metricModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
                
                const response = await fetch('/metric/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    window.openToast("Veličina byla přidána!", true);
                    metricModal.close();
                    // Zde zavoláš funkci pro překreslení UI
                    if (window.refreshSensorDetails) window.refreshSensorDetails();
                    else window.location.reload();
                } else {
                    metricModal.showError(data.message);
                }
            } catch (error) {
                console.error(error);
                metricModal.showError("Chyba při spojení se serverem.");
            } finally {
                metricModal.submitBtn.disabled = false;
                metricModal.submitBtn.innerHTML = 'Přidat';
            }
        });
    }
}
