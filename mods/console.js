// ==UserScript==
// @name         Sandboxels Console Mod
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adds a custom in-game console for commands and logging in Sandboxels.
// @author       ChatGPT / Your Name
// @match        https://sandboxels.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Create console object
    window.modConsole = {
        logs: [],
        commands: {},
        isOpen: false,
        element: null,
        range: { min: 0, max: 100 }, // Default range

        // Add log entry
        log: function(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = {
                timestamp: timestamp,
                message: message,
                type: type
            };
            this.logs.push(logEntry);

            // Keep only last 100 logs
            if (this.logs.length > 100) {
                this.logs.shift();
            }

            // Update console display if open
            if (this.isOpen && this.element) {
                this.updateDisplay();
            }
        },

        // Register a command
        registerCommand: function(name, description, callback) {
            this.commands[name] = {
                description: description,
                callback: callback
            };
            this.log(`Command registered: ${name} - ${description}`, 'system');
        },

        // Execute a command
        executeCommand: function(input) {
            const parts = input.trim().split(' ');
            const command = parts[0];
            const args = parts.slice(1);

            if (command === 'log') {
                this.logs.forEach(log => this.log(`[${log.timestamp}] ${log.message}`, log.type));
                return;
            }

            if (command === 'view_range') {
                this.highlightRange();
                return;
            }

            if (command === 'spawn') {
                const range = args.length === 2 ? { min: parseInt(args[0]), max: parseInt(args[1]) } : this.range;
                this.spawnElement(range);
                return;
            }

            if (command === 'help') {
                this.log('Available commands:', 'info');
                for (const [name, cmd] of Object.entries(this.commands)) {
                    this.log(`  ${name}: ${cmd.description}`, 'info');
                }
                return;
            }

            if (command === 'clear') {
                this.logs = [];
                this.updateDisplay();
                return;
            }

            if (this.commands[command]) {
                try {
                    this.commands[command].callback(args);
                } catch (error) {
                    this.log(`Error executing command '${command}': ${error.message}`, 'error');
                    console.error(`ModConsole: Error executing command '${command}':`, error);
                }
            } else {
                this.log(`Unknown command: ${command}. Type 'help' for available commands.`, 'error');
            }
        },

        // Highlight the selected range
        highlightRange: function() {
            const highlightDiv = document.createElement('div');
            highlightDiv.style.position = 'absolute';
            highlightDiv.style.left = `${this.range.min}px`;
            highlightDiv.style.width = `${this.range.max - this.range.min}px`;
            highlightDiv.style.height = '100%';
            highlightDiv.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // Faint transparent yellow
            document.body.appendChild(highlightDiv);
            setTimeout(() => highlightDiv.remove(), 3000); // Remove highlight after 3 seconds
        },

        // Spawn element within a specified range
        spawnElement: function(range) {
            // Logic to spawn element in the game
            this.log(`Spawning element between ${range.min} and ${range.max}`, 'info');
            // Example spawn logic (to be replaced with actual game logic)
            for (let i = range.min; i <= range.max; i++) {
                // Spawn logic here
            }
        },

        // Create console UI
        createUI: function() {
            if (this.element) return;
            this.log('Creating Mod Console UI...', 'system');

            // Create console container
            const consoleDiv = document.createElement('div');
            consoleDiv.id = 'mod-console';
            consoleDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                height: 300px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                overflow-y: auto;
                padding: 10px;
                border-radius: 5px;
                z-index: 1000;
            `;
            document.body.appendChild(consoleDiv);
            this.element = consoleDiv;
        },

        // Update console display
        updateDisplay: function() {
            if (!this.element) return;
            this.element.innerHTML = this.logs.map(log => `<div class="${log.type}">${log.timestamp}: ${log.message}</div>`).join('');
        }
    };

    // Register commands
    window.modConsole.registerCommand('spawn', 'Spawn an element within a specified range.', (args) => {
        const min = parseInt(args[0]) || window.modConsole.range.min;
        const max = parseInt(args[1]) || window.modConsole.range.max;
        window.modConsole.spawnElement({ min, max });
    });

    window.modConsole.registerCommand('view_range', 'Highlight the selected range.', () => {
        window.modConsole.highlightRange();
    });

    // Create console UI
    window.modConsole.createUI();
})();
