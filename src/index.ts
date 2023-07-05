import { WatcherAgent } from './agents/watcherAgent';
import { BuddyAgent } from './agents/buddyAgent';
import { ExecutorAgent } from './agents/executorAgent';
import { MiddleAgent } from './agents/middleAgent';
import { MemoryAgent } from './agents/memoryAgent';
import { ChatService } from './utils/chatService';
import dotenv from 'dotenv'

dotenv.config()
async function main() {
    // Initialize the ChatService
    console.log(`init ChatService`);
    const chatService = new ChatService("gpt-4", "you are a json converting AI. You only answer questions in valid json format.");

    // Initialize the WatcherAgent first because MemoryAgent needs it
    const watcherAgent = new WatcherAgent();

    // Initialize the other agents
    const memoryAgent = new MemoryAgent(watcherAgent);
    const middleAgent = new MiddleAgent(memoryAgent, chatService);
    const executorAgent = new ExecutorAgent();
    const buddyAgent = new BuddyAgent(executorAgent, middleAgent, chatService);

    await watcherAgent.init();

    //TODO: Manage multiple tasks here
    //this returns an error. handle errors
    console.log(`sending task #1`);
    await watcherAgent.sendTaskToBuddy(buddyAgent, "connect to openvpn ip 10.10.11.208 using the key.ovpn file in the ssh/ folder and run it as sudo in the background with &")
    //watcherAgent.sendTaskToBuddy(buddyAgent, "run dirb on ip 192.168.5.1"); 10.10.11.208
    console.log(`sending task #2`);
    watcherAgent.sendTaskToBuddy(buddyAgent, "run nmap on ip 10.10.11.208");
}

// Run the main function
main().catch(error => console.error(error));
