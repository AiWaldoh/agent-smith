import * as fs from 'fs';
import * as lockfile from 'proper-lockfile';
import AsyncLock from 'async-lock';

export class FileDatabase {
    private filePath: string;
    private lock = new AsyncLock();

    constructor(filePath: string) {
        this.filePath = filePath;
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify({}));
        }
    }

    async read(): Promise<any> {
        const data = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(data);
    }

    async write(data: any): Promise<void> {
        await this.lock.acquire('write', async () => {
            const release = await lockfile.lock(this.filePath);
            try {
                fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            } finally {
                await release();

            }
        });
    }
}
