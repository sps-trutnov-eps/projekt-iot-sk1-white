// public/js/pages/servers/commandManager.js

export function runCommand(cmdId) {
    console.log("[Frontend] Požadavek na spuštění příkazu ID:", cmdId);

    // Najdeme si HTML element karty, abychom mohli případně měnit její stav (např. přidat spinner)
    const cardElement = document.querySelector(`div[data-cmd-id="${cmdId}"]`);
    const btnIcon = cardElement ? cardElement.querySelector('.fa-play') : null;

    // 1. Vizuální změna (přidáme spinner)
    if (btnIcon) {
        btnIcon.classList.remove('fa-play');
        btnIcon.classList.add('fa-spinner', 'fa-spin');
    }

    // 2. Odeslání požadavku na náš backend (CommandController)
    fetch(`/api/commands/${cmdId}/execute`, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP chyba! Status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("[Frontend] Odpověď serveru:", data);
        
        if (data.success) {
            // Úspěšně odesláno do fronty / MQTT
            showNotification('Příkaz odeslán ke zpracování!', 'success');
            
            // Volitelné: Můžeš si uložit data.historyId, pokud bys pak chtěl zjišťovat stav
            console.log("ID v historii:", data.historyId);
        } else {
            showNotification(`Chyba: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error("[Frontend] Chyba při odesílání příkazu:", error);
        showNotification('Došlo k chybě při komunikaci se serverem.', 'error');
    })
    .finally(() => {
        // 3. Vrátíme ikonu zpět do normálu
        if (btnIcon) {
            btnIcon.classList.remove('fa-spinner', 'fa-spin');
            btnIcon.classList.add('fa-play');
        }
    });
}

// Jednoduchá pomocná funkce pro notifikace (pokud už nemáš vlastní v projektu)
function showNotification(message, type = 'info') {
    // Pokud používáš nějakou knihovnu (např. Toastr, SweetAlert), zavolej ji tady.
    // Zde je jednoduchý fallback přes alert() nebo console, dokud to nepředěláš na UI prvky
    if (type === 'error') {
        alert("❌ " + message);
    } else {
        console.log("✅ " + message); // Prozatím jen do konzole, abys neklikal pořád na alerty
    }
}