/**
 * DASHBOARD MANAGER - Správa dat a stavu
 */
export const DashboardManager = {
    favoriteCommands: [],
    availableServers: [],

    async init() {
        await this.loadData();
    },

    async loadData() {
        try {
            // 1. Načtení oblíbených příkazů
            const favRes = await fetch('/command/favorites');
            const favData = await favRes.json();
            if (favData.success) {
                this.favoriteCommands = favData.data;
            }

            // 2. Načtení serverů
            const srvRes = await fetch('/server/all');
            const srvData = await srvRes.json();
            if (srvData.success) {
                this.availableServers = srvData.data;
            }

            // Po načtení dat vyvoláme render v CommandManageru
            if (window.CommandManager) {
                window.CommandManager.render();
            }
        } catch (error) {
            console.error("Chyba při načítání dat dashboardu:", error);
        }
    },

    escapeQuotes(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
};

// Export do globálního objektu pro přístup z jiných částí aplikace
window.DashboardManager = DashboardManager;