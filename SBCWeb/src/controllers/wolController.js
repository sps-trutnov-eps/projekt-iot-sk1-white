const { sendMagicPacket } = require('../services/wolService');
const CommandService = require('../services/commandService');

async function wakeByCommand(req, res) {
    const { commandId } = req.body;
    if (!commandId) return res.json({ success: false, message: 'Chybí ID příkazu.' });

    try {
        const cmd = CommandService.getCommandById(commandId);
        if (!cmd) return res.json({ success: false, message: 'Příkaz nenalezen.' });
        if (cmd.type !== 'wol') return res.json({ success: false, message: 'Příkaz není WOL typ.' });

        await sendMagicPacket(cmd.value || cmd.command);
        res.json({ success: true, message: `Magic packet odeslán` });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
}

async function wake(req, res) {
    const { mac } = req.body;
    if (!mac) return res.json({ success: false, message: 'Chybí MAC adresa.' });

    try {
        await sendMagicPacket(mac);
        res.json({ success: true, message: `Magic packet odeslán na ${mac}` });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
}

module.exports = { wake, wakeByCommand };