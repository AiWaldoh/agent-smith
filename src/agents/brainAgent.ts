import { EventEmitter } from 'events';
import { WatcherAgent } from './watcherAgent';
import { BuddyAgent } from './buddyAgent';
import { ExecutorAgent } from './executorAgent';
import { SummarizerAgent } from './summarizerAgent';
import { MemoryAgent } from './memoryAgent';
import { ChatService } from '../utils/chatService';
import { FileDatabase } from '../utils/fileDatabase';
import colors from 'colors';

interface Task {
    id: number;
    port: number;
    command: string;
}

interface PortInfo {
    port: number;
    tasks: Task[];
}

export class BrainAgent extends EventEmitter {
    //private summarizerAgentPrompt: string = '';
    private jsonAgentPrompt: string = '';
    private _ip!: string;
    private subtasksMap: Map<number, string[]> = new Map();
    watcherAgent!: WatcherAgent;
    buddyAgent!: BuddyAgent;
    executorAgent!: ExecutorAgent;
    summarizerAgent!: SummarizerAgent;
    memoryAgent!: MemoryAgent;
    jsonParserChatService!: ChatService;
    summarizerChatService!: ChatService;
    db!: FileDatabase;
    private portAgents: Map<number, BuddyAgent> = new Map();

    constructor() {
        super();
        this.initVariables();
        this.initObjects();

    }
    private initVariables() {
        this._ip = '';
        //this.summarizerAgentPrompt = "You are an ethical hacker doing a pen-test. You will summarize the following cli output while keeping every important detail. example: {message: '<important pentest information here>'}";
        this.jsonAgentPrompt = "you are a json converting AI. You only answer questions in valid json format. ";
    }

    private initObjects() {

        this.db = new FileDatabase('memory-database.json');

        this.summarizerChatService = new ChatService("gpt-4", this.jsonAgentPrompt)
        this.jsonParserChatService = new ChatService("gpt-4", this.jsonAgentPrompt);

        //executes cli commands
        this.executorAgent = new ExecutorAgent();

        //the watcher doesnt need any classes in constructor. it's sendTaskToBuddy takes the buddy via function param
        //watcherAgent.completeTask is called in memoryAgent to signal the process is done (process is summarizing and saving to memory)
        this.watcherAgent = new WatcherAgent();

        //needs to call watcherAgent.completeTask which will parse file and emit back to brainAgent.
        this.memoryAgent = new MemoryAgent(this.watcherAgent);

        //now summarizer needs memory agent because the flow is first summarizing the data and then saving it to memory.
        //this means summarizerAgent will first summarize the data with ChatService, then call memoryAgent.saveData(id, result, taskType, port) to go to the next step (which will be saving data to file)
        this.summarizerAgent = new SummarizerAgent(this.memoryAgent, this.summarizerChatService);

        //buddyAgent needs the executorAgent
        this.buddyAgent = new BuddyAgent(this.executorAgent, this.summarizerAgent, this.jsonParserChatService);

        //set listener for event emitter
        this.watcherAgent.on('taskComplete', (taskResult) => this.handleTaskComplete(taskResult));
    }

    private async handleTaskComplete(taskResult: any) {

        let portNumber = parseInt(taskResult.port, 10);

        //this happens once, at the beginning of app, when nmap is first run.
        if (taskResult.taskType === "nmap") {
            // This is an nmap task
            const nmapScanResults = JSON.parse(taskResult.summary);

            for (const result of nmapScanResults) {
                let port = parseInt(result.port, 10);
                if (result.state === "open") {
                    //LAUNCH PORT SPECIFIC AGENTS

                    //create an Agent specific to a port
                    const portAgent: BuddyAgent = this.createOrGetPortAgent(port);

                    //get 3 tasks for port from chatgpt
                    const tasksAmount: number = 3;
                    let tasks = await this.getTasksForPort(port, tasksAmount);
                    // console.log(tasks);
                    //save subtasks to map
                    this.subtasksMap.set(port, tasks.map(taskObject => taskObject.task));
                    // console.log(this.subtasksMap);
                    //execute first sub task
                    if (tasks.length > 0) {
                        const firstTask = tasks[0].task;

                        await this.dispatchTask(portAgent, firstTask, port);

                        // Remove first task after dispatching
                        let subtasks = this.subtasksMap.get(port);
                        if (subtasks) {
                            subtasks = subtasks.filter(task => task !== firstTask);
                            this.subtasksMap.set(port, subtasks);
                        }
                    }
                }
            }
        } else {
            //most of the time the app will be in this logic
            //get existing agent for specific port
            const portAgent = this.getPortAgent(portNumber);

            //determine what task to run next
            const nextSubtask = this.getNextSubtask(portNumber);


            if (nextSubtask) {
                console.log('');
                console.log(colors.magenta(`Executing next task: ${nextSubtask}`));
                // Remove the task from the subtasksMap before dispatching it
                let subtasks = this.subtasksMap.get(portNumber);
                if (subtasks) {
                    subtasks = subtasks.filter(task => task !== nextSubtask);
                    this.subtasksMap.set(portNumber, subtasks);
                }
                // Now dispatch the task
                await this.dispatchTask(portAgent, nextSubtask, portNumber);

            } else {
                console.log(`All subtasks for port ${portNumber} are complete.`);
            }
        }
    }
    private createOrGetPortAgent(port: number): BuddyAgent {
        if (!this.portAgents.has(port)) {
            console.log(colors.yellow(`creating an agent for port ${port}`));
            const portAgent = new BuddyAgent(this.executorAgent, this.summarizerAgent, this.jsonParserChatService);
            this.portAgents.set(port, portAgent);
        }
        return this.getPortAgent(port);
    }

    private getPortAgent(port: number): BuddyAgent {
        const portAgent = this.portAgents.get(port);
        if (!portAgent) {
            throw new Error(`No agent found for port ${port}`);
        }
        return portAgent;
    }

    //first time nmap runs use this to get initial tasks
    private async getTasksForPort(port: number, taskAmount: number): Promise<{ task: string }[]> {
        // console.log(`calling GET TASK FOR PORT`);
        // if (port === 22) {
        //     return JSON.parse(`{
        //         "tasks": [
        //           {"task": "Perform a banner grab on port 22 to determine the SSH version"},
        //           {"task": "Check for any known vulnerabilities associated with the determined SSH version"}
        //         ]
        //       }`).tasks;
        // } else if (port === 80) {
        //     return JSON.parse(`{
        //         "tasks": [
        //           {
        //             "task": "Perform a HTTP GET request to check for web server details and potential vulnerabilities"
        //           }
        //         ]
        //       }`).tasks;
        // } else if (port === 443) {
        //     return JSON.parse(`{
        //         "tasks": [
        //           {
        //             "task": "Perform an SSL/TLS scan using tools like openssl or sslyze to identify the SSL version and cipher suite"
        //           },
        //           {
        //             "task": "Check for Heartbleed vulnerability if OpenSSL version is detected"
        //           }
        //         ]
        //       }`).tasks;
        // } else {
        //     return JSON.parse(`{
        //         "tasks": [
        //           {"task": "Perform a banner grab on port 22 to determine the SSH version"}
        //         ]
        //       }`).tasks;
        // }

        let tasksJson = await this.getTasksFromAPI(`You are an ethical hacker doing the recon phase during a pentest. you just found port ${port} open. give me ${taskAmount} tasks that I should do for ip ${this.ip} on port ${port}. Example: {tasks: [{task}, {task}, {task}]}.`);
        console.log(tasksJson);
        let tasks = JSON.parse(tasksJson).tasks;
        return tasks;
    }

    //add AI logic here to make getting next sub task more involved by looking at big picture and current progress
    getNextSubtask(port: number): string | undefined {
        let subtasks = this.subtasksMap.get(port);
        console.log(port, subtasks);
        if (subtasks && subtasks.length > 0) {
            const nextTask = subtasks[0];  // Just take the first task
            return nextTask;
        } else {
            return undefined;
        }
    }



    get ip(): string {
        return this._ip;
    }

    set ip(value: string) {
        this._ip = value;
    }
    public async start(ip: string) {
        this.ip = ip;
        console.log(`Performing initial Nmap scan on ${this.ip}`);
        await this.runNmapScan(this.ip);
    }

    private async runNmapScan(ip: string): Promise<void> {
        const cli_command = `nmap --top-ports 10 192.168.5.1 | grep -E 'open|closed' | awk '{print "{\\"port\\":\\"" $1 "\\","\\"state\\":\\"" $2 "\\","\\"service\\":\\"" $3 "\\"}"}' | jq -s -c .`;

        this.watcherAgent.sendTaskToBuddy(this.buddyAgent, cli_command, "nmap", 999, ip)
    }

    async getTasksFromAPI(message: string): Promise<string> {
        await this.jsonParserChatService.addMessage(message)
        const aiMessage = await this.jsonParserChatService.sendMessage();
        return aiMessage
    }

    async dispatchTask(agent: BuddyAgent, task: string, port: number) {
        // RESET AKA Create a new ChatService for JSON parsing each time
        const newJsonParserChatService = new ChatService("gpt-4", this.jsonAgentPrompt);
        // Update the agent's jsonParserChatService
        agent.setJsonParserChatService(newJsonParserChatService);
        // Now dispatch the task
        await this.watcherAgent.sendTaskToBuddy(agent, task, "subtask", port, this.ip);

    }

}
