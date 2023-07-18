import { EventEmitter } from 'events';
import { WatcherAgent } from './watcherAgent';
import { BuddyAgent } from './buddyAgent';
import { ExecutorAgent } from './executorAgent';
import { MiddleAgent } from './middleAgent';
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
    private _ip: string;
    private taskSummary: Map<number, PortInfo> = new Map();
    private subtasksMap: Map<number, string[]> = new Map();
    watcherAgent: WatcherAgent;
    buddyAgent: BuddyAgent;
    executorAgent: ExecutorAgent;
    middleAgent: MiddleAgent;
    memoryAgent: MemoryAgent;
    chatService: ChatService;
    db: FileDatabase;
    private portAgents: Map<number, BuddyAgent> = new Map();

    constructor() {
        super();
        this._ip = '';
        this.chatService = new ChatService("gpt-4", "you are a json converting AI. You only answer questions in valid json format.");
        this.watcherAgent = new WatcherAgent();
        this.memoryAgent = new MemoryAgent(this.watcherAgent);
        this.middleAgent = new MiddleAgent(this.memoryAgent, this.chatService);
        this.executorAgent = new ExecutorAgent();
        this.buddyAgent = new BuddyAgent(this.executorAgent, this.middleAgent, this.chatService);
        this.db = new FileDatabase('memory-database.json');
        this.watcherAgent.on('taskComplete', (taskResult) => this.handleTaskComplete(taskResult));
    }

    private async handleTaskComplete(taskResult: any) {

        let portNumber = parseInt(taskResult.port, 10);

        if (taskResult.taskType === "nmap") {
            // This is an nmap task
            const nmapScanResults = JSON.parse(taskResult.summary);
            for (const result of nmapScanResults) {
                let port = parseInt(result.port, 10);
                if (result.state === "open") {
                    const portAgent = this.createOrGetPortAgent(port);
                    let tasks = await this.getTasksForPort(port);
                    this.subtasksMap.set(port, tasks.map(taskObject => taskObject.task));
                    if (tasks.length > 0) {
                        const firstTask = tasks[0].task;
                        console.log(colors.bgMagenta(`executing first subtask ${firstTask}`));
                        this.dispatchTask(portAgent, firstTask, port);
                    }
                }
            }
        } else {
            // This is a subtask
            const portAgent = this.getPortAgent(portNumber);
            const nextSubtask = this.getNextSubtask(portNumber);
            if (nextSubtask) {
                console.log(colors.magenta(`Executing next task ${nextSubtask}`));
                this.dispatchTask(portAgent, nextSubtask, portNumber);
            } else {
                console.log(`All subtasks for port ${portNumber} are complete.`);
            }
        }
    }
    private createOrGetPortAgent(port: number): BuddyAgent {
        if (!this.portAgents.has(port)) {
            console.log(colors.yellow(`creating an agent for port ${port}`));
            const portAgent = new BuddyAgent(this.executorAgent, this.middleAgent, this.chatService);
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

    private async getTasksForPort(port: number): Promise<{ task: string }[]> {
        let tasksJson = await this.getTasksFromAPI(`You are an ethical hacker doing the recon phase during a pentest. you just found port ${port} open. give me 3 tasks that I should do for ip ${this.ip} on port ${port}. ex {tasks: [{task}, {task}, {task}]}. Commands should be non-hanging so the call does not freeze the cli: Example 1: nc -w 1 ${this.ip} 22 Example 2: openssl s_client -showcerts -connect 192.168.5.1:443 </dev/null`);
        let tasks = JSON.parse(tasksJson).tasks;
        return tasks;
    }

    getNextSubtask(port: number): string | undefined {
        // Get the array of subtasks for this port
        let subtasks = this.subtasksMap.get(port);
        if (subtasks && subtasks.length > 0) {
            // Remove the first subtask from the array and return it
            return subtasks.shift();
        } else {
            // No more subtasks for this port
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

        this.watcherAgent.sendTaskToBuddy(this.buddyAgent, cli_command, "nmap", 999)
    }

    async getTasksFromAPI(message: string): Promise<string> {
        await this.chatService.addMessage(message)
        const aiMessage = await this.chatService.sendMessage();
        return aiMessage
    }

    async dispatchTask(agent: BuddyAgent, task: string, port: number) {
        // console.log(`sending task`);
        await this.watcherAgent.sendTaskToBuddy(agent, task, "subtask", port);
    }

}
