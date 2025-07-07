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

    window.stored_range = null;
    const highlightColor = 'rgba(255, 255, 0, 0.2)';

    const createOverlayCanvas = () => {
        let overlay = document.getElementById('range-highlight-canvas');
        if (!overlay) {
            overlay = document.createElement('canvas');
            overlay.id = 'range-highlight-canvas';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 9998;
            `;
            document.body.appendChild(overlay);
        }
        overlay.width = window.innerWidth;
        overlay.height = window.innerHeight;
        return overlay.getContext('2d');
    };

    window.modConsole = {
        logs: [],
        commands: {},
        isOpen: false,
        element: null,

        log: function(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = {
                timestamp,
                message,
                type
            };
            this.logs.push(logEntry);
            if (this.logs.length > 100) this.logs.shift();
            if (this.isOpen && this.element) this.updateDisplay();
        },

        viewLogs: function() {
            if (!this.logs.length) return this.log("No logs to show.", 'info');
            this.logs.forEach(log => {
                const color = this.getLogColor(log.type);
                console.log(`%c[${log.timestamp}] ${log.message}`, `color: ${color}`);
            });
        },

        registerCommand: function(name, description, callback) {
            this.commands[name] = { description, callback };
            this.log(`Command registered: ${name} - ${description}`, 'system');
        },

        executeCommand: function(input) {
            const parts = input.trim().split(/\s+/);
            const command = parts[0];
            const args = parts.slice(1);

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
                }
            } else {
                this.log(`Unknown command: ${command}. Type 'help' for available commands.`, 'error');
            }
        },

        createUI: function() {
            if (this.element) return;

            const consoleDiv = document.createElement('div');
            consoleDiv.id = 'mod-console';
            consoleDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                height: 300px;
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #333;
                border-radius: 8px;
                color: #fff;
                font-family: monospace;
                font-size: 12px;
                display: none;
                z-index: 10000;
                flex-direction: column;
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                background: #333;
                padding: 5px 10px;
                border-bottom: 1px solid #555;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            header.innerHTML = `<span style="font-weight: bold;">Mod Console</span><button id="console-close" style="background: #f44; color: white; border: none; padding: 2px 6px; cursor: pointer; border-radius: 3px;">×</button>`;

            const logDisplay = document.createElement('div');
            logDisplay.id = 'console-logs';
            logDisplay.style.cssText = `flex: 1; overflow-y: auto; padding: 10px; background: rgba(0, 0, 0, 0.8);`;

            const inputArea = document.createElement('div');
            inputArea.style.cssText = `padding: 10px; border-top: 1px solid #555; background: #222;`;

            const input = document.createElement('input');
            input.id = 'console-input';
            input.type = 'text';
            input.placeholder = 'Enter command... (Type "help")';
            input.style.cssText = `width: 100%; background: #111; color: #fff; border: 1px solid #555; padding: 5px; border-radius: 4px; font-family: inherit;`;

            inputArea.appendChild(input);
            consoleDiv.appendChild(header);
            consoleDiv.appendChild(logDisplay);
            consoleDiv.appendChild(inputArea);
            document.body.appendChild(consoleDiv);

            this.element = consoleDiv;

            document.getElementById('console-close').onclick = () => this.close();

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const command = input.value.trim();
                    if (command) {
                        this.log(`> ${command}`, 'command');
                        this.executeCommand(command);
                        input.value = '';
                    }
                }
            });

            document.addEventListener('keydown', (e) => {
                if ((e.key === 'F12' || e.key === '`') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.toggle();
                }
            });

            // Add button to UI
            const button = document.createElement('button');
            button.textContent = 'Console';
            button.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                z-index: 9999;
                padding: 5px 10px;
                background-color: #555;
                color: white;
                border: 1px solid #777;
                border-radius: 5px;
                cursor: pointer;
            `;
            button.onclick = () => this.toggle();
            document.body.appendChild(button);
        },

        updateDisplay: function() {
            const logDisplay = document.getElementById('console-logs');
            if (!logDisplay) return;
            logDisplay.innerHTML = '';
            this.logs.forEach(log => {
                const entry = document.createElement('div');
                entry.style.color = this.getLogColor(log.type);
                entry.textContent = `[${log.timestamp}] ${log.message}`;
                logDisplay.appendChild(entry);
            });
            logDisplay.scrollTop = logDisplay.scrollHeight;
        },

        getLogColor: function(type) {
            switch(type) {
                case 'error': return '#ff4444';
                case 'warning': return '#ffaa00';
                case 'success': return '#44ff44';
                case 'command': return '#4444ff';
                case 'system': return '#00ffff';
                default: return '#ffffff';
            }
        },

        toggle: function() {
            if (this.isOpen) this.close();
            else this.open();
        },

        open: function() {
            if (!this.element) this.createUI();
            this.element.style.display = 'flex';
            this.isOpen = true;
            this.updateDisplay();
            setTimeout(() => document.getElementById('console-input')?.focus(), 50);
        },

        close: function() {
            if (this.element) this.element.style.display = 'none';
            this.isOpen = false;
        }
    };

    // (Commands omitted here for brevity; unchanged from previous revision)

    modConsole.createUI();
    modConsole.log('Mod Console initialized! Press F12 or ` to toggle.', 'system');
})();
