import { WatcherAgent } from './watcherAgent'
import { FileDatabase } from '../utils/fileDatabase'
import { CLIENT_RENEG_LIMIT } from 'tls';

export class MemoryAgent {
    async getTaskSummary(id: number): Promise<string> {
        const fileData = await this.db.getData();
        if (fileData[id]) {
            return fileData[id].data;
        } else {
            throw new Error(`Task with id ${id} not found.`);
        }
    }
    private watcherAgent: WatcherAgent;
    private db: FileDatabase;

    constructor(watcherAgent: WatcherAgent) {
        this.watcherAgent = watcherAgent;
        this.db = new FileDatabase('data/memory-database.json');
        this.db.initData();
    }

    async saveData(id: number, data: string, taskType: string, port: number) {
        try {
            // console.log(`saving to memory-database.json`);
            const fileData = await this.db.getData();
            fileData[id] = { data, taskType };

            await this.db.setData(fileData);
            // console.log(`summary saved to memory!`);

            if (taskType === 'subtask') {
                this.watcherAgent.completeSubtask(id, data, port);
            } else {
                this.watcherAgent.completeTask(id, data);
            }
        } catch (error) {
            console.error(`Failed to save data: ${error}`);
        }
    }


}
