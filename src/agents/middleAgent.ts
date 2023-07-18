import { ChatService } from '../utils/chatService'
import { MemoryAgent } from './memoryAgent'
import { Utils } from '../utils/utils'
export class MiddleAgent {
    private memoryAgent: MemoryAgent;
    private chatService: ChatService;

    constructor(memoryAgent: MemoryAgent, chatService: ChatService) {
        this.memoryAgent = memoryAgent;
        this.chatService = chatService;
    }

    async receiveResult(id: number, result: string, taskType: string, port: number) {
        // console.log(`in middle agent. task id : ${id}`);

        if (!Utils.isValidJson(result)) {
            //console.log(`not valid json so summarizing to chatgpt ${result}`);
            const prompt_template = `You are doing a pen-test. format the following cli output so it look like notes. example: {message: <important information here>}`
            this.chatService.addMessage(prompt_template);
            this.chatService.addMessage(result);
            result = await this.chatService.sendMessage();
            // console.log(`summary: ${result}`);
            result = JSON.parse(result).message;
            //console.log(result);
        }

        this.memoryAgent.saveData(id, result, taskType, port);
    }

}
