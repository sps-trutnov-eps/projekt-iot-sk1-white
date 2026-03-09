const CommandHistoryRepository = require('../repositories/CommandHistoryRepository');

class CommandHistoryService {
    static logExecution(commandId, status, output, errorOutput = null) {
        return CommandHistoryRepository.create({
            command_id: commandId,
            status: status,
            output: output,
            error_output: errorOutput
        });
    }

    static getHistoryForCommand(commandId) {
        return CommandHistoryRepository.getByCommandId(commandId);
    }

    // Přidej do třídy CommandHistoryService
    static updateExecution(historyId, status, output, errorOutput = null) {
        return CommandHistoryRepository.update(historyId, status, output, errorOutput);
    }

    static getRecent(serverId = null, limit = 10) {
        // Zde můžeme přidat validaci, aby limit byl vždy číslo
        const parsedLimit = parseInt(limit, 10) || 10;
        
        // Pokud přijde serverId jako string z URL (např. "?serverId=1"), převedeme ho
        const parsedServerId = serverId ? parseInt(serverId, 10) : null;

        // Předáme to do Repozitáře, který jsme si napsali minule
        return CommandHistoryRepository.getRecent(parsedServerId, parsedLimit);
    }

    static getExecutionById(id) {
        if (!id) {
            throw new Error('ID historie je povinné.');
        }
        return CommandHistoryRepository.getById(id);
    }
    // src/services/CommandHistoryService.js

    static deleteEntry(id) {
        if (!id) throw new Error("ID záznamu je povinné.");
        
        const result = CommandHistoryRepository.delete(id);
        // result.changes vrací počet ovlivněných řádků (u SQLite)
        return result.changes > 0;
    }

    static deleteAll() {
    return CommandHistoryRepository.deleteAll();
    }
}
module.exports = CommandHistoryService;