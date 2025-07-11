// Log to mod console if available
if (window.modConsole) {
    modConsole.log('Soul Possession Mod loading...', 'system');
}

elements.soul = {
    color: "#87fff9",
    tick: function(pixel) {
        if (pixel.y <= 1) { deletePixel(pixel.x,pixel.y); return; }
        if (Math.random() < 0.05) {
            if (!tryMove(pixel,pixel.x,pixel.y-1)) {
                if (!isEmpty(pixel.x,pixel.y-1,true)) {
                    var hitPixel = pixelMap[pixel.x][pixel.y-1];
                    if (elements[hitPixel.element].movable) {
                        swapPixels(pixel,hitPixel);
                    }
                }
            }
        }
        var dir = pixel.flipX ? -1 : 1;
        if (!pixel.stage) {
            if (Math.random() < 0.25) {
                if (!tryMove(pixel,pixel.x+dir,pixel.y-( Math.random() < 0.33 ? 1 : 0 ))) {
                    pixel.flipX = !pixel.flipX;
                }
                if (Math.random() < 0.1) {
                    pixel.stage = 1;
                    pixel.flipX = Math.random() < 0.5;
                }
            }
        }
        else if (pixel.stage === 1) {
            if (!tryMove(pixel,pixel.x+dir,pixel.y+1)) { pixel.flipX = !pixel.flipX; }
            if (Math.random() < 0.25) {
                pixel.stage = 2;
                pixel.flipX = Math.random() < 0.5;
            }
        }
        else if (pixel.stage === 2) {
            if (Math.random() < 0.25) {
                var dirX = Math.floor(Math.random() * (2 - -1) + -1);
                var dirY = Math.floor(Math.random() * (2 - -1) + -1);
                tryMove(pixel,pixel.x+dirX,pixel.y+dirY);
            }
            if (Math.random() < 0.01) {
                pixel.stage = 0;
                pixel.flipX = Math.random() < 0.5;
            }
        }
        
        // Check for nearby body parts to possess
        if (Math.random() < 0.02) {
            for (var i = 0; i < adjacentCoords.length; i++) {
                var coords = adjacentCoords[i];
                var x = pixel.x + coords[0];
                var y = pixel.y + coords[1];
                if (!isEmpty(x,y,true)) {
                    var targetPixel = pixelMap[x][y];
                    if ((targetPixel.element === "body" || targetPixel.element === "head") && !targetPixel.possessed) {
                        // Possess the body part
                        targetPixel.possessed = true;
                        targetPixel.possessedBy = "soul";
                        if (window.modConsole) {
                            modConsole.log(`Soul possessed ${targetPixel.element} at (${x},${y})`, 'success');
                        }
                        // Delete the soul pixel as it merges with the body
                        deletePixel(pixel.x, pixel.y);
                        return;
                    }
                }
            }
        }
        
        if (!pixel.glow) {
            if (Math.random() < 0.25) { pixel.glow = true; }
        }
        else if (Math.random() < 0.01) {
            pixel.glow = false;
            delete pixel.glow;
        }
        if (Math.random() < 0.0002 && isEmpty(pixel.x,pixel.y+1)) {
            createPixel("ectoplasm",pixel.x,pixel.y+1);
        }
        if (Math.random() < 0.001) {
            for (var i = 0; i < adjacentCoords.length; i++) {
                var coords = adjacentCoords[i];
                var x = pixel.x + coords[0];
                var y = pixel.y + coords[1];
                if (isEmpty(x,y)) {
                    createPixel("flash",x,y);
                    pixelMap[x][y].temp = -10;
                }
            }
        }
        doDefaults(pixel);
    },
    reactions: {
        "light_bulb": { charged:true, elem2:"explosion" },
        "led_r": { charged:true, elem2:"explosion" },
        "led_g": { charged:true, elem2:"explosion" },
        "led_b": { charged:true, elem2:"explosion" },
        "wire": { charge2:1, chance:0.05 },
        "body": { attr2:{"panic":20} },
        "proton": { elem1:null },
        "human": { func:function(pixel1,pixel2) {
            if (!pixel2.possessed && Math.random() < 0.3) {
                pixel2.possessed = true;
                pixel2.possessedBy = "soul";
                deletePixel(pixel1.x, pixel1.y);
            }
        } },
        "body": { func:function(pixel1,pixel2) {
            if (!pixel2.possessed && Math.random() < 0.3) {
                pixel2.possessed = true;
                pixel2.possessedBy = "soul";
                deletePixel(pixel1.x, pixel1.y);
            }
        } },
        "head": { func:function(pixel1,pixel2) {
            if (!pixel2.possessed && Math.random() < 0.3) {
                pixel2.possessed = true;
                pixel2.possessedBy = "soul";
                deletePixel(pixel1.x, pixel1.y);
            }
        } }
    },
    temp: 29,
    hardness: 100,
    flippableX: true,
    glow: true,
    state: "gas",
    density: 1000,
    ignoreAir: true,
    category: "life",
    insulate: true,
    hidden: true,
    emit: 3
}

elements.ectoplasm = {
    color: ["#ADF9E7","#c1fbed"],
    behavior: behaviors.LIQUID,
    tick: function(pixel) {
        if (pixel.temp >= -10 && Math.random() < 0.01 && pixelTicks-pixel.start > 100) {
            deletePixel(pixel.x,pixel.y)
        }
    },
    reactions: {
        "body": { attr2:{"panic":20} },
        "rock_wall": { elem1:null, elem2:"tombstone" }
    },
    temp: -2,
    category: "liquids",
    state: "liquid",
    density: 0.0001,
    ignoreAir: true,
    insulate: true,
    viscosity: 1666,
    hardness: 100,
    hidden: true,
    emit: 2
}

// Modify body element to handle possession
if (elements.body) {
    // Store original tick function if it exists
    if (elements.body.tick) {
        elements.body.originalTick = elements.body.tick;
    }
    elements.body.tick = function(pixel) {
        if (pixel.possessed) {
            // Chance to release soul and return to normal
            if (Math.random() < 0.001) {
                pixel.possessed = false;
                delete pixel.possessedBy;
                if (window.modConsole) {
                    modConsole.log(`Soul released from ${pixel.element} at (${pixel.x},${pixel.y})`, 'info');
                }
                // Create a soul nearby
                for (var i = 0; i < adjacentCoords.length; i++) {
                    var coords = adjacentCoords[i];
                    var x = pixel.x + coords[0];
                    var y = pixel.y + coords[1];
                    if (isEmpty(x,y)) {
                        createPixel("soul",x,y);
                        break;
                    }
                }
            }
        }
        // Call original tick function if it exists
        if (elements.body.originalTick) {
            elements.body.originalTick(pixel);
        }
    };
}

// Modify human element to handle possession (only if it exists)
if (elements.human) {
    // Store original tick function if it exists
    if (elements.human.tick) {
        elements.human.originalTick = elements.human.tick;
    }
    elements.human.tick = function(pixel) {
        if (pixel.possessed) {
            // Chance to release soul and return to normal
            if (Math.random() < 0.001) {
                pixel.possessed = false;
                delete pixel.possessedBy;
                // Create a soul nearby
                for (var i = 0; i < adjacentCoords.length; i++) {
                    var coords = adjacentCoords[i];
                    var x = pixel.x + coords[0];
                    var y = pixel.y + coords[1];
                    if (isEmpty(x,y)) {
                        createPixel("soul",x,y);
                        break;
                    }
                }
            }
        }
        // Call original tick function if it exists
        if (elements.human.originalTick) {
            elements.human.originalTick(pixel);
        }
    };
}

elements.head.breakInto = "soul";
elements.head.burnInto = "soul";
elements.head.stateHigh = "soul";
elements.head.stateLow = "soul";
// Store original head tick function if it exists
if (elements.head.tick) {
    elements.head.originalTick = elements.head.tick;
}
elements.head.tick = function(pixel) {
    if (pixel.possessed) {
        // Change color to pale blue when possessed
        pixel.color = "#b3d9ff";
    }
    // Call original tick function if it exists
    if (elements.head.originalTick) {
        elements.head.originalTick(pixel);
    }
};
elements.head.onDelete = function(pixel) {
    for (var i = 0; i < adjacentCoords.length; i++) {
        var coord = adjacentCoords[i];
        var x = pixel.x+coord[0];
        var y = pixel.y+coord[1];
        if (!isEmpty(x,y,true) && pixelMap[x][y].panic !== undefined) {
            pixelMap[x][y].panic += 20;
        }
    }
    releaseElement(pixel,"soul");
}
elements.head.onChange = function(pixel,element) {
    for (var i = 0; i < adjacentCoords.length; i++) {
        var coord = adjacentCoords[i];
        var x = pixel.x+coord[0];
        var y = pixel.y+coord[1];
        if (!isEmpty(x,y,true) && pixelMap[x][y].panic !== undefined) {
            pixelMap[x][y].panic += 20;
        }
    }
    if (element !== "soul") {
        releaseElement(pixel,"soul");
    }
}

// Check if bless element exists before adding reactions
if (elements.bless) {
    elements.bless.reactions.soul = { elem2:"human" };
    elements.bless.reactions.ectoplasm = { elem2:null };
    elements.bless.reactions.tombstone = { elem2:"rock_wall" };
}

elements.tombstone = {
    color: ["#5f5f5f","#434343","#282828"],
    behavior: [
        "XX|CR:soul%0.01|XX",
        "CR:soul%0.01|XX|CR:soul%0.01",
        "XX|XX|XX",
    ],
    category:"special",
    tempHigh: 950,
    stateHigh: "magma",
    state: "solid",
    density: 2550,
    hardness: 0.5,
    breakInto: ["rock","rock","rock","rock","soul","ectoplasm"],
    onStateHigh: function(pixel) {
        releaseElement(pixel,"soul");
    },
    buttonGlow: "#87fff9"
}

// Register soul-specific commands
if (window.modConsole) {
    modConsole.registerCommand('possess', 'Force possession of nearby body parts (usage: possess [range])', function(args) {
        const range = parseInt(args[0]) || 5;
        const x = mousePos ? mousePos.x : width/2;
        const y = mousePos ? mousePos.y : height/2;
        
        let possessed = 0;
        for (let i = x - range; i <= x + range; i++) {
            for (let j = y - range; j <= y + range; j++) {
                if (!isEmpty(i, j)) {
                    const pixel = pixelMap[i][j];
                    if ((pixel.element === 'body' || pixel.element === 'head') && !pixel.possessed) {
                        pixel.possessed = true;
                        pixel.possessedBy = 'soul';
                        possessed++;
                    }
                }
            }
        }
        modConsole.log(`Possessed ${possessed} body parts in range ${range}`, 'success');
    });
    
    modConsole.registerCommand('exorcise', 'Remove all possessions (usage: exorcise [range])', function(args) {
        const range = parseInt(args[0]) || 5;
        const x = mousePos ? mousePos.x : width/2;
        const y = mousePos ? mousePos.y : height/2;
        
        let exorcised = 0;
        for (let i = x - range; i <= x + range; i++) {
            for (let j = y - range; j <= y + range; j++) {
                if (!isEmpty(i, j)) {
                    const pixel = pixelMap[i][j];
                    if (pixel.possessed) {
                        pixel.possessed = false;
                        delete pixel.possessedBy;
                        exorcised++;
                        
                        // Create a soul nearby
                        for (let k = 0; k < 8; k++) {
                            const coords = adjacentCoords[k];
                            const soulX = i + coords[0];
                            const soulY = j + coords[1];
                            if (isEmpty(soulX, soulY)) {
                                createPixel("soul", soulX, soulY);
                                break;
                            }
                        }
                    }
                }
            }
        }
        modConsole.log(`Exorcised ${exorcised} possessions in range ${range}`, 'success');
    });
    
    modConsole.registerCommand('soul_count', 'Count souls and possessions', function(args) {
        let souls = 0;
        let possessions = 0;
        
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (!isEmpty(x, y)) {
                    const pixel = pixelMap[x][y];
                    if (pixel.element === 'soul') {
                        souls++;
                    }
                    if (pixel.possessed) {
                        possessions++;
                    }
                }
            }
        }
        
        modConsole.log(`Active souls: ${souls}`, 'info');
        modConsole.log(`Active possessions: ${possessions}`, 'info');
    });
    
    modConsole.log('Soul Possession Mod loaded successfully!', 'system');
    modConsole.log('Commands: possess, exorcise, soul_count', 'system');
}
