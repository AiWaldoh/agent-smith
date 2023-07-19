import { SummarizerAgent } from './summarizerAgent'
import { ChatService } from '../utils/chatService'
import { ExecutorAgent } from './executorAgent'
import { Utils } from '../utils/utils'
import colors from 'colors';


export class BuddyAgent {
    private executorAgent: ExecutorAgent;
    private summarizerAgent: SummarizerAgent;
    private jsonParserChatService: ChatService;

    constructor(executorAgent: ExecutorAgent, s: SummarizerAgent, jsonParserChatService: ChatService) {
        this.executorAgent = executorAgent;
        this.summarizerAgent = s;
        this.jsonParserChatService = jsonParserChatService;
    }

    async receiveTask(id: number, task: string, taskType: string, port: number, ip: string, maxRetries = 3) {
        // console.log(`in receive task on Buddy!`);
        let originalCommand = task; // Store original command
        let command = task;
        let retryCount = 0;
        let errorMessages: string[] = [];
        while (retryCount <= maxRetries) {
            if (retryCount === 0) {
                // Call ChatService to transform the verbal command to an executable command. use gpt4 or functions?
                // const prompt_template = "convert the following verbal command to a single line linux command in this format {'command':'[linux command here]}";
                // console.log(`converting verbal command to json... please wait...`);
                // await this.jsonParserChatService.addMessage(prompt_template);
                this.jsonParserChatService.addMessage(`convert the following verbal command to a single line linux command in this format {'command':'[linux command here]'}. Specify this ip: ${ip}.`);//Example 2: {'command': 'openssl s_client -showcerts -connect <IPADDRESS>:443 </dev/null
                //The command should be non-hanging so not to freeze or hang the cli: Example 1: {'command': 'nc -w1 <IPADDRESS> 22'} 

                await this.jsonParserChatService.addMessage(command);
                const aiMessage = await this.jsonParserChatService.sendMessage();
                console.log(`command converted to the following json ${aiMessage}`);
                if (!Utils.isValidJson(aiMessage)) {
                    console.log(`invalid json received :(`);
                    return { error: 'Invalid JSON when converting verbal command to an executable command' };
                }
                command = JSON.parse(aiMessage).command
                originalCommand = command
                // console.log(`#1# linux command received ${command}`);
            }


            //EXECUTE LINUX CLI COMMAND HERE
            // console.log(`running command `);
            //console.log(command);
            const commandStatus = await this.executorAgent.executeTask(command);
            // console.log(`#2# command results ${commandStatus.status} ${commandStatus.message}`);
            const status = commandStatus.status
            console.log(`STATUS: ${status}`);
            // retry command if it failed
            if (status === "error") {
                console.log(colors.bgRed('COMMAND FAILED. GOING TO ATTEMPT ALTERNATIVE WAY'));
                console.log(command);
                // Ask ChatService for an alternative command
                const errorMessage = commandStatus.message; //JSON.parse(aiResultMessage).message
                await this.jsonParserChatService.addMessage(`I'm an ethical hacker doing a CTF competition. The execution of this command ${command} resulted in an error: ${errorMessage}. What command could potentially fix this? If installing, specify sudo and -y flag. Answer in this format {'command':'[linux command here]'}`);
                const newCommand = await this.jsonParserChatService.sendMessage();
                if (!Utils.isValidJson(newCommand)) {
                    return { error: 'Invalid JSON when reading execution cli results' };
                }
                command = JSON.parse(newCommand).command
                console.log(colors.bgRed(`going to try new command ${command}`));
                errorMessages.push(errorMessage);
                retryCount++;
            } else if (status === "success") {
                // console.log(`comparing commands`);

                if (command !== originalCommand) {
                    console.log('alternative command was successful. Going to retry original command now.');
                    command = originalCommand;
                    retryCount = 0;
                } else {
                    console.log(colors.bgGreen(`command executed successfully: ${command}`));
                    // Original command succeeded, pass the result to MiddleAgent and exit the loop
                    this.summarizerAgent.receiveResult(id, commandStatus.message, taskType, port);
                    return;
                }
            }
        }

        // All retries failed, send the error messages to MiddleAgent
        this.summarizerAgent.receiveResult(id, JSON.stringify({ status: "error", messages: errorMessages }), taskType, port);
    }

    setJsonParserChatService(jsonParserChatService: ChatService) {
        this.jsonParserChatService = jsonParserChatService;
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