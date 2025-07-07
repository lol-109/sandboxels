// ==UserScript==
// @name         Sandboxels Area Selection Tool
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a draggable area selection tool to Sandboxels
// @author       ChatGPT
// @match        https://sandboxels.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let selectionStart = null;
    let selectionEnd = null;
    let storedRange = null;
    let selectionCanvas, ctx;

    // Create transparent overlay canvas
    function initCanvas() {
        selectionCanvas = document.createElement('canvas');
        selectionCanvas.id = 'selectionOverlay';
        selectionCanvas.style.position = 'absolute';
        selectionCanvas.style.top = 0;
        selectionCanvas.style.left = 0;
        selectionCanvas.style.zIndex = 10000;
        selectionCanvas.style.pointerEvents = 'none';
        document.body.appendChild(selectionCanvas);
        ctx = selectionCanvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        selectionCanvas.width = window.innerWidth;
        selectionCanvas.height = window.innerHeight;
    }

    function drawSelection() {
        ctx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
        if (storedRange) {
            const { x1, y1, x2, y2 } = storedRange;
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        }
    }

    function toCanvasCoords(clientX, clientY) {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor(clientX - rect.left),
            y: Math.floor(clientY - rect.top)
        };
    }

    function registerSelectionTool() {
        elements.selection_tool = {
            color: "#ffff99",
            tool: true,
            category: "special",
            desc: "Drag to select an area",
            tick: function() {},
            onmousedown: function(pixel, mouseX, mouseY) {
                const coords = toCanvasCoords(mouseX, mouseY);
                selectionStart = coords;
                selectionEnd = coords;
                updateSelection(coords);
            },
            onmousemove: function(pixel, mouseX, mouseY) {
                if (!selectionStart) return;
                const coords = toCanvasCoords(mouseX, mouseY);
                selectionEnd = coords;
                updateSelection(coords);
            },
            onmouseup: function() {
                if (!selectionStart || !selectionEnd) return;
                storedRange = {
                    x1: Math.min(selectionStart.x, selectionEnd.x),
                    y1: Math.min(selectionStart.y, selectionEnd.y),
                    x2: Math.max(selectionStart.x, selectionEnd.x),
                    y2: Math.max(selectionStart.y, selectionEnd.y)
                };
                selectionStart = selectionEnd = null;
                drawSelection();
            }
        };
    }

    function updateSelection(coords) {
        drawSelection();
        if (!selectionStart || !coords) return;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        const x = Math.min(selectionStart.x, coords.x);
        const y = Math.min(selectionStart.y, coords.y);
        const w = Math.abs(selectionStart.x - coords.x);
        const h = Math.abs(selectionStart.y - coords.y);
        ctx.fillRect(x, y, w, h);
    }

    function patchConsoleMod() {
        if (!window.modConsole) {
            setTimeout(patchConsoleMod, 1000);
            return;
        }

        window.modConsole.registerCommand('get_range', 'View stored range', function() {
            if (!storedRange) return window.modConsole.log('No range selected.', 'warning');
            const { x1, y1, x2, y2 } = storedRange;
            window.modConsole.log(`Stored range: (${x1}, ${y1}) to (${x2}, ${y2})`, 'info');
        });

        window.modConsole.registerCommand('clear_range', 'Clear the stored range', function() {
            storedRange = null;
            drawSelection();
            window.modConsole.log('Stored range cleared.', 'success');
        });

        window.modConsole.registerCommand('set_range', 'Set a new range (usage: set_range x1 y1 x2 y2)', function(args) {
            if (args.length < 4) return window.modConsole.log('Usage: set_range x1 y1 x2 y2', 'error');
            storedRange = {
                x1: parseInt(args[0]),
                y1: parseInt(args[1]),
                x2: parseInt(args[2]),
                y2: parseInt(args[3])
            };
            drawSelection();
            window.modConsole.log('Stored range updated.', 'success');
        });

        window.modConsole.registerCommand('canvas_range', 'Get full canvas range', function() {
            if (typeof width === 'undefined' || typeof height === 'undefined') {
                return window.modConsole.log('Canvas size not available.', 'error');
            }
            window.modConsole.log(`Canvas range: (0, 0) to (${width}, ${height})`, 'info');
        });
    }

    // Initialize
    initCanvas();
    registerSelectionTool();
    patchConsoleMod();
})();
