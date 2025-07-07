// Sandboxels Console Mod
// Create a custom console for mod commands and logging

// Create console object
window.modConsole = {
    logs: [],
    commands: {},
    isOpen: false,
    element: null,
    
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
        console.log(`[ModConsole ${timestamp}] ${message}`);
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
    
    // Create console UI
    createUI: function() {
        if (this.element) return;
        
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
            display: none;
            z-index: 10000;
            flex-direction: column;
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
        `;
        header.innerHTML = `
            <span>Mod Console</span>
            <button id="console-close" style="background: #f44; color: white; border: none; padding: 2px 6px; cursor: pointer;">×</button>
        `;
        
        // Create log display
        const logDisplay = document.createElement('div');
        logDisplay.id = 'console-logs';
        logDisplay.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background: rgba(0, 0, 0, 0.8);
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
        input.placeholder = 'Enter command...';
        input.style.cssText = `
            width: 100%;
            background: #111;
            color: #fff;
            border: 1px solid #555;
            padding: 5px;
            border-radius: 4px;
            font-family: inherit;
        `;
        
        // Assemble console
        inputArea.appendChild(input);
        consoleDiv.appendChild(header);
        consoleDiv.appendChild(logDisplay);
        consoleDiv.appendChild(inputArea);
        document.body.appendChild(consoleDiv);
        
        this.element = consoleDiv;
        
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
            if (e.key === 'F12' || e.key === '`') {
                e.preventDefault();
                this.toggle();
            }
        });
    },
    
    // Update display
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
            case 'system': return '#ff44ff';
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
        document.getElementById('console-input').focus();
    },
    
    // Close console
    close: function() {
        if (this.element) {
            this.element.style.display = 'none';
        }
        this.isOpen = false;
    }
};

// Initialize console
modConsole.createUI();

// Register default commands
modConsole.registerCommand('spawn', 'Spawn element at cursor (usage: spawn <element> [amount])', function(args) {
    if (args.length === 0) {
        modConsole.log('Usage: spawn <element> [amount]', 'error');
        return;
    }
    
    const element = args[0];
    const amount = parseInt(args[1]) || 1;
    
    if (!elements[element]) {
        modConsole.log(`Element '${element}' does not exist`, 'error');
        return;
    }
    
    // Spawn at mouse position or center
    const x = mousePos ? mousePos.x : width/2;
    const y = mousePos ? mousePos.y : height/2;
    
    for (let i = 0; i < amount; i++) {
        const offsetX = Math.floor(Math.random() * 10) - 5;
        const offsetY = Math.floor(Math.random() * 10) - 5;
        if (isEmpty(x + offsetX, y + offsetY)) {
            createPixel(element, x + offsetX, y + offsetY);
        }
    }
    
    modConsole.log(`Spawned ${amount} ${element}(s)`, 'success');
});

modConsole.registerCommand('clear_area', 'Clear all pixels in an area (usage: clear_area <size>)', function(args) {
    const size = parseInt(args[0]) || 10;
    const x = mousePos ? mousePos.x : width/2;
    const y = mousePos ? mousePos.y : height/2;
    
    let cleared = 0;
    for (let i = x - size; i <= x + size; i++) {
        for (let j = y - size; j <= y + size; j++) {
            if (!isEmpty(i, j)) {
                deletePixel(i, j);
                cleared++;
            }
        }
    }
    
    modConsole.log(`Cleared ${cleared} pixels in ${size*2}x${size*2} area`, 'success');
});

modConsole.registerCommand('list_elements', 'List all available elements', function(args) {
    const elementList = Object.keys(elements).sort();
    modConsole.log(`Available elements (${elementList.length}):`, 'info');
    elementList.forEach(element => {
        modConsole.log(`  ${element}`, 'info');
    });
});

modConsole.registerCommand('element_info', 'Get information about an element (usage: element_info <element>)', function(args) {
    if (args.length === 0) {
        modConsole.log('Usage: element_info <element>', 'error');
        return;
    }
    
    const element = args[0];
    if (!elements[element]) {
        modConsole.log(`Element '${element}' does not exist`, 'error');
        return;
    }
    
    const info = elements[element];
    modConsole.log(`Information for '${element}':`, 'info');
    modConsole.log(`  Color: ${info.color}`, 'info');
    modConsole.log(`  Category: ${info.category}`, 'info');
    modConsole.log(`  State: ${info.state}`, 'info');
    modConsole.log(`  Density: ${info.density}`, 'info');
    modConsole.log(`  Temperature: ${info.temp}`, 'info');
});

modConsole.registerCommand('pause', 'Pause/unpause the simulation', function(args) {
    paused = !paused;
    modConsole.log(`Simulation ${paused ? 'paused' : 'resumed'}`, 'success');
});

modConsole.registerCommand('reset', 'Clear the entire simulation', function(args) {
    if (confirm('Are you sure you want to clear everything?')) {
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (!isEmpty(x, y)) {
                    deletePixel(x, y);
                }
            }
        }
        modConsole.log('Simulation cleared', 'success');
    }
});

// Log console initialization
modConsole.log('Mod Console initialized successfully!', 'system');
modConsole.log('Press F12 or ` to toggle console', 'system');
modConsole.log('Type "help" for available commands', 'system');
