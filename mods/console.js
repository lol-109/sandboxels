// ==UserScript==
// @name         Sandboxels Console & Selection Mod (with Toolbar Button)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Adds a custom in-game console for commands and logging, plus an area selection tool activated via a toolbar button.
// @author       ChatGPT / Your Name
// @match        https://sandboxels.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- MOD CONSOLE OBJECT ---
    window.modConsole = {
        logs: [],
        commands: {},
        isOpen: false,
        element: null,
        storedRange: null, // Stores the selected area range {x1, y1, x2, y2}

        // Add log entry
        log: function(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = {
                timestamp: timestamp,
                message: message,
                type: type
            };
            this.logs.push(logEntry);
            
            if (this.logs.length > 100) {
                this.logs.shift(); // Keep only last 100 logs
            }
            
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
            this.log(`Command registered: ${name}: ${description}`, 'system');
        },
        
        // Execute a command
        executeCommand: function(input) {
            const parts = input.trim().split(' ');
            const command = parts[0];
            const args = parts.slice(1);
            
            this.log(`> ${input}`, 'command'); // Log the command input

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
                this.log('Console cleared.', 'system');
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
        
        // Create console UI
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
                resize: both;
                overflow: hidden;
                min-width: 250px;
                min-height: 150px;
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
                word-wrap: break-word;
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

            document.getElementById('console-close').onclick = () => this.close();
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const command = input.value.trim();
                    if (command) {
                        this.executeCommand(command);
                        input.value = '';
                    }
                }
            });
            
            // Add toggle key listener (F12 or `)
            document.addEventListener('keydown', (e) => {
                if ((e.key === 'F12' || e.key === '`') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.toggle();
                }
            });
            this.log('Mod Console UI created.', 'system');
        }
    };

    // --- AREA SELECTION LOGIC ---
    let isHighlightToolActive = false; // Controls if the selection drag works
    let isDraggingSelection = false; // True when actually dragging to select
    let startPixelX, startPixelY;
    let selectionHighlightDiv = null;

    function createSelectionHighlight() {
        if (!selectionHighlightDiv) {
            selectionHighlightDiv = document.createElement('div');
            selectionHighlightDiv.id = 'mod-selection-highlight';
            selectionHighlightDiv.style.cssText = `
                position: absolute;
                background-color: rgba(255, 255, 0, 0.2); /* Faint transparent yellow */
                border: 1px dashed rgba(255, 255, 0, 0.5); /* Dashed border */
                z-index: 9998; /* Below console, above game */
                pointer-events: none; /* Crucial: allows clicks/mouse events to pass through to the game */
                display: none; /* Hidden by default */
            `;
            document.body.appendChild(selectionHighlightDiv);
        }
        return selectionHighlightDiv;
    }

    function updateSelectionHighlight(x1, y1, x2, y2) {
        const highlight = createSelectionHighlight();
        highlight.style.display = 'block';

        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        highlight.style.left = `${minX}px`;
        highlight.style.top = `${minY}px`;
        highlight.style.width = `${maxX - minX}px`;
        highlight.style.height = `${maxY - minY}px`;
    }

    function clearSelectionHighlight() {
        if (selectionHighlightDiv) {
            selectionHighlightDiv.style.display = 'none';
        }
    }

    // Mouse down event for selection
    document.addEventListener('mousedown', (e) => {
        // Only start selection if the highlight tool is active AND not clicking on console/its button
        if (!isHighlightToolActive || e.target.closest('#mod-console') || e.target.closest('#console-mod-button') || e.target.closest('#highlight-tool-button')) {
            return;
        }

        // Check if the mouse is over the game canvas (assuming 'canvas' is the element for the game area)
        const gameCanvas = document.querySelector('canvas');
        if (!gameCanvas || !gameCanvas.contains(e.target)) {
            // If highlight tool is active but click is outside canvas, just log and return.
            // Do not clear stored range unless explicitly commanded or new canvas drag.
            window.modConsole.log('Click not on game canvas, skipping selection drag.', 'info');
            return;
        }

        isDraggingSelection = true;
        startPixelX = e.clientX;
        startPixelY = e.clientY;
        
        // Clear any previous selection highlight and stored range when a new drag starts
        window.modConsole.storedRange = null;
        clearSelectionHighlight();
        
        // Change cursor to crosshair
        document.body.style.cursor = 'crosshair';
    });

    // Mouse move event for selection
    document.addEventListener('mousemove', (e) => {
        if (!isDraggingSelection) return;

        updateSelectionHighlight(startPixelX, startPixelY, e.clientX, e.clientY);
    });

    // Mouse up event for selection
    document.addEventListener('mouseup', (e) => {
        if (!isDraggingSelection) return;
        isDraggingSelection = false;
        document.body.style.cursor = ''; // Reset cursor

        const endPixelX = e.clientX;
        const endPixelY = e.clientY;

        const x1 = Math.min(startPixelX, endPixelX);
        const y1 = Math.min(startPixelY, endPixelY);
        const x2 = Math.max(startPixelX, endPixelX);
        const y2 = Math.max(startPixelY, endPixelY);

        // Store the range in modConsole.storedRange
        // Coordinates here are raw screen pixels. Sandboxels commands will use these.
        window.modConsole.storedRange = {
            x1: Math.floor(x1),
            y1: Math.floor(y1),
            x2: Math.floor(x2),
            y2: Math.floor(y2)
        };
        window.modConsole.log(`Area selected: [${window.modConsole.storedRange.x1}, ${window.modConsole.storedRange.y1}, ${window.modConsole.storedRange.x2}, ${window.modConsole.storedRange.y2}]`, 'success');
        
        // Keep the highlight visible until a new selection or clear command
        updateSelectionHighlight(x1, y1, x2, y2);
    });

    // --- CONSOLE COMMANDS ---
    // Initialize console immediately
    window.modConsole.createUI();

    // Helper to get game dimensions (assuming 'width' and 'height' are global from Sandboxels engine)
    function getGameCanvasDimensions() {
        if (typeof width !== 'undefined' && typeof height !== 'undefined') {
            return { width: width, height: height };
        }
        // Fallback if game globals aren't immediately available
        const gameCanvas = document.querySelector('canvas');
        if (gameCanvas) {
            return { width: gameCanvas.width, height: gameCanvas.height }; // This might be pixel size, not grid size
        }
        return { width: 0, height: 0 };
    }

    // Helper to parse range arguments or use stored_range
    function parseRangeArgs(args) {
        let range = null;
        if (args.length === 1 && args[0].toLowerCase() === 'stored_range') {
            range = window.modConsole.storedRange;
            if (!range) {
                window.modConsole.log('No stored range available. Select an area first or provide coordinates.', 'error');
                return null;
            }
        } else if (args.length === 4) {
            const [x1, y1, x2, y2] = args.map(Number);
            if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
                window.modConsole.log('Invalid range coordinates. Usage: <command> x1 y1 x2 y2 or <command> stored_range', 'error');
                return null;
            }
            range = { x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) };
        } else {
            window.modConsole.log('Invalid number of arguments for range. Usage: <command> x1 y1 x2 y2 or <command> stored_range', 'error');
            return null;
        }
        return range;
    }

    // Register default commands
    window.modConsole.registerCommand('spawn', 'Spawn element at cursor (usage: spawn <element> [amount])', function(args) {
        if (args.length === 0) {
            window.modConsole.log('Usage: spawn <element> [amount]', 'error');
            return;
        }
        
        const element = args[0];
        const amount = parseInt(args[1]) || 1;
        
        if (typeof elements === 'undefined' || !elements[element]) {
            window.modConsole.log(`Element '${element}' does not exist or 'elements' is not defined.`, 'error');
            return;
        }
        
        const x = typeof mousePos !== 'undefined' && mousePos ? mousePos.x : (typeof width !== 'undefined' ? Math.floor(width/2) : 0);
        const y = typeof mousePos !== 'undefined' && mousePos ? mousePos.y : (typeof height !== 'undefined' ? Math.floor(height/2) : 0);
        
        if (typeof createPixel === 'undefined' || typeof isEmpty === 'undefined') {
            window.modConsole.log('Game functions (createPixel, isEmpty) not available. Make sure the game is loaded.', 'error');
            return;
        }

        let spawnedCount = 0;
        for (let i = 0; i < amount; i++) {
            const offsetX = Math.floor(Math.random() * 10) - 5;
            const offsetY = Math.floor(Math.random() * 10) - 5;
            if (x + offsetX >= 0 && x + offsetX < width && y + offsetY >= 0 && y + offsetY < height && isEmpty(x + offsetX, y + offsetY)) {
                createPixel(element, x + offsetX, y + offsetY);
                spawnedCount++;
            }
        }
        
        window.modConsole.log(`Spawned ${spawnedCount} ${element}(s)`, 'success');
    });

    window.modConsole.registerCommand('clear_area', 'Clear pixels in a radius (usage: clear_area <size>)', function(args) {
        const size = parseInt(args[0]) || 10;
        const x = typeof mousePos !== 'undefined' && mousePos ? mousePos.x : (typeof width !== 'undefined' ? Math.floor(width/2) : 0);
        const y = typeof mousePos !== 'undefined' && mousePos ? mousePos.y : (typeof height !== 'undefined' ? Math.floor(height/2) : 0);
        
        if (typeof deletePixel === 'undefined' || typeof isEmpty === 'undefined' || typeof width === 'undefined' || typeof height === 'undefined') {
            window.modConsole.log('Game functions (deletePixel, isEmpty) or dimensions not available. Make sure the game is loaded.', 'error');
            return;
        }

        let cleared = 0;
        for (let i = x - size; i <= x + size; i++) {
            for (let j = y - size; j <= y + size; j++) {
                if (i >= 0 && i < width && j >= 0 && j < height && !isEmpty(i, j)) {
                    deletePixel(i, j);
                    cleared++;
                }
            }
        }
        
        window.modConsole.log(`Cleared ${cleared} pixels in ${size*2}x${size*2} area around cursor`, 'success');
    });

    window.modConsole.registerCommand('clear_range', 'Clear pixels in a specified range (usage: clear_range x1 y1 x2 y2 | clear_range stored_range)', function(args) {
        const range = parseRangeArgs(args);
        if (!range) return;

        if (typeof deletePixel === 'undefined' || typeof isEmpty === 'undefined' || typeof width === 'undefined' || typeof height === 'undefined') {
            window.modConsole.log('Game functions (deletePixel, isEmpty) or dimensions not available. Make sure the game is loaded.', 'error');
            return;
        }

        let cleared = 0;
        for (let x = range.x1; x <= range.x2; x++) {
            for (let y = range.y1; y <= range.y2; y++) {
                if (x >= 0 && x < width && y >= 0 && y < height && !isEmpty(x, y)) {
                    deletePixel(x, y);
                    cleared++;
                }
            }
        }
        window.modConsole.log(`Cleared ${cleared} pixels in range [${range.x1},${range.y1},${range.x2},${range.y2}]`, 'success');
    });

    window.modConsole.registerCommand('spawn_in_range', 'Spawn element in a specified range (usage: spawn_in_range <element> [amount] x1 y1 x2 y2 | spawn_in_range <element> [amount] stored_range)', function(args) {
        if (args.length < 2) {
            window.modConsole.log('Usage: spawn_in_range <element> [amount] x1 y1 x2 y2 | spawn_in_range <element> [amount] stored_range', 'error');
            return;
        }

        const element = args[0];
        let amount = 1;
        let rangeArgsStartIndex = 1;

        if (!isNaN(parseInt(args[1])) && args.length >= 5) {
            amount = parseInt(args[1]);
            rangeArgsStartIndex = 2;
        } else if (args.length >= 5 || (args.length === 2 && args[1].toLowerCase() === 'stored_range')) {
            amount = 1; // Default amount if not specified
            rangeArgsStartIndex = 1;
        } else {
             window.modConsole.log('Usage: spawn_in_range <element> [amount] x1 y1 x2 y2 | spawn_in_range <element> [amount] stored_range', 'error');
             return;
        }

        const range = parseRangeArgs(args.slice(rangeArgsStartIndex));
        if (!range) return;

        if (typeof elements === 'undefined' || !elements[element]) {
            window.modConsole.log(`Element '${element}' does not exist or 'elements' is not defined.`, 'error');
            return;
        }
        if (typeof createPixel === 'undefined' || typeof isEmpty === 'undefined' || typeof width === 'undefined' || typeof height === 'undefined') {
            window.modConsole.log('Game functions (createPixel, isEmpty) or dimensions not available. Make sure the game is loaded.', 'error');
            return;
        }

        let spawnedCount = 0;
        for (let i = 0; i < amount; i++) {
            const randX = Math.floor(Math.random() * (range.x2 - range.x1 + 1)) + range.x1;
            const randY = Math.floor(Math.random() * (range.y2 - range.y1 + 1)) + range.y1;

            if (randX >= 0 && randX < width && randY >= 0 && randY < height && isEmpty(randX, randY)) {
                createPixel(element, randX, randY);
                spawnedCount++;
            }
        }
        window.modConsole.log(`Spawned ${spawnedCount} ${element}(s) in range [${range.x1},${range.y1},${range.x2},${range.y2}]`, 'success');
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
            window.modConsole.log('Required game functions or variables (confirm, width, height, isEmpty, deletePixel) not available. Make sure the game is loaded.', 'error');
            return;
        }

        if (confirm('Are you sure you want to clear everything? This cannot be undone!')) {
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    if (!isEmpty(x, y)) {
                        deletePixel(x, y);
                    }
                }
            }
            window.modConsole.log('Simulation cleared', 'success');
        } else {
            window.modConsole.log('Simulation reset cancelled.', 'info');
        }
    });

    window.modConsole.registerCommand('get_canvas_range', 'Get the full range of the game canvas', function(args) {
        const dims = getGameCanvasDimensions();
        if (dims.width === 0 || dims.height === 0) {
            window.modConsole.log('Canvas dimensions not available. Make sure the game is loaded.', 'error');
            return;
        }
        window.modConsole.log(`Canvas range: [0, 0, ${dims.width - 1}, ${dims.height - 1}]`, 'info');
    });

    window.modConsole.registerCommand('view_stored_range', 'View the currently stored selected range', function(args) {
        if (window.modConsole.storedRange) {
            const r = window.modConsole.storedRange;
            window.modConsole.log(`Stored range: [${r.x1}, ${r.y1}, ${r.x2}, ${r.y2}]`, 'info');
            updateSelectionHighlight(r.x1, r.y1, r.x2, r.y2); // Re-highlight for visual confirmation
        } else {
            window.modConsole.log('No range currently stored. Activate the SELECT tool and drag to select an area.', 'info');
        }
    });

    window.modConsole.registerCommand('edit_stored_range', 'Edit or clear the stored range (usage: edit_stored_range set x1 y1 x2 y2 | edit_stored_range clear)', function(args) {
        if (args.length === 0) {
            window.modConsole.log('Usage: edit_stored_range set x1 y1 x2 y2 | edit_stored_range clear', 'error');
            return;
        }

        const action = args[0].toLowerCase();
        if (action === 'set') {
            if (args.length !== 5) {
                window.modConsole.log('Usage: edit_stored_range set x1 y1 x2 y2', 'error');
                return;
            }
            const [x1, y1, x2, y2] = args.slice(1).map(Number);
            if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
                window.modConsole.log('Invalid coordinates for setting range.', 'error');
                return;
            }
            window.modConsole.storedRange = { x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) };
            window.modConsole.log(`Stored range set to: [${window.modConsole.storedRange.x1}, ${window.modConsole.storedRange.y1}, ${window.modConsole.storedRange.x2}, ${window.modConsole.storedRange.y2}]`, 'success');
            updateSelectionHighlight(window.modConsole.storedRange.x1, window.modConsole.storedRange.y1, window.modConsole.storedRange.x2, window.modConsole.storedRange.y2);
        } else if (action === 'clear') {
            window.modConsole.storedRange = null;
            clearSelectionHighlight();
            window.modConsole.log('Stored range cleared.', 'success');
        } else {
            window.modConsole.log('Invalid action. Use "set" or "clear".', 'error');
        }
    });

    // Log console initialization
    window.modConsole.log('Mod Console initialized!', 'system');
    window.modConsole.log('Press F12 or ` to toggle console. Drag on canvas with SELECT tool for area selection.', 'system');
    window.modConsole.log('Type "help" for available commands.', 'system');


    // --- Automatic button placement logic for Console and Highlight tool ---
    let consoleButtonAdded = false;
    let highlightToolButtonAdded = false;
    let highlightToolButton = null; // Reference to the actual button element

    const defaultButtonStyles = `
        padding: 6px 10px;
        margin: 2px;
        cursor: pointer;
        border-radius: 5px;
        font-size: 14px;
        font-weight: bold;
        transition: background-color 0.1s ease, box-shadow 0.1s ease;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        color: white;
        border: 1px solid #777;
        background-color: #555;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 2px rgba(0,0,0,0.3);
    `;

    const activeToolStyles = `
        background-color: rgba(255, 255, 0, 0.5); /* Yellowish active */
        border: 1px solid rgba(255, 255, 0, 0.8);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 0 10px rgba(255,255,0,0.7);
    `;

    function addConsoleButtonToMainUI() {
        if (consoleButtonAdded) return;
        let targetContainer = null;
        const commonUISelctors = [ '#controls', '#ui-panel', '.main-controls', '.sidebar', '#game-ui', '.game-wrapper' ];
        for (const selector of commonUISelctors) {
            targetContainer = document.querySelector(selector);
            if (targetContainer) break;
        }
        
        if (!targetContainer) {
            window.modConsole.log('No specific UI container found for console button. Falling back to appending to document.body (top-left).', 'warning');
            targetContainer = document.body;
        }

        const consoleButton = document.createElement('button');
        consoleButton.id = 'console-mod-button';
        consoleButton.textContent = 'Console';
        consoleButton.style.cssText = defaultButtonStyles + `
            min-width: 80px; /* Give it a consistent width */
            background-color: #555;
            border-color: #777;
        `;
        if (targetContainer === document.body) {
             consoleButton.style.position = 'fixed';
             consoleButton.style.top = '10px';
             consoleButton.style.left = '10px';
             consoleButton.style.zIndex = '9999';
        }
        consoleButton.onmouseover = () => consoleButton.style.backgroundColor = '#777';
        consoleButton.onmouseout = () => consoleButton.style.backgroundColor = '#555';
        consoleButton.onclick = () => window.modConsole.toggle();
        targetContainer.appendChild(consoleButton);
        consoleButtonAdded = true;
        window.modConsole.log('Console button added to UI.', 'system');
    }

    function addHighlightToolButtonToToolbar() {
        if (highlightToolButtonAdded) return;

        // Try to find the exact toolbar shown in the image
        // Based on common Sandboxels structure, it might be an element containing other buttons
        // Let's look for a div that contains common tool button classes/ids or specific text
        const possibleToolbars = document.querySelectorAll('div[id*="tool"], div[class*="tool"], div[id*="control"], div[class*="control"]');
        let targetToolbar = null;

        for (const toolbarCandidate of possibleToolbars) {
            // Check if it contains buttons like "Heat" or "Cool"
            const hasHeatButton = toolbarCandidate.querySelector('button[id*="heat"], button[class*="heat"], button:contains("Heat")');
            const hasCoolButton = toolbarCandidate.querySelector('button[id*="cool"], button[class*="cool"], button:contains("Cool")');
            if (hasHeatButton && hasCoolButton) {
                targetToolbar = toolbarCandidate;
                break;
            }
        }

        if (!targetToolbar) {
            window.modConsole.log('Could not find the main tool selection bar. Highlight Tool button not added there.', 'warning');
            return;
        }

        highlightToolButton = document.createElement('button');
        highlightToolButton.id = 'highlight-tool-button';
        highlightToolButton.textContent = 'SELECT'; // Use "SELECT" for the button text
        highlightToolButton.style.cssText = defaultButtonStyles; // Apply default button styles

        // Add to the toolbar
        targetToolbar.appendChild(highlightToolButton);
        highlightToolButtonAdded = true;
        window.modConsole.log('Highlight Tool button added to the toolbar.', 'system');

        // Logic for Highlight Tool button click
        highlightToolButton.onclick = () => {
            isHighlightToolActive = !isHighlightToolActive;

            // Update button visual state
            if (isHighlightToolActive) {
                highlightToolButton.style.cssText = defaultButtonStyles + activeToolStyles;
                window.modConsole.log('Highlight Tool activated. Drag on canvas to select area.', 'info');

                // If any other tool button is "active" (visually), try to deactivate it.
                // This is a heuristic and might need adjustment depending on Sandboxels' exact CSS
                const otherActiveButtons = targetToolbar.querySelectorAll('button[style*="box-shadow"]:not(#highlight-tool-button)');
                otherActiveButtons.forEach(btn => {
                    btn.style.boxShadow = defaultButtonStyles.match(/box-shadow: ([^;]+)/)[1];
                    btn.style.backgroundColor = defaultButtonStyles.match(/background-color: ([^;]+)/)[1];
                    btn.style.borderColor = defaultButtonStyles.match(/border: 1px solid ([^;]+)/)[1];
                });

            } else {
                highlightToolButton.style.cssText = defaultButtonStyles; // Reset to inactive style
                window.modConsole.log('Highlight Tool deactivated. Mouse returns to normal game functions.', 'info');
                isDraggingSelection = false; // Stop any ongoing drag
                // Do NOT clear stored range or highlight here, as user might want to keep it visible
                // and use it with console commands.
            }
        };

        // Add a general click listener to the toolbar to deactivate our tool
        // if another one is clicked. This is a heuristic and depends on how Sandboxels handles clicks.
        targetToolbar.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.id !== 'highlight-tool-button' && isHighlightToolActive) {
                isHighlightToolActive = false;
                highlightToolButton.style.cssText = defaultButtonStyles;
                window.modConsole.log(`Other tool (${e.target.textContent}) clicked. Highlight Tool deactivated.`, 'info');
            }
        });
    }

    // Use MutationObserver for robust button placement.
    const observerConfig = { childList: true, subtree: true };
    const observerTarget = document.body;

    const observer = new MutationObserver((mutations, obs) => {
        addConsoleButtonToMainUI();
        addHighlightToolButtonToToolbar();
        // Disconnect once both buttons are added
        if (consoleButtonAdded && highlightToolButtonAdded) {
            obs.disconnect();
            window.modConsole.log('All mod buttons added. Observer disconnected.', 'system');
        }
    });

    window.modConsole.log('Starting MutationObserver to detect UI elements for button placement...', 'system');
    observer.observe(observerTarget, observerConfig);

    // Also try to add them once on DOMContentLoaded and load, in case elements
    // are already there before the observer catches a mutation.
    document.addEventListener('DOMContentLoaded', () => {
        window.modConsole.log('DOMContentLoaded event fired.', 'system');
        addConsoleButtonToMainUI();
        addHighlightToolButtonToToolbar();
    });
    window.addEventListener('load', () => {
        window.modConsole.log('Window load event fired.', 'system');
        addConsoleButtonToMainUI();
        addHighlightToolButtonToToolbar();
    });

})();
