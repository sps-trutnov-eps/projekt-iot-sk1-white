// public/js/pages/servers/commandManager.js

export function runCommand(cmdId) {
    console.log("Požadavek na spuštění příkazu ID:", cmdId);
    
    // Tady potom přijde tvůj fetch nebo socket emit
    // např.:
    // fetch(`/api/commands/${cmdId}/execute`, { method: 'POST' })
    //     .then(res => res.json())
    //     .then(data => console.log("Výsledek:", data));
}