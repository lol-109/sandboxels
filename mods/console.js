// ==UserScript==
// @name         Sandboxels Console Mod (with Range Support)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adds a custom in-game console for commands and logging in Sandboxels with support for stored screen range selection.
// @author       ChatGPT
// @match        https://sandboxels.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.stored_range = { x1: 0, y1: 0, x2: 0, y2: 0 };

    function parseRangeArg(arg) {
        if(arg === "stored_range") return stored_range;
        const parts = arg.split(',').map(n => parseInt(n));
        if(parts.length !== 4 || parts.some(isNaN)) return null;
        return { x1: parts[0], y1: parts[1], x2: parts[2], y2: parts[3] };
    }

    window.modConsole = {
        logs: [],
        commands: {},
        isOpen: false,
        element: null,

        log: function(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            this.logs.push({ timestamp, message, type });
            if (this.logs.length > 100) this.logs.shift();
            if (this.isOpen && this.element) this.updateDisplay();
        },

        registerCommand: function(name, description, callback) {
            this.commands[name] = { description, callback };
            this.log(`Command registered: ${name} - ${description}`, 'system');
        },

        executeCommand: function(input) {
            const parts = input.trim().split(' ');
            const command = parts[0];
            const args = parts.slice(1);

            if (command === 'help') {
                this.log('Available commands:', 'info');
                Object.entries(this.commands).forEach(([name, cmd]) =>
                    this.log(`  ${name}: ${cmd.description}`, 'info'));
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
                    console.error(error);
                }
            } else {
                this.log(`Unknown command: ${command}`, 'error');
            }
        },

        createUI: function() {
            if (this.element) return;

            const consoleDiv = document.createElement('div');
            consoleDiv.id = 'mod-console';
            consoleDiv.style.cssText = `
                position: fixed; top: 10px; right: 10px;
                width: 400px; height: 300px;
                background: rgba(0, 0, 0, 0.9);
                color: white; border-radius: 8px;
                font-family: monospace; font-size: 12px;
                border: 2px solid #333;
                display: none; flex-direction: column;
                z-index: 10000; box-shadow: 0 0 15px rgba(0,255,255,0.3);
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                background: #333; padding: 5px 10px;
                border-bottom: 1px solid #555;
                display: flex; justify-content: space-between; align-items: center;
                cursor: grab;
            `;
            header.innerHTML = `<span><b>Mod Console</b></span>
                <button id="console-close" style="background: #f44; color: white; border: none; padding: 2px 6px; cursor: pointer;">×</button>`;

            const logDisplay = document.createElement('div');
            logDisplay.id = 'console-logs';
            logDisplay.style.cssText = `
                flex: 1; overflow-y: auto; padding: 10px;
                background: rgba(0, 0, 0, 0.8); line-height: 1.4;
            `;

            const inputArea = document.createElement('div');
            inputArea.style.cssText = `padding: 10px; border-top: 1px solid #555; background: #222;`;

            const input = document.createElement('input');
            input.id = 'console-input';
            input.type = 'text';
            input.placeholder = 'Enter command...';
            input.style.cssText = `
                width: 100%; background: #111; color: white;
                border: 1px solid #555; padding: 5px; border-radius: 4px;
                font-family: inherit;
            `;

            inputArea.appendChild(input);
            consoleDiv.appendChild(header);
            consoleDiv.appendChild(logDisplay);
            consoleDiv.appendChild(inputArea);
            document.body.appendChild(consoleDiv);

            this.element = consoleDiv;

            // Drag logic
            let isDragging = false, offsetX, offsetY;
            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                offsetX = e.clientX - consoleDiv.getBoundingClientRect().left;
                offsetY = e.clientY - consoleDiv.getBoundingClientRect().top;
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                consoleDiv.style.left = `${e.clientX - offsetX}px`;
                consoleDiv.style.top = `${e.clientY - offsetY}px`;
            });
            document.addEventListener('mouseup', () => isDragging = false);
            document.getElementById('console-close').onclick = () => this.close();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const cmd = input.value.trim();
                    if (cmd) {
                        this.log(`> ${cmd}`, 'command');
                        this.executeCommand(cmd);
                        input.value = '';
                    }
                }
            });

            document.addEventListener('keydown', (e) => {
                if ((e.key === 'F12' || e.key === '`') && e.target.tagName !== 'INPUT') {
                    e.preventDefault();
                    this.toggle();
                }
            });

            this.log('Mod Console UI created.', 'system');
        },

        updateDisplay: function() {
            const logDisplay = document.getElementById('console-logs');
            if (!logDisplay) return;
            logDisplay.innerHTML = '';
            this.logs.forEach(log => {
                const line = document.createElement('div');
                line.style.color = this.getLogColor(log.type);
                line.textContent = `[${log.timestamp}] ${log.message}`;
                logDisplay.appendChild(line);
            });
            logDisplay.scrollTop = logDisplay.scrollHeight;
        },

        getLogColor: function(type) {
            return {
                error: '#ff4444',
                warning: '#ffaa00',
                success: '#44ff44',
                command: '#4444ff',
                system: '#00ffff',
                info: '#ffffff'
            }[type] || '#ffffff';
        },

        toggle: function() { this.isOpen ? this.close() : this.open(); },
        open: function() {
            if (!this.element) this.createUI();
            this.element.style.display = 'flex';
            this.isOpen = true;
            this.updateDisplay();
            setTimeout(() => document.getElementById('console-input')?.focus(), 50);
            this.log('Mod Console opened.', 'system');
        },
        close: function() {
            if (this.element) this.element.style.display = 'none';
            this.isOpen = false;
            this.log('Mod Console closed.', 'system');
        }
    };

    // Register new range-related commands
    modConsole.registerCommand('view_range', 'Displays the stored range.', () => {
        modConsole.log(`Stored Range: x1=${stored_range.x1}, y1=${stored_range.y1}, x2=${stored_range.x2}, y2=${stored_range.y2}`, 'info');
    });

    modConsole.registerCommand('edit_range', 'Edit the stored range (usage: edit_range x1 y1 x2 y2)', (args) => {
        if (args.length !== 4 || args.some(isNaN)) {
            modConsole.log('Usage: edit_range x1 y1 x2 y2', 'error');
            return;
        }
        [stored_range.x1, stored_range.y1, stored_range.x2, stored_range.y2] = args.map(Number);
        modConsole.log(`Stored range updated.`, 'success');
    });

    modConsole.registerCommand('clear_range', 'Clears the stored range.', () => {
        stored_range = { x1: 0, y1: 0, x2: 0, y2: 0 };
        modConsole.log('Stored range cleared.', 'success');
    });

    modConsole.registerCommand('get_canvas_range', 'Get full canvas range.', () => {
        if (typeof width === 'undefined' || typeof height === 'undefined') {
            modConsole.log('Canvas size not available.', 'error');
            return;
        }
        modConsole.log(`Canvas range: x1=0, y1=0, x2=${width - 1}, y2=${height - 1}`, 'info');
    });

    // Final setup
    modConsole.createUI();
    modConsole.log('Type "help" for commands', 'system');

})();
