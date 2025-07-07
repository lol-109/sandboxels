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
        gameEvents: [], // Separate array for game events
        commands: {},
        isOpen: false,
        element: null,
        rangeVisualization: null, // Element for visualizing the range
        currentRange: { x1: 0, y1: 0, x2: 0, y2: 0 }, // Store current range

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

            // Also log to browser console
            // console.log(`[ModConsole ${timestamp}] ${message}`); // Uncomment for verbose browser console logging
        },

        // Add game event
        logGameEvent: function(message) {
            const timestamp = new Date().toLocaleTimeString();
            const eventEntry = `[${timestamp}] ${message}`;
            this.gameEvents.push(eventEntry);

            // Keep only last 100 events
            if (this.gameEvents.length > 100) {
                this.gameEvents.shift();
            }

            // If console is open and displaying game events, update the display
            if (this.isOpen && this.element && this.isDisplayingGameEvents) {
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

            if (command === 'log') {
                this.displayGameEvents();
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

        // Display game events
        displayGameEvents: function() {
            this.isDisplayingGameEvents = true;
            this.updateDisplay();
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
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #333;
                border-radius: 8px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                display: none; /* Hidden by default */
                z-index: 10000;
                flex-direction: column;
                box-shadow: 0 0 15px rgba(0,255,255,0.3); /* Add a subtle glow */
            `;

            // Create header
            const header = document.createElement('div');
            header.style.cssText = `
                background: #333;
                padding: 5px 10px;
                border-bottom: 1px solid #555;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: grab; /* Make header draggable */
            `;
            header.innerHTML = `
                <span style="font-weight: bold;">Mod Console</span>
                <button id="console-close" style="background: #f44; color: white; border: none; padding: 2px 6px; cursor: pointer; border-radius: 3px;">×</button>
            `;

            // Create log display
            const logDisplay = document.createElement('div');
            logDisplay.id = 'console-logs';
            logDisplay.style.cssText = `
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                background: rgba(0, 0, 0, 0.8);
                line-height: 1.4;
            `;

            // Create input area
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
                outline: none; /* Remove default focus outline */
            `;

            // Assemble console
            inputArea.appendChild(input);
            consoleDiv.appendChild(header);
            consoleDiv.appendChild(logDisplay);
            consoleDiv.appendChild(inputArea);
            document.body.appendChild(consoleDiv);

            this.element = consoleDiv;

            // Make console draggable
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

            // Add event listeners
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

            // Add toggle key listener (F12 or `)
            document.addEventListener('keydown', (e) => {
                // Prevent F12 from opening dev tools if console is open or about to open
                if ((e.key === 'F12' || e.key === '`') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.toggle();
                }
            });
            this.log('Mod Console UI created.', 'system');
        },

        // Update display
        updateDisplay: function() {
            const logDisplay = document.getElementById('console-logs');
            if (!logDisplay) return;

            logDisplay.innerHTML = '';

            let logsToDisplay = this.logs;
            if (this.isDisplayingGameEvents) {
                logsToDisplay = this.gameEvents;
            }

            logsToDisplay.forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.style.cssText = `
                    margin: 2px 0;
                    color: ${this.getLogColor(log.type)};
                `;

                // Check if the log is a game event (string) or a standard log entry (object)
                if (typeof log === 'string') {
                    logEntry.textContent = log; // Game event
                } else {
                    logEntry.textContent = `[${log.timestamp}] ${log.message}`; // Standard log
                }

                logDisplay.appendChild(logEntry);
            });

            // Scroll to bottom
            logDisplay.scrollTop = logDisplay.scrollHeight;
        },

        // Get color for log type
        getLogColor: function(type) {
            switch(type) {
                case 'error': return '#ff4444';
                case 'warning': return '#ffaa00';
                case 'success': return '#44ff44';
                case 'command': return '#4444ff';
                case 'system': return '#00ffff'; // Brighter cyan for system messages
                default: return '#ffffff';
            }
        },

        // Toggle console
        toggle: function() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        // Open console
        open: function() {
            if (!this.element) this.createUI();
            this.element.style.display = 'flex';
            this.isOpen = true;
            this.updateDisplay();
            // Focus input after a slight delay to ensure it's rendered and ready
            setTimeout(() => {
                const inputElement = document.getElementById('console-input');
                if (inputElement) {
                    inputElement.focus();
                }
            }, 50);
            this.log('Mod Console opened.', 'system');
        },

        // Close console
        close: function() {
            if (this.element) {
                this.element.style.display = 'none';
            }
            this.isOpen = false;
            this.log('Mod Console closed.', 'system');
            this.clearRangeVisualization(); // Clear visualization when closing
        },

        // Set range
        setRange: function(x1, y1, x2, y2) {
            this.currentRange = { x1: x1, y1: y1, x2: x2, y2: y2 };
            this.log(`Range set to: x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`, 'info');
        },

        // Visualize range
        visualizeRange: function(x1, y1, x2, y2) {
            // Ensure valid range
            if (x1 > x2) [x1, x2] = [x2, x1];
            if (y1 > y2) [y1, y2] = [y2, y1];

            // Clear existing visualization
            this.clearRangeVisualization();

            // Create a div to highlight the range
            this.rangeVisualization = document.createElement('div');
            this.rangeVisualization.style.cssText = `
                position: absolute;
                left: ${x1}px;
                top: ${y1}px;
                width: ${x2 - x1}px;
                height: ${y2 - y1}px;
                background: rgba(255, 255, 0, 0.1); /* Faint transparent yellow */
                border: 1px solid yellow;
                pointer-events: none; /* Prevent blocking mouse events */
                z-index: 9999; /* Ensure it's on top */
            `;

            // Find the game canvas or main container and append the visualization
            const gameCanvas = document.getElementById('gameCanvas') || document.body;
            gameCanvas.appendChild(this.rangeVisualization);
        },

        // Clear range visualization
        clearRangeVisualization: function() {
            if (this.rangeVisualization) {
                this.rangeVisualization.remove();
                this.rangeVisualization = null;
            }
        }
    };

    // Initialize console immediately
    window.modConsole.createUI();

    // Register default commands
    // These commands rely on global Sandboxels functions/variables (e.g., elements, mousePos)
    // which are typically available when the userscript runs.
    window.modConsole.registerCommand('spawn', 'Spawn element at cursor (usage: spawn <element> [amount] [x1] [y1] [x2] [y2])', function(args) {
        if (args.length < 2) {
            window.modConsole.log('Usage: spawn <element> <amount> [x1] [y1] [x2] [y2]', 'error');
            return;
        }

        const element = args[0];
        const amount = parseInt(args[1]) || 1;
        let x1, y1, x2, y2;

        if (args.length === 6) {
            // Specified range
            x1 = parseInt(args[2]);
            y1 = parseInt(args[3]);
            x2 = parseInt(args[4]);
            y2 = parseInt(args[5]);
        } else {
            // Use current range or mouse position
            if (window.modConsole.currentRange) {
                x1 = window.modConsole.currentRange.x1;
                y1 = window.modConsole.currentRange.y1;
                x2 = window.modConsole.currentRange.x2;
                y2 = window.modConsole.currentRange.y2;
            } else {
                // Use mouse position if available
                const x = typeof mousePos !== 'undefined' && mousePos ? mousePos.x : (typeof width !== 'undefined' ? width/2 : 0);
                const y = typeof mousePos !== 'undefined' && mousePos ? mousePos.y : (typeof height !== 'undefined' ? height/2 : 0);
                x1 = x - 5;
                y1 = y - 5;
                x2 = x + 5;
                y2 = y + 5;
            }
        }

        if (typeof elements === 'undefined' || !elements[element]) {
            window.modConsole.log(`Element '${element}' does not exist or 'elements' is not defined.`, 'error');
            return;
        }

        if (typeof createPixel === 'undefined' || typeof isEmpty === 'undefined') {
            window.modConsole.log('Game functions (createPixel, isEmpty) not available.', 'error');
            return;
        }

        let spawned = 0;
        for (let i = 0; i < amount; i++) {
            const x = Math.floor(Math.random() * (x2 - x1)) + x1;
            const y = Math.floor(Math.random() * (y2 - y1)) + y1;

            if (isEmpty(x, y)) {
                createPixel(element, x, y);
                spawned++;
            }
        }

        window.modConsole.log(`Spawned ${spawned}/${amount} ${element}(s) in range x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`, 'success');
    });

    window.modConsole.registerCommand('clear_area', 'Clear all pixels in an area (usage: clear_area <size>)', function(args) {
        const size = parseInt(args[0]) || 10;
        const x = typeof mousePos !== 'undefined' && mousePos ? mousePos.x : (typeof width !== 'undefined' ? width/2 : 0);
        const y = typeof mousePos !== 'undefined' && mousePos ? mousePos.y : (typeof height !== 'undefined' ? height/2 : 0);

        if (typeof deletePixel === 'undefined' || typeof isEmpty === 'undefined') {
            window.modConsole.log('Game functions (deletePixel, isEmpty) not available.', 'error');
            return;
        }

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

    window.modConsole.registerCommand('list_elements', 'List all available elements', function(args) {
        if (typeof elements === 'undefined') {
            window.modConsole.log("'elements' object not available.", 'error');
            return;
        }
        const elementList = Object.keys(elements).sort();
        window.modConsole.log(`Available elements (${elementList.length}):`, 'info');
        elementList.forEach(element => {
            window.modConsole.log(`  ${element}`, 'info');
        });
    });

    window.modConsole.registerCommand('element_info', 'Get information about an element (usage: element_info <element>)', function(args) {
        if (args.length === 0) {
            window.modConsole.log('Usage: element_info <element>', 'error');
            return;
        }

        const element = args[0];
        if (typeof elements === 'undefined' || !elements[element]) {
            window.modConsole.log(`Element '${element}' does not exist or 'elements' is not defined.`, 'error');
            return;
        }

        const info = elements[element];
        window.modConsole.log(`Information for '${element}':`, 'info');
        window.modConsole.log(`  Color: ${info.color}`, 'info');
        window.modConsole.log(`  Category: ${info.category}`, 'info');
        window.modConsole.log(`  State: ${info.state}`, 'info');
        window.modConsole.log(`  Density: ${info.density}`, 'info');
        window.modConsole.log(`  Temperature: ${info.temp}`, 'info');
    });

    window.modConsole.registerCommand('pause', 'Pause/unpause the simulation', function(args) {
        if (typeof paused === 'undefined') {
            window.modConsole.log("'paused' variable not available.", 'error');
            return;
        }
        paused = !paused;
        window.modConsole.log(`Simulation ${paused ? 'paused' : 'resumed'}`, 'success');
    });

    window.modConsole.registerCommand('reset', 'Clear the entire simulation', function(args) {
        if (typeof confirm !== 'function' || typeof width === 'undefined' || typeof height === 'undefined' || typeof isEmpty === 'undefined' || typeof deletePixel === 'undefined') {
            window.modConsole.log('Required game functions or variables (confirm, width, height, isEmpty, deletePixel) not available.', 'error');
            return;
        }

        if (confirm('Are you sure you want to clear everything?')) {
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    if (!isEmpty(x, y)) {
                        deletePixel(x, y);
                    }
                }
            }
            window.modConsole.log('Simulation cleared', 'success');
        }
    });

    window.modConsole.registerCommand('set_range', 'Set the range for spawn command (usage: set_range <x1> <y1> <x2> <y2>)', function(args) {
        if (args.length !== 4) {
            window.modConsole.log('Usage: set_range <x1> <y1> <x2> <y2>', 'error');
            return;
        }

        const x1 = parseInt(args[0]);
        const y1 = parseInt(args[1]);
        const x2 = parseInt(args[2]);
        const y2 = parseInt(args[3]);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
            window.modConsole.log('Invalid range values. Must be numbers.', 'error');
            return;
        }

        window.modConsole.setRange(x1, y1, x2, y2);
    });

    window.modConsole.registerCommand('view_range', 'Highlight the selected range (usage: view_range <x1> <y1> <x2> <y2>)', function(args) {
        if (args.length !== 4) {
            window.modConsole.log('Usage: view_range <x1> <y1> <x2> <y2>', 'error');
            return;
        }

        const x1 = parseInt(args[0]);
        const y1 = parseInt(args[1]);
        const x2 = parseInt(args[2]);
        const y2 = parseInt(args[3]);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
            window.modConsole.log('Invalid range values. Must be numbers.', 'error');
            return;
        }

        window.modConsole.visualizeRange(x1, y1, x2, y2);
    });

    window.modConsole.registerCommand('clear_view', 'Clear the range visualization', function(args) {
        window.modConsole.clearRangeVisualization();
    });

    // Log console initialization
    window.modConsole.log('Mod Console initialized successfully!', 'system');
    window.modConsole.log('Press F12 or ` to toggle console', 'system');
    window.modConsole.log('Type "help" for available commands', 'system');

    // --- Automatic button placement logic (generalized and robust) ---

    let consoleButtonAdded = false; // Flag to ensure the button is only added once

    function addConsoleButtonToMainUI() {
        if (consoleButtonAdded) {
            window.modConsole.log('Console button already added.', 'system');
            return;
        }

        window.modConsole.log('Attempting to add Console button to UI...', 'system');
        let targetContainer = null;

        // Prioritized list of common UI container selectors in games
        const commonUISelctors = [
            '#controls', // Very common ID for control panels
            '#ui-panel', // Another common ID
            '.main-controls', // Common class for main controls
            '.sidebar', // If there's a distinct sidebar
            '#game-ui', // General game UI container
            '.game-wrapper', // Common wrapper
            // Consider more specific common elements like the brush panel if known to be stable
            document.querySelector('#brushControls') ? '#brushControls' : null, // If brush controls exist
            document.querySelector('#toolControls') ? '#toolControls' : null, // If general tool controls exist
        ].filter(Boolean); // Remove any null entries

        for (const selector of commonUISelctors) {
            targetContainer = document.querySelector(selector);
            if (targetContainer) {
                window.modConsole.log(`Found suitable UI container: "${selector}"`, 'system');
                break;
            }
        }

        // Fallback: If no specific UI container found, append to body with fixed position
        if (!targetContainer) {
            window.modConsole.log('No specific UI container found. Falling back to appending to document.body with fixed positioning.', 'warning');
            targetContainer = document.body;
        }

        // --- Create and add the button ---
        const consoleButton = document.createElement('button');
        consoleButton.id = 'console-mod-button'; // Unique ID for the button
        consoleButton.textContent = 'Console';

        // Basic styling to blend in
        consoleButton.style.cssText = `
            background-color: #555;
            color: white;
            border: 1px solid #777;
            padding: 8px 15px;
            margin: 5px; /* Add margin for spacing */
            cursor: pointer;
            border-radius: 5px;
            font-size: 14px;
            transition: background-color 0.2s;
            min-width: 80px; /* Give it a consistent width */
            box-shadow: 0 0 5px rgba(0,255,255,0.2); /* Subtle glow */
        `;

        // If appended to body, give it a fixed position (e.g., top-left or top-right corner)
        if (targetContainer === document.body) {
           consoleButton.style.position = 'fixed';
           consoleButton.style.top = '10px';
           consoleButton.style.left = '10px'; // Place it top-left if no dedicated UI panel
           consoleButton.style.zIndex = '9999'; // Ensure it's on top
        }

        consoleButton.onmouseover = () => consoleButton.style.backgroundColor = '#777';
        consoleButton.onmouseout = () => consoleButton.style.backgroundColor = '#555';

        // Add click event to open the console
        consoleButton.onclick = () => window.modConsole.toggle();

        targetContainer.appendChild(consoleButton);
        consoleButtonAdded = true; // Set flag
        window.modConsole.log('Console button successfully added to UI.', 'system');
    }

    // Use a MutationObserver for robust button placement.
    // This observes the document body for changes and tries to add the button
    // once the likely UI elements are present.
    const observerConfig = { childList: true, subtree: true };
    const observerTarget = document.body;

    const observer = new MutationObserver((mutations, obs) => {
        // Attempt to add the button. The function itself checks if it was already added.
        addConsoleButtonToMainUI();

        // If the button has been successfully added, disconnect the observer.
        if (consoleButtonAdded) {
            obs.disconnect();
            window.modConsole.log('MutationObserver disconnected (button added).', 'system');
        }
    });

    // Start observing the document body
    window.modConsole.log('Starting MutationObserver to detect UI elements...', 'system');
    observer.observe(observerTarget, observerConfig);

    // Also try to add it once on DOMContentLoaded and load, in case elements
    // are already there before the observer catches a mutation.
    document.addEventListener('DOMContentLoaded', () => {
        window.modConsole.log('DOMContentLoaded event fired.', 'system');
        addConsoleButtonToMainUI();
    });
    window.addEventListener('load', () => {
        window.modConsole.log('Window load event fired.', 'system');
        addConsoleButtonToMainUI();
    });

    // Example of logging a game event
    setInterval(() => {
        window.modConsole.logGameEvent('Game tick event');
    }, 5000);

})(); // End of IIFE (Immediately Invoked Function Expression)
