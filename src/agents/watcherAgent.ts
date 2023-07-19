import { FileDatabase } from '../utils/fileDatabase'
import { BuddyAgent } from './buddyAgent'
import { EventEmitter } from 'events';
import { Mutex } from 'async-mutex';
import colors from 'colors';

//watcher agent orchestrates everything on the right side.
//1. creating a new task with ID.
//2. creating tasks text file.
//3. setting and updating status.
//4. sending task to BuddyAgent. 
//Buddy Agent does it's thing with ExecutorAgent, SummarizerAgent and MemoryAgent, then MemoryAgent calls completeTask to 
//return to this file, which updates the status and emits the signal to the BrainAgent.
export class WatcherAgent extends EventEmitter {
    private tasks: Array<{ id: number, task: string, status: string, taskType: string }>; private db: FileDatabase;
    constructor() {
        super();
        this.tasks = [];
        this.db = new FileDatabase('data/tasks-database.json');
        //this.db.initData();
    }

    private dbMutex = new Mutex();

    async generateTask(task: string, taskType: string): Promise<number> {
        const release = await this.dbMutex.acquire();

        try {
            const id = this.tasks.length + 1;
            this.tasks.push({ id, task, status: "IN PROGRESS", taskType });
            let data = await this.db.read();
            if (!data) {
                console.log(`data is null. creating new variable`);
                data = {};
            }
            data[id] = { task, status: "IN PROGRESS", taskType };
            await this.db.write(data);
            return id;
        } finally {
            release();
        }
    }

    //last step before sending data to brain. parse stuff and do more stuff here
    async completeTask(id: number, result: string, port: number) {
        let taskList = await this.db.read();
        if (!taskList) {
            taskList = {};
        }
        if (taskList[id]) {
            taskList[id].status = 'COMPLETE';
            await this.db.write(taskList);
        }
        let summary = result;

        this.emit('taskComplete', { id, summary, port, taskType: taskList[id].taskType });

    }

    async sendTaskToBuddy(buddyAgent: BuddyAgent, task: string, taskType: string, port: number, ip: string) {
        const id = await this.generateTask(task, taskType);
        // console.log(colors.bgMagenta(`executing subtask ${firstTask}`));
        console.log(colors.bgMagenta(`PORT: ${port} :: task id ${id} generated for command ${task}`));
        await buddyAgent.receiveTask(id, task, taskType, port, ip);
    }
}
