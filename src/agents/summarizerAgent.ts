import { ChatService } from '../utils/chatService'
import { MemoryAgent } from './memoryAgent'
import { Utils } from '../utils/utils'

export class SummarizerAgent {
    private memoryAgent: MemoryAgent;
    private chatService: ChatService;

    constructor(memoryAgent: MemoryAgent, chatService: ChatService) {
        this.memoryAgent = memoryAgent;
        this.chatService = chatService;
    }

    async receiveResult(id: number, result: string, taskType: string, port: number) {
        if (!Utils.isValidJson(result)) {
            const prompt_template = `You are an ethical hacker doing a pen-test. You will summarize the following cli output while keeping every important detail. example: {message: '<important pentest information here>'}`
            this.chatService.addMessage(prompt_template);
            this.chatService.addMessage(result);
            result = await this.chatService.sendMessage();
            result = JSON.parse(result).message;
        }

        this.memoryAgent.saveData(id, result, taskType, port);
    }

}
