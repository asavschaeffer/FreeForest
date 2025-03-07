// logging_integration.js - Integrates structured logging with the existing game

// Store reference to original game functions to extend them
const originalGameLoop = window.gameLoop;
const originalSpawnEnemy = window.spawnEnemy;
const originalPlaceTower = window.placeTower;
const originalDamagePlayer = window.damagePlayer;

// Rename existing log function to legacyLog to prevent conflict
window.legacyLog = window.log;

// Create keyboard event listener for exporting logs with 'E' key
document.addEventListener('keydown', function(event) {
    if (event.key.toLowerCase() === 'e' && window.gameState === 'playing') {
        window.structuredLogging.exportLogs();
        window.legacyLog('Exported logs to game_logs.json', 'system');
    }
    
    // Log WASD keys for player movement
    if (window.gameState === 'playing') {
        if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
            window.structuredLogging.log('key_press', 'player', 'player_1', 
                                       `input.key.${event.key.toLowerCase()}`, null, true);
        } else if (event.key === ' ') {
            window.structuredLogging.log('key_press', 'player', 'player_1', 'input.key.space', null, true);
        }
    }
});

// Log mouse clicks for attacks
document.addEventListener('mousedown', function(event) {
    if (window.gameState === 'playing') {
        window.structuredLogging.log('mouse_click', 'player', 'player_1', 'input.mouse.attack', null, true);
    }
});

// Override the game loop to integrate structured logging
window.gameLoop = function(currentTime) {
    // Pre-update logging (assign IDs and take snapshot)
    if (window.gameState === 'playing' && window.player && window.enemies && window.towers && window.projectiles) {
        // Ensure player has an ID
        if (!window.player.id) window.player.id = 'player_1';
        
        // Assign IDs and take snapshot
        window.structuredLogging.assignIds(window.player, window.enemies, window.towers, window.projectiles);
        window.structuredLogging.takeSnapshot(window.player, window.enemies, window.towers, window.projectiles);
    }
    
    // Call original game loop
    const result = originalGameLoop(currentTime);
    
    // Post-update logging (log deltas)
    if (window.gameState === 'playing' && window.player && window.enemies && window.towers && window.projectiles) {
        window.structuredLogging.logDeltas(window.player, window.enemies, window.towers, window.projectiles);
    }
    
    return result;
};

// Override spawnEnemy to log entity addition
window.spawnEnemy = function() {
    const enemy = originalSpawnEnemy();
    if (enemy) {
        window.structuredLogging.log('entity_added', 'enemy', enemy.id || `enemy_${Date.now()}`, null, null, enemy);
    }
    return enemy;
};

// Override placeTower to log tower creation
window.placeTower = function() {
    const tower = originalPlaceTower();
    if (tower) {
        window.structuredLogging.log('entity_added', 'tower', tower.id || `tower_${Date.now()}`, null, null, tower);
    }
    return tower;
};

// Override damagePlayer to log health changes
window.damagePlayer = function(amount) {
    const oldHealth = window.player.health;
    originalDamagePlayer(amount);
    window.structuredLogging.log('property_change', 'player', 'player_1', 'player.health', oldHealth, window.player.health);
    return window.player.health;
};

console.log('Structured logging system initialized and integrated with the game.');
