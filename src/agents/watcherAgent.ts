import { FileDatabase } from '../utils/fileDatabase'
import { BuddyAgent } from './buddyAgent'
import { EventEmitter } from 'events';

export class WatcherAgent extends EventEmitter {
    private tasks: Array<{ id: number, task: string, status: string, taskType: string }>; private db: FileDatabase;
    constructor() {
        super();
        this.tasks = [];
        this.db = new FileDatabase('data/tasks-database.json');
        this.db.initData();
    }

    async generateTask(task: string, taskType: string): Promise<number> {
        // console.log(`generating a task in Watcher Agent`);
        const id = this.tasks.length + 1;
        this.tasks.push({ id, task, status: "IN PROGRESS", taskType });

        let data = await this.db.getData();
        if (!data) {
            console.log(`data is null. creating new variable`);
            data = {};
        }
        data[id] = { task, status: "IN PROGRESS", taskType };

        // console.log(`saving data to database`);
        await this.db.setData(data);

        return id;
    }


    async completeTask(id: number, summary: string) {
        let taskList = await this.db.getData();
        if (!taskList) {
            taskList = {};
        }
        if (taskList[id]) {
            taskList[id].status = 'COMPLETE';
            await this.db.setData(taskList);
        }
        this.emit('taskStatusComplete', { id, summary, taskType: taskList[id].taskType });
    }

    async completeSubtask(id: number, result: string, port: number) {
        let taskList = await this.db.getData();
        if (!taskList) {
            taskList = {};
        }
        if (taskList[id]) {
            taskList[id].status = 'COMPLETE';
            await this.db.setData(taskList);
        }
        this.emit('subtaskComplete', { id, result, port });
    }

    async sendTaskToBuddy(buddyAgent: BuddyAgent, task: string, taskType: string, port: number) {
        const id = await this.generateTask(task, taskType);

        // console.log(`calling receiveTask from Watcher to Buddy!`);
        await buddyAgent.receiveTask(id, task, taskType, port);
    }
}
