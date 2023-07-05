import { FileDatabase } from '../utils/fileDatabase'
import { BuddyAgent } from './buddyAgent'

export class WatcherAgent {
    private tasks: Array<{ id: number, task: string, status: string }>;
    private db: FileDatabase;
    constructor() {
        this.tasks = [];
        this.db = new FileDatabase('data/watcher-database.txt');
    }
    async init() {
        // Call initData here and make sure to await it
        await this.db.initData();
    }
    async generateTask(task: string): Promise<number> {
        console.log(`generating a task in Watcher Agent`);
        const id = this.tasks.length;
        this.tasks.push({ id, task, status: "IN PROGRESS" });

        let data = await this.db.getData();
        // Check if data is null or undefined, if so initialize it as an empty object
        if (!data) {
            console.log(`data is null. creating new variable`);
            data = {};
        }
        data[id] = { task, status: "IN PROGRESS" };

        console.log(`saving data to database`);
        await this.db.setData(data);

        return id;
    }


    async completeTask(id: number) {
        // Find the task and mark as complete
        let data = await this.db.getData();
        // Check if data is null or undefined, if so initialize it as an empty object
        if (!data) {
            data = {};
        }
        if (data[id]) {
            data[id].status = 'COMPLETE';
            await this.db.setData(data);
        }
    }

    async sendTaskToBuddy(buddyAgent: BuddyAgent, task: string) {
        const id = await this.generateTask(task);

        console.log(`calling receiveTask from Watcher to Buddy!`);
        await buddyAgent.receiveTask(id, task);
    }
}
