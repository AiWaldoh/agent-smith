import { ChatOpenAI } from 'langchain/chat_models/openai'
import {
    HumanChatMessage,
    SystemChatMessage,
    AIChatMessage
} from 'langchain/schema'

export class ChatService {
    async getNextSteps(taskSummary: string): Promise<string> {
        throw new Error('Method not implemented.')
    }

    private chat: ChatOpenAI
    private messages: (HumanChatMessage | SystemChatMessage | AIChatMessage)[]
    private systemMessage: SystemChatMessage


    constructor(
        modelName: string = 'gpt-3.5-turbo',
        systemMessage: string = 'You are a helpful assistant'
    ) {
        this.chat = new ChatOpenAI({
            modelName: modelName,
            openAIApiKey: process.env.OPENAI_API_KEY as string,
            temperature: 0
        })

        this.systemMessage = new SystemChatMessage(systemMessage)
        this.messages = [this.systemMessage]
    }

    async addMessage(message: string): Promise<void> {
        this.messages.push(new HumanChatMessage(message))
    }
    async getTotalTokens(): Promise<number> {
        return (await this.chat.getNumTokensFromMessages(this.messages)).totalCount
    }

    async sendMessage(): Promise<string> {
        try {
            const response = await this.chat.call(this.messages);
            this.messages.push(response);
            return response.text;
        } catch (error) {
            console.error('An error occurred while sending the message:', error);
            // Handle the error or return a default value
            return 'Error: Failed to send message';
        }
    }

    get modelName() {
        return this.chat.modelName
    }

    set modelName(value: string) {
        this.chat.modelName = value
    }

    resetMessages(): void {
        this.messages = [this.systemMessage]
    }
}
