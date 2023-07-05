import { MiddleAgent } from './middleAgent'
import { ChatService } from '../utils/chatService'
import { ExecutorAgent } from './executorAgent'
import { Utils } from '../utils/utils'


export class BuddyAgent {
    private executorAgent: ExecutorAgent;
    private middleAgent: MiddleAgent;
    private chatService: ChatService;

    constructor(executorAgent: ExecutorAgent, middleAgent: MiddleAgent, chatService: ChatService) {
        this.executorAgent = executorAgent;
        this.middleAgent = middleAgent;
        this.chatService = chatService;
    }

    async receiveTask(id: number, task: string, maxRetries = 3) {
        console.log(`in receive task on Buddy!`);
        let originalCommand = task; // Store original command
        let command = task;
        let retryCount = 0;
        let errorMessages: string[] = [];
        while (retryCount <= maxRetries) {
            if (retryCount === 0) {
                // Call ChatService to transform the verbal command to an executable command. use gpt4 or functions?
                const prompt_template = "convert the following verbal command to a single line linux command in this format {'command':'[linux command here]}";
                console.log(`sending command to chatgpt: ${command}`);
                await this.chatService.addMessage(prompt_template)
                await this.chatService.addMessage(command);
                const aiMessage = await this.chatService.sendMessage();
                if (!Utils.isValidJson(aiMessage)) {
                    console.log(`invalid json received :(`);
                    return { error: 'Invalid JSON when converting verbal command to an executable command' };
                }
                command = JSON.parse(aiMessage).command
                originalCommand = command
                console.log(`#1# linux command received ${command}`);
            }


            console.log(`running command ${command}`);
            const commandStatus = await this.executorAgent.executeTask(command);
            console.log(`#2# command results ${commandStatus.status} ${commandStatus.message}`);
            const status = commandStatus.status
            console.log(`STATUS: ${status}`);
            // retry command if it failed
            if (status === "error") {
                // Ask ChatService for an alternative command
                const errorMessage = commandStatus.message; //JSON.parse(aiResultMessage).message
                await this.chatService.addMessage(`The execution of the command resulted in an error: ${errorMessage}. What command should I try next? If installing, specify sudo and -y flag. Answer in this format {'command':'[linux command here]'}`);
                const newCommand = await this.chatService.sendMessage();
                if (!Utils.isValidJson(newCommand)) {
                    return { error: 'Invalid JSON when reading execution cli results' };
                }
                command = JSON.parse(newCommand).command
                console.log(`going to try new command ${command}`);
                errorMessages.push(errorMessage);
                retryCount++;
            } else if (status === "success") {
                console.log(`comparing commands`);

                if (command !== originalCommand) {
                    command = originalCommand;
                    retryCount = 0;
                } else {
                    // Original command succeeded, pass the result to MiddleAgent and exit the loop
                    this.middleAgent.receiveResult(id, commandStatus.message);
                    return;
                }
            }
        }

        // All retries failed, send the error messages to MiddleAgent
        this.middleAgent.receiveResult(id, JSON.stringify({ status: "error", messages: errorMessages }));
    }
}














           //await this.chatService.addMessage("Determine if the following linux command executed successfully. answer in this format {'status':'success'} or {'status':'error'}")
            //await this.chatService.addMessage(commandStatus);
            //const aiResultMessage = await this.chatService.sendMessage();
            //console.log(`#3# status : ${aiResultMessage}`);
            //if (!Utils.isValidJson(aiResultMessage)) {
            //    return { error: 'Invalid JSON when reading execution cli results' };
            //}
            //const status = JSON.parse(aiResultMessage).status