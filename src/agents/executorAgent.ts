import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';

const execPromisified = promisify(exec);

export class ExecutorAgent {
    constructor() { }

    async executeTask(command: string): Promise<any> {
        try {
            if (command.includes('apt-get install')) {
                command = `DEBIAN_FRONTEND=noninteractive ${command}`;
            }
            // Special handling for OpenVPN command
            if (command.startsWith('sudo openvpn')) {
                return new Promise((resolve, reject) => {
                    const openvpn = spawn(command, { shell: true });

                    openvpn.stdout.on('data', (data: Buffer) => {
                        // Check for successful connection message
                        if (data.toString().includes('Initialization Sequence Completed')) {
                            resolve({
                                status: 'success',
                                message: 'OpenVPN connection established.',
                                fileName: null
                            });
                        }
                    });

                    openvpn.stderr.on('data', (data: Buffer) => {
                        reject({
                            status: 'error',
                            message: data.toString(),
                            fileName: null
                        });
                    });
                });
            }

            const { stdout, stderr } = await execPromisified(command);
            const fileName = `data/cmd-result-${Date.now()}.json`;
            let result;

            if (stderr && (command.includes('grep') || command.startsWith('curl'))) {
                // Special handling for grep and curl: treat no matches or any stderr as success with no output
                result = {
                    status: 'success',
                    message: stdout || 'No output',
                    error: null,  // no error
                    fileName
                };
            } else {
                // Default handling for all other commands
                result = {
                    status: stderr ? 'error' : 'success',
                    message: stdout,
                    error: stderr,  // include stderr as additional information
                    fileName
                };
            }

            await writeFile(fileName, JSON.stringify(result), 'utf-8');

            return result;
        } catch (error: any) { // <-- narrow down the error type here
            // Handle errors
            const fileName = `data/cmd-result-${Date.now()}.json`;
            const result = {
                status: 'error',
                message: error.stderr ? error.stderr : error.message,
                fileName
            };

            await writeFile(fileName, JSON.stringify(result), 'utf-8');

            return result;
        }
    }
}

