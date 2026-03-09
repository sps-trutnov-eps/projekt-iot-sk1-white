// pages/mcuDetail/trendManager.js

/**
 * Načte historii čtení pro daný kanál a vypočítá trend.
 *
 * Logika (od nejlepší k fallbacku):
 *  1. Dnešní průměr vs. včerejší průměr (kalendářní dny, localtime)
 *  2. Pokud není včerejší data → první záznam dneška vs. poslední záznam dneška
 *  3. Pokud je méně než 2 záznamy → "nedostatek dat"
 */
export async function calculateAndRenderTrend(channelId) {
    try {
        const response = await fetch('/readings/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId, range: '7d' })
        });

        if (!response.ok) { renderNoTrendData(channelId); return; }

        const result = await response.json();
        if (!result.success || !result.data || result.data.length === 0) {
            renderNoTrendData(channelId);
            return;
        }

        const readings = result.data;

        // Rozdělíme záznamy podle kalendářního dne (localtime)
        const todayStr     = new Date().toLocaleDateString('sv');  // "YYYY-MM-DD"
        const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('sv');

        const todayVals     = [];
        const yesterdayVals = [];

        readings.forEach(r => {
            // SQLite ukládá bez timezone – interpretujeme jako UTC
            const d = new Date(r.timestamp.replace(' ', 'T') + 'Z');
            const dayStr = d.toLocaleDateString('sv');
            const val = parseFloat(r.avg);
            if (dayStr === todayStr)     todayVals.push(val);
            if (dayStr === yesterdayStr) yesterdayVals.push(val);
        });

        // --- Případ 1: máme data za oba dny → klasický trend ---
        if (todayVals.length > 0 && yesterdayVals.length > 0) {
            const todayAvg     = todayVals.reduce((a, b) => a + b, 0) / todayVals.length;
            const yesterdayAvg = yesterdayVals.reduce((a, b) => a + b, 0) / yesterdayVals.length;
            const diff = todayAvg - yesterdayAvg;
            const pct  = yesterdayAvg !== 0 ? (diff / Math.abs(yesterdayAvg)) * 100 : 0;
            renderTrendBadge(channelId, diff, pct, 'vs včera');
            return;
        }

        // --- Případ 2: data jen za dnešek → první vs. poslední záznam dneška ---
        if (todayVals.length >= 2) {
            const diff = todayVals[todayVals.length - 1] - todayVals[0];
            const pct  = todayVals[0] !== 0 ? (diff / Math.abs(todayVals[0])) * 100 : 0;
            renderTrendBadge(channelId, diff, pct, 'dnes');
            return;
        }

        // --- Případ 3: příliš málo dat ---
        renderNoTrendData(channelId);

    } catch (e) {
        console.warn(`[Trend] Chyba pro kanál ${channelId}:`, e);
        renderNoTrendData(channelId);
    }
}

// ---------------------------------------------------------------------------
// Interní funkce
// ---------------------------------------------------------------------------

/**
 * Vykreslí barevný odznak trendu (šipka + číslo).
 * @param {number} diff - rozdíl průměrů
 * @param {number} pct  - procentuální změna
 * @param {string} label - kontext ("vs včera" / "dnes")
 */
function renderTrendBadge(channelId, diff, pct, label) {
    const el = document.getElementById(`card-trend-text-${channelId}`);
    if (!el) return;

    const absDiff   = Math.abs(diff).toFixed(1);
    const absPct    = Math.abs(pct).toFixed(1);
    const THRESHOLD = 0.3;

    let colorClass, iconStyle, valueText, tooltipText;

    if (Math.abs(diff) < THRESHOLD) {
        colorClass  = 'text-silver-400';
        iconStyle   = '';
        valueText   = `±${absDiff}`;
        tooltipText = `Přibližně stejné jako ${label}`;
    } else if (diff > 0) {
        colorClass  = 'text-emerald-500';
        iconStyle   = 'style="transform:rotate(-45deg);display:inline-block"';
        valueText   = `+${absDiff}`;
        tooltipText = `O ${absDiff} vyšší než ${label} (${absPct} %)`;
    } else {
        colorClass  = 'text-red-400';
        iconStyle   = 'style="transform:rotate(45deg);display:inline-block"';
        valueText   = `−${absDiff}`;
        tooltipText = `O ${absDiff} nižší než ${label} (${absPct} %)`;
    }

    el.className = `absolute bottom-3 right-4 flex items-center gap-1.5 ${colorClass} group/trend cursor-default`;
    el.innerHTML = `
        <i class="fas fa-arrow-right text-lg" ${iconStyle}></i>
        <span class="text-sm font-bold">${valueText}</span>
        <div class="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[180px] rounded-lg px-2.5 py-1.5
                    bg-midnight-violet-900 dark:bg-midnight-violet-800 text-silver-100 text-[10px] font-medium leading-snug
                    shadow-lg opacity-0 group-hover/trend:opacity-100 transition-opacity duration-150 z-10 whitespace-normal text-right">
            ${tooltipText}
            <div class="absolute top-full right-3 border-4 border-transparent border-t-midnight-violet-900 dark:border-t-midnight-violet-800"></div>
        </div>`;
}

/**
 * Zobrazí placeholder, pokud není dost dat pro výpočet trendu.
 */
function renderNoTrendData(channelId) {
    const el = document.getElementById(`card-trend-text-${channelId}`);
    if (!el) return;
    el.className = 'absolute bottom-3 right-4 flex items-center gap-1.5 text-silver-300 group/trend cursor-default';
    el.innerHTML = `
        <i class="fas fa-arrow-right text-lg"></i>
        <span class="text-sm font-bold">–</span>
        <div class="pointer-events-none absolute bottom-full right-0 mb-2 w-max rounded-lg px-2.5 py-1.5
                    bg-midnight-violet-900 dark:bg-midnight-violet-800 text-silver-100 text-[10px] font-medium
                    shadow-lg opacity-0 group-hover/trend:opacity-100 transition-opacity duration-150 z-10">
            Nedostatek dat pro výpočet trendu
            <div class="absolute top-full right-3 border-4 border-transparent border-t-midnight-violet-900 dark:border-t-midnight-violet-800"></div>
        </div>`;
}
