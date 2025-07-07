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

    window.modConsole = {
        logs: [],
        commands: {},
        isOpen: false,
        element: null,
        log: function(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = { timestamp, message, type };
            this.logs.push(logEntry);
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
        createUI: function() {
            if (this.element) return;
            this.log('Creating Mod Console UI...', 'system');
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
                font-family: 'Courier New', monospace;
                font-size: 12px;
                display: none;
                z-index: 10000;
                flex-direction: column;
                box-shadow: 0 0 15px rgba(0,255,255,0.3);
            `;
            const header = document.createElement('div');
            header.style.cssText = `
                background: #333;
                padding: 5px 10px;
                border-bottom: 1px solid #555;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: grab;
            `;
            header.innerHTML = `
                <span style="font-weight: bold;">Mod Console</span>
                <button id="console-close" style="background: #f44; color: white; border: none; padding: 2px 6px; cursor: pointer; border-radius: 3px;">×</button>
            `;
            const logDisplay = document.createElement('div');
            logDisplay.id = 'console-logs';
            logDisplay.style.cssText = `
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                background: rgba(0, 0, 0, 0.8);
                line-height: 1.4;
            `;
            const inputArea = document.createElement('div');
            inputArea.style.cssText = `
                padding: 10px;
                border-top: 1px solid #555;
                background: #222;
            `;
            const input = document.createElement('input');
            input.id = 'console-input';
            input.type = 'text';
            input.placeholder = 'Enter command... (Type "help")';
            input.style.cssText = `
                width: 100%;
                background: #111;
                color: #fff;
                border: 1px solid #555;
                padding: 5px;
                border-radius: 4px;
                font-family: inherit;
                outline: none;
            `;
            inputArea.appendChild(input);
            consoleDiv.appendChild(header);
            consoleDiv.appendChild(logDisplay);
            consoleDiv.appendChild(inputArea);
            document.body.appendChild(consoleDiv);
            this.element = consoleDiv;
            let isDragging = false;
            let offsetX, offsetY;
            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                offsetX = e.clientX - consoleDiv.getBoundingClientRect().left;
                offsetY = e.clientY - consoleDiv.getBoundingClientRect().top;
                header.style.cursor = 'grabbing';
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                consoleDiv.style.left = (e.clientX - offsetX) + 'px';
                consoleDiv.style.top = (e.clientY - offsetY) + 'px';
            });
            document.addEventListener('mouseup', () => {
                isDragging = false;
                header.style.cursor = 'grab';
            });
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
            this.log('Mod Console UI created.', 'system');
        },
        updateDisplay: function() {
            const logDisplay = document.getElementById('console-logs');
            if (!logDisplay) return;
            logDisplay.innerHTML = '';
            this.logs.forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.style.cssText = `
                    margin: 2px 0;
                    color: ${this.getLogColor(log.type)};
                `;
                logEntry.textContent = `[${log.timestamp}] ${log.message}`;
                logDisplay.appendChild(logEntry);
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
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },
        open: function() {
            if (!this.element) this.createUI();
            this.element.style.display = 'flex';
            this.isOpen = true;
            this.updateDisplay();
            setTimeout(() => {
                const inputElement = document.getElementById('console-input');
                if (inputElement) inputElement.focus();
            }, 50);
            this.log('Mod Console opened.', 'system');
        },
        close: function() {
            if (this.element) this.element.style.display = 'none';
            this.isOpen = false;
            this.log('Mod Console closed.', 'system');
        }
    };

    // SPAWN command with stored_range support
    window.modConsole.registerCommand('spawn', 'Spawn element at cursor or stored_range (usage: spawn <element> [amount|stored_range])', function(args) {
        if (args.length === 0) {
            window.modConsole.log('Usage: spawn <element> [amount|stored_range]', 'error');
            return;
        }
        const element = args[0];
        const arg = args[1];
        if (typeof elements === 'undefined' || !elements[element]) {
            window.modConsole.log(`Element '${element}' does not exist.`, 'error');
            return;
        }
        if (arg === "stored_range" && typeof window.storedRange !== "undefined") {
            const { x1, y1, x2, y2 } = window.storedRange;
            let count = 0;
            for (let x = x1; x <= x2; x++) {
                for (let y = y1; y <= y2; y++) {
                    if (isEmpty(x, y)) {
                        createPixel(element, x, y);
                        count++;
                    }
                }
            }
            window.modConsole.log(`Spawned ${count} ${element}(s) in stored_range`, 'success');
            return;
        }
        const amount = parseInt(arg) || 1;
        const x = mousePos?.x ?? width/2;
        const y = mousePos?.y ?? height/2;
        let created = 0;
        for (let i = 0; i < amount; i++) {
            const offsetX = Math.floor(Math.random() * 10) - 5;
            const offsetY = Math.floor(Math.random() * 10) - 5;
            if (isEmpty(x + offsetX, y + offsetY)) {
                createPixel(element, x + offsetX, y + offsetY);
                created++;
            }
        }
        window.modConsole.log(`Spawned ${created} ${element}(s) at mouse`, 'success');
    });

    // CLEAR_AREA command with stored_range support
    window.modConsole.registerCommand('clear_area', 'Clear pixels in area (usage: clear_area <size>|stored_range)', function(args) {
        const arg = args[0];
        if (arg === "stored_range" && typeof window.storedRange !== "undefined") {
            const { x1, y1, x2, y2 } = window.storedRange;
            let cleared = 0;
            for (let x = x1; x <= x2; x++) {
                for (let y = y1; y <= y2; y++) {
                    if (!isEmpty(x, y)) {
                        deletePixel(x, y);
                        cleared++;
                    }
                }
            }
            window.modConsole.log(`Cleared ${cleared} pixels from stored_range`, 'success');
            return;
        }
        const size = parseInt(arg) || 10;
        const x = mousePos?.x ?? width/2;
        const y = mousePos?.y ?? height/2;
        let cleared = 0;
        for (let i = x - size; i <= x + size; i++) {
            for (let j = y - size; j <= y + size; j++) {
                if (!isEmpty(i, j)) {
                    deletePixel(i, j);
                    cleared++;
                }
            }
        }
        window.modConsole.log(`Cleared ${cleared} pixels in ${size*2}x${size*2} area`, 'success');
    });

    // Other unchanged commands...
    window.modConsole.log('Mod Console initialized successfully!', 'system');
    window.modConsole.log('Press F12 or ` to toggle console', 'system');
    window.modConsole.log('Type "help" for available commands', 'system');
})();
