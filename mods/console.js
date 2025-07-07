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

    // New command: log
    modConsole.registerCommand('log', 'View recent console logs', () => modConsole.viewLogs());

    // New command: view_range
    modConsole.registerCommand('view_range', 'Highlight stored range with yellow overlay', () => {
        if (!window.stored_range) return modConsole.log('No stored_range defined.', 'error');
        const ctx = createOverlayCanvas();
        const { x1, y1, x2, y2 } = window.stored_range;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.fillStyle = highlightColor;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        modConsole.log(`Highlighted range (${x1}, ${y1}) to (${x2}, ${y2})`, 'success');
    });

    // Updated spawn
    modConsole.registerCommand('spawn', 'Spawn element (usage: spawn <element> [amount] or <x1 y1 x2 y2>)', function(args) {
        if (!args.length) return modConsole.log('Usage: spawn <element> [amount or range]', 'error');

        const element = args[0];
        if (!elements[element]) return modConsole.log(`Element '${element}' not found`, 'error');

        if (args.length === 5) {
            const [_, x1, y1, x2, y2] = args.map(Number);
            for (let x = x1; x <= x2; x++) {
                for (let y = y1; y <= y2; y++) {
                    if (isEmpty(x, y)) createPixel(element, x, y);
                }
            }
            return modConsole.log(`Spawned ${element} in range (${x1},${y1}) to (${x2},${y2})`, 'success');
        }

        if (window.stored_range) {
            const { x1, y1, x2, y2 } = window.stored_range;
            for (let x = x1; x <= x2; x++) {
                for (let y = y1; y <= y2; y++) {
                    if (isEmpty(x, y)) createPixel(element, x, y);
                }
            }
            return modConsole.log(`Spawned ${element} in stored range`, 'success');
        }

        const amount = parseInt(args[1]) || 1;
        const x = mousePos?.x || width / 2;
        const y = mousePos?.y || height / 2;
        for (let i = 0; i < amount; i++) {
            const dx = x + Math.floor(Math.random() * 10 - 5);
            const dy = y + Math.floor(Math.random() * 10 - 5);
            if (isEmpty(dx, dy)) createPixel(element, dx, dy);
        }
        modConsole.log(`Spawned ${amount} ${element}(s)`, 'success');
    });

    // Preserve other original commands
    modConsole.registerCommand('clear_area', 'Clear area (usage: clear_area <size>)', function(args) {
        const size = parseInt(args[0]) || 10;
        const x = mousePos?.x || width / 2;
        const y = mousePos?.y || height / 2;
        let cleared = 0;
        for (let i = x - size; i <= x + size; i++) {
            for (let j = y - size; j <= y + size; j++) {
                if (!isEmpty(i, j)) {
                    deletePixel(i, j);
                    cleared++;
                }
            }
        }
        modConsole.log(`Cleared ${cleared} pixels in ${size * 2}x${size * 2} area`, 'success');
    });

    modConsole.registerCommand('list_elements', 'List all available elements', () => {
        if (!elements) return modConsole.log("Elements not loaded.", 'error');
        Object.keys(elements).sort().forEach(el => modConsole.log(el, 'info'));
    });

    modConsole.registerCommand('pause', 'Toggle simulation pause', () => {
        if (typeof paused === 'undefined') return modConsole.log("Paused var not found", 'error');
        paused = !paused;
        modConsole.log(paused ? 'Simulation paused' : 'Simulation resumed', 'success');
    });

    modConsole.registerCommand('reset', 'Clear the simulation', () => {
        if (!confirm('Clear the entire simulation?')) return;
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (!isEmpty(x, y)) deletePixel(x, y);
            }
        }
        modConsole.log('Simulation cleared', 'success');
    });

    modConsole.createUI();
    modConsole.log('Mod Console initialized! Press F12 or ` to toggle.', 'system');
})();
