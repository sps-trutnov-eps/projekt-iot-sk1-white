/**
 * Přeloží pole eventů pomocí i18next (req.t).
 * Eventy s message_key se přeloží do aktuálního jazyka uživatele.
 * Eventy bez message_key (stará data) zobrazí původní message string.
 */
function translateEvents(events, t) {
    return events.map(event => {
        if (!event.message_key) return event;

        let params = {};
        if (event.message_params) {
            try {
                params = typeof event.message_params === 'string'
                    ? JSON.parse(event.message_params)
                    : event.message_params;
            } catch (_) {}
        }

        return {
            ...event,
            message: t(`events.${event.message_key}`, params)
        };
    });
}

module.exports = translateEvents;
