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

        this.watcherAgent.on('subtaskComplete', async (taskResult) => {
            //console.log(colors.blue(taskResult));
            let portNumber = parseInt(taskResult.port, 10);  // portNumber is now 443
            //console.log(portNumber);
            const portAgent = this.portAgents.get(portNumber)!;
            //console.log(portAgent);
            const nextSubtask = this.getNextSubtask(portNumber);
            if (nextSubtask) {
                console.log(colors.america(`Executing next task ${nextSubtask}`));
                this.dispatchTask(portAgent, nextSubtask, portNumber);
            } else {
                console.log(`All subtasks for port ${portNumber} are complete.`);
            }
        });


        this.watcherAgent.on('taskStatusComplete', async (taskResult) => {
            console.log(`nmap scan complete!`);
            const nmapScanResults = JSON.parse(taskResult.summary);

            for (const result of nmapScanResults) {
                let port = result.port;
                const state = result.state;
                console.log(port);
                port = parseInt(port, 10);  // portNumber is now 443

                if (state === "open") {
                    if (!this.portAgents.has(port)) {
                        const portAgent = new BuddyAgent(this.executorAgent, this.middleAgent, this.chatService);
                        this.portAgents.set(port, portAgent);
                    }
                    console.log(colors.yellow(`creating an agent for port ${port}`));
                    const portAgent = this.portAgents.get(port)!;
                    let subtasksJson = await this.decomposeTask(`you just found port ${port} open during a CTF competition. give me 3 tasks for recon for ip ${this.ip} on port ${port}. ex {tasks: [{task}, {task}, {task}]}`);
                    // console.log(`subtasks for port ${80}`);
                    let subtasksObject = JSON.parse(subtasksJson) as { tasks: { task: string }[] };
                    let subtasks = subtasksObject.tasks;
                    this.subtasksMap.set(port, subtasksObject.tasks.map(taskObject => taskObject.task));
                    console.log(subtasks);
                    if (subtasks.length > 0) {
                        const firstSubtask = subtasks[0];
                        const taskValue = firstSubtask.task;  // Access the "task" property of the first subtask
                        console.log(colors.bgMagenta(`executing first subtask ${taskValue}`));
                        this.dispatchTask(portAgent, taskValue, port);
                    }
                }
            }

        });
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

    async decomposeTask(message: string): Promise<string> {
        await this.chatService.addMessage(message)
        const aiMessage = await this.chatService.sendMessage();
        return aiMessage
    }

    async dispatchTask(agent: BuddyAgent, task: string, port: number) {
        // console.log(`sending task`);
        await this.watcherAgent.sendTaskToBuddy(agent, task, "subtask", port);
    }

}
