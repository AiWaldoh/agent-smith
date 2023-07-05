# AI-Driven CTF Automation Tool

This repository contains a tool designed to automate Capture The Flag (CTF) challenges on platforms like HackTheBox. The tool uses a modular, multi-agent architecture powered by AI to execute tasks and manage the workflow of the CTF process. 

## Description

The architecture is comprised of multiple agents:

- WatcherAgent: Responsible for generating tasks and communicating with BuddyAgent to execute them. It keeps track of the tasks' status in a to-do list.

- BuddyAgent: Responsible for receiving tasks from WatcherAgent and ensuring they are executed successfully by ExecutorAgent. It communicates with MiddleAgent to format results and handles retries in case of task failure.

- ExecutorAgent: Executes commands provided by BuddyAgent and returns the execution results.

- MiddleAgent: Receives raw results from BuddyAgent, formats them and sends the formatted data to MemoryAgent.

- MemoryAgent: Appends received data to a text file and notifies WatcherAgent once the data is saved.

All agents communicate with ChatGPT through a ChatService to convert verbal commands to executable Linux commands, interpret execution results, provide alternative commands in case of errors, and format results.

The WatcherAgent and MemoryAgent use FileDatabase to manage tasks and results respectively in a persistent way. This ensures the resumption of tasks upon rerunning the application.

You must create a folder called 'data' and 'ssh' in the root of this project to store the memory. These are text files for tasks, memory and command results. 'ssh' folder is for your ovpn file.

## Getting Started

### Dependencies

- Node.js (>= 20.x)
- TypeScript (>= 4.x)
- langchain (^0.0.96)
- GPT-4 API Key in .env file
- create a folder called data/ and ssh/ in root to store openvpn key, textual memory, tasks and command results

### Note

This tool is in the development phase and the goal is to demonstrate a proof of concept on how AI can be integrated into CTF automation. The current implementation focuses on the integration of various AI models and their role in the CTF task execution workflow. The project does not claim to fully automate or solve CTF challenges but aims to showcase how AI can be employed to assist in the process. 

This tool is insecure. Please run it in a VM and strict firewall rules. You need to run 
```
sudo visudo
```
Add all approved apps to the bottom of the file or install them manually
```
username ALL=(ALL) NOPASSWD: /usr/bin/apt-get install dirb, /usr/bin/apt-get install nmap, /usr/bin/apt-get install dirbuster, /usr/sbin/openvpn

```

