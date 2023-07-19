import { WatcherAgent } from './watcherAgent'
import { FileDatabase } from '../utils/fileDatabase'

export class MemoryAgent {

    private watcherAgent: WatcherAgent;
    private db: FileDatabase;
    private fileName: string = 'data/memory-database.json';

    constructor(watcherAgent: WatcherAgent) {
        this.watcherAgent = watcherAgent;
        this.db = new FileDatabase(this.fileName);
        //this.db.initData();
    }

    async saveData(id: number, data: string, taskType: string, port: number) {
        try {
            const fileData = await this.db.read();
            fileData[id] = { data, taskType };

            await this.db.write(fileData);

            this.watcherAgent.completeTask(id, data, port);

        } catch (error) {
            console.error(`Failed to save data: ${error}`);
        }
    }
}
// async getTaskSummary(id: number): Promise<string> {
//     const fileData = await this.db.getData();
//     if (fileData[id]) {
//         return fileData[id].data;
//     } else {
//         throw new Error(`Task with id ${id} not found.`);
//     }
// }
