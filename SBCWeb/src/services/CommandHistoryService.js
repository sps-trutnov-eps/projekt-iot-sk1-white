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
}
module.exports = CommandHistoryService;