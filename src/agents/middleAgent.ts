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

    async receiveResult(id: number, result: string) {
        // Call ChatService to format the result
        console.log(id);
        const prompt_template = `You are doing a pen-test. format the following cli output so it look like notes. example: {message: <important information here>}`
        this.chatService.addMessage(prompt_template);
        this.chatService.addMessage(result);
        const aiMessage = await this.chatService.sendMessage();
        // console.log(aiMessage);
        // if (!Utils.isValidJson(aiMessage)) {
        //     return { error: 'Invalid JSON when converting verbal command to an executable command' };
        // }
        // //send data to memory agent
        // const formattedData = JSON.parse(aiMessage).message

        // Send to Memory Agent
        this.memoryAgent.saveData(id, JSON.parse(aiMessage).message);
    }
}
