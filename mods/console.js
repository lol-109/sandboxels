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
        // --- Add SELECT tool to Special category in Sandboxels ---
    function addSelectToolToSpecialCategory() {
        if (typeof toolOrder === "undefined" || typeof tools === "undefined") {
            window.modConsole.log("Sandboxels toolOrder/tools not yet available. Retrying shortly...", "warning");
            setTimeout(addSelectToolToSpecialCategory, 1000);
            return;
        }

        if (tools.select) {
            window.modConsole.log("SELECT tool already exists. Skipping redefinition.", "info");
            return;
        }

        tools.select = {
            name: "Select",
            category: "special",
            tool: function () {
                isHighlightToolActive = !isHighlightToolActive;

                if (isHighlightToolActive) {
                    window.modConsole.log("SELECT tool activated. Drag on canvas to select an area.", "info");
                } else {
                    isDraggingSelection = false;
                    window.modConsole.log("SELECT tool deactivated.", "info");
                }
            },
            desc: "Drag to select an area for console commands"
        };

        if (!toolOrder.special.includes("select")) {
            toolOrder.special.push("select");
        }

        window.modConsole.log("SELECT tool added to Special category.", "success");
    }

    // Add Console button to the UI as before
    function addConsoleButtonToMainUI() {
        if (document.getElementById("console-mod-button")) return;
        let targetContainer = null;
        const selectors = [ '#controls', '#ui-panel', '.main-controls', '.sidebar', '#game-ui', '.game-wrapper' ];
        for (const selector of selectors) {
            targetContainer = document.querySelector(selector);
            if (targetContainer) break;
        }
        if (!targetContainer) {
            window.modConsole.log("No UI container found. Falling back to body.", "warning");
            targetContainer = document.body;
        }

        const btn = document.createElement('button');
        btn.id = 'console-mod-button';
        btn.textContent = 'Console';
        btn.style.cssText = `
            padding: 6px 10px;
            margin: 2px;
            cursor: pointer;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            color: white;
            border: 1px solid #777;
            background-color: #555;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 2px rgba(0,0,0,0.3);
            min-width: 80px;
        `;
        btn.onmouseover = () => btn.style.backgroundColor = '#777';
        btn.onmouseout = () => btn.style.backgroundColor = '#555';
        btn.onclick = () => window.modConsole.toggle();

        if (targetContainer === document.body) {
            btn.style.position = 'fixed';
            btn.style.top = '10px';
            btn.style.left = '10px';
            btn.style.zIndex = '9999';
        }

        targetContainer.appendChild(btn);
        window.modConsole.log("Console button added to UI.", "system");
    }

    // Trigger both functions when DOM is ready
    window.addEventListener("load", () => {
        addConsoleButtonToMainUI();
        addSelectToolToSpecialCategory();
    });

    document.addEventListener("DOMContentLoaded", () => {
        addConsoleButtonToMainUI();
        addSelectToolToSpecialCategory();
    });

})();
    
