// public/js/pages/servers/commandManager.js

export async function runCommand(cmdId, btnElement) {
    console.log("[Frontend] Požadavek na spuštění příkazu ID:", cmdId);

    // Pokud náhodou nepředáš 'this' z HTML, pokusíme se tlačítko najít podle ID karty
    if (!btnElement) {
        const cardElement = document.querySelector(`div[data-cmd-id="${cmdId}"]`);
        if (cardElement) {
            // Najde tlačítko uvnitř karty, které aktuálně obsahuje ikonu play
            btnElement = cardElement.querySelector('button i.fa-play')?.parentElement;
        }
    }

    // Ochrana proti dvojitému kliknutí
    if (btnElement && btnElement.disabled) return;

    // 1. Vizuální změna (uložíme si původní HTML a dáme tam spinner)
    let originalHtml = '';
    if (btnElement) {
        originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin text-[10px] ml-0.5"></i>';
        btnElement.disabled = true;
    }

    try {
        // 2. Odeslání požadavku na backend
        const response = await fetch(`/command/run/${cmdId}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        console.log("[Frontend] Odpověď serveru:", data);
        
        // 3. Zpracování odpovědi a zobrazení správné ikony
        if (data.success) {
            if (btnElement) {
                btnElement.innerHTML = '<i class="fas fa-check text-green-500 text-[10px] ml-0.5"></i>';
            }
            showNotification('Příkaz odeslán ke zpracování!', 'success');
            console.log("ID v historii:", data.historyId);
        } else {
            if (btnElement) {
                btnElement.innerHTML = '<i class="fas fa-times text-red-500 text-[10px] ml-0.5"></i>';
            }
            showNotification(`Chyba: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error("[Frontend] Chyba při odesílání příkazu:", error);
        if (btnElement) {
            btnElement.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-[10px] ml-0.5"></i>';
        }
        showNotification('Došlo k chybě při komunikaci se serverem.', 'error');
    } finally {
        // 4. Vrátíme tlačítko zpět do normálu po 2 vteřinách
        if (btnElement) {
            setTimeout(() => { 
                btnElement.innerHTML = originalHtml; 
                btnElement.disabled = false; 
            }, 2000);
        }
    }
}

// Jednoduchá pomocná funkce pro notifikace
function showNotification(message, type = 'info') {
    if (type === 'error') {
        alert("❌ " + message);
    } else {
        console.log("✅ " + message); 
    }
}