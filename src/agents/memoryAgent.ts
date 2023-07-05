import { WatcherAgent } from './watcherAgent'
import { FileDatabase } from '../utils/fileDatabase'

export class MemoryAgent {
    private watcherAgent: WatcherAgent;
    private db: FileDatabase;

    constructor(watcherAgent: WatcherAgent) {
        this.watcherAgent = watcherAgent;
        this.db = new FileDatabase('data/memory-database.txt');
        this.db.initData();
    }

    async saveData(id: number, data: string) {
        try {
            // Save data and notify Watcher Agent
            console.log(`saving to memory-database.txt`);
            const fileData = await this.db.getData();
            fileData[id] = data;
            await this.db.setData(fileData);

            this.watcherAgent.completeTask(id);
        } catch (error) {
            console.error(`Failed to save data: ${error}`);
            // Handle the error or rethrow it
        }
    }

}
