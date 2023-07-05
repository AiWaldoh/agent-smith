import fs from 'fs';
import { promisify } from 'util';

export class FileDatabase {
    private filepath: string;
    private writeFileAsync: any;
    private readFileAsync: any;

    constructor(filepath: string) {
        this.filepath = filepath;
        this.writeFileAsync = promisify(fs.writeFile);
        this.readFileAsync = promisify(fs.readFile);
    }

    async initData() {
        // Check if file exists, if not, initialize it
        try {
            await this.readFileAsync(this.filepath);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                await this.writeFileAsync(this.filepath, JSON.stringify({}), 'utf8');
            }
        }
    }

    async getData(): Promise<any> {
        const data = await this.readFileAsync(this.filepath, 'utf8');

        // Check if the file is empty, if so, return an empty object
        if (!data || data.trim() === '') {
            return {};
        }

        return JSON.parse(data);
    }

    async setData(data: any) {
        await this.writeFileAsync(this.filepath, JSON.stringify(data), 'utf8');
    }
}
