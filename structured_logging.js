// structured_logging.js - Structured logging system for game events and state changes

// Declare global logs array
let logs = [];

// Previous states for delta tracking
let previous_states = new Map();
let enemyIdCounter = 0;
let towerIdCounter = 0;
let projectileIdCounter = 0;

/**
 * Log a game event or state change
 * @param {string} eventType - Type of event (e.g., "property_change", "entity_added", "entity_removed", "key_press")
 * @param {string} entityType - Type of entity (e.g., "player", "enemy", "tower", "projectile")
 * @param {string|null} entityId - Unique identifier for the entity (or null if not applicable)
 * @param {string|null} propertyPath - Path to the changed property (e.g., "player.position.x")
 * @param {*} oldValue - Previous value (or null if not applicable)
 * @param {*} newValue - New value (or null if not applicable)
 */
function log(eventType, entityType, entityId, propertyPath, oldValue, newValue) {
    const logEntry = {
        frame: window.frameCount || 0,
        time: new Date().toISOString(),
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        property_path: propertyPath,
        old_value: oldValue,
        new_value: newValue
    };
    logs.push(logEntry);
    // Log to console for debugging
    console.log(`[${eventType}] [Frame ${window.frameCount || 0}] ${propertyPath || entityType}: ${oldValue} -> ${newValue}`);
}

/**
 * Assign unique IDs to game entities
 * @param {Object} player - Player object
 * @param {Array} enemies - Array of enemy objects
 * @param {Array} towers - Array of tower objects
 * @param {Array} projectiles - Array of projectile objects
 */
function assignIds(player, enemies, towers, projectiles) {
    if (!player.id) player.id = 'player_1';
    
    enemies.forEach(enemy => {
        if (!enemy.id) enemy.id = `enemy_${enemyIdCounter++}`;
    });
    
    towers.forEach(tower => {
        if (!tower.id) tower.id = `tower_${towerIdCounter++}`;
    });
    
    projectiles.forEach(projectile => {
        if (!projectile.id) projectile.id = `projectile_${projectileIdCounter++}`;
    });
}

/**
 * Take a snapshot of the current game state
 * @param {Object} player - Player object
 * @param {Array} enemies - Array of enemy objects
 * @param {Array} towers - Array of tower objects
 * @param {Array} projectiles - Array of projectile objects
 */
function takeSnapshot(player, enemies, towers, projectiles) {
    previous_states.set(player.id, JSON.parse(JSON.stringify(player)));
    
    enemies.forEach(enemy => {
        previous_states.set(enemy.id, JSON.parse(JSON.stringify(enemy)));
    });
    
    towers.forEach(tower => {
        previous_states.set(tower.id, JSON.parse(JSON.stringify(tower)));
    });
    
    projectiles.forEach(projectile => {
        previous_states.set(projectile.id, JSON.parse(JSON.stringify(projectile)));
    });
}

/**
 * Log changes between current and previous state (deltas)
 * @param {Object} player - Player object
 * @param {Array} enemies - Array of enemy objects
 * @param {Array} towers - Array of tower objects
 * @param {Array} projectiles - Array of projectile objects
 */
function logDeltas(player, enemies, towers, projectiles) {
    // Player changes
    const prevPlayer = previous_states.get(player.id);
    if (prevPlayer) {
        for (const key in player) {
            if (JSON.stringify(player[key]) !== JSON.stringify(prevPlayer[key])) {
                log('property_change', 'player', player.id, `player.${key}`, prevPlayer[key], player[key]);
            }
        }
    }
    
    // Enemies
    enemies.forEach(enemy => {
        const prevEnemy = previous_states.get(enemy.id);
        if (!prevEnemy) {
            log('entity_added', 'enemy', enemy.id, null, null, enemy);
        } else {
            for (const key in enemy) {
                if (JSON.stringify(enemy[key]) !== JSON.stringify(prevEnemy[key])) {
                    log('property_change', 'enemy', enemy.id, `enemy.${enemy.id}.${key}`, prevEnemy[key], enemy[key]);
                }
            }
        }
    });
    
    // Towers
    towers.forEach(tower => {
        const prevTower = previous_states.get(tower.id);
        if (!prevTower) {
            log('entity_added', 'tower', tower.id, null, null, tower);
        } else {
            for (const key in tower) {
                if (JSON.stringify(tower[key]) !== JSON.stringify(prevTower[key])) {
                    log('property_change', 'tower', tower.id, `tower.${tower.id}.${key}`, prevTower[key], tower[key]);
                }
            }
        }
    });
    
    // Projectiles
    projectiles.forEach(projectile => {
        const prevProjectile = previous_states.get(projectile.id);
        if (!prevProjectile) {
            log('entity_added', 'projectile', projectile.id, null, null, projectile);
        } else {
            for (const key in projectile) {
                if (JSON.stringify(projectile[key]) !== JSON.stringify(prevProjectile[key])) {
                    log('property_change', 'projectile', projectile.id, `projectile.${projectile.id}.${key}`, prevProjectile[key], projectile[key]);
                }
            }
        }
    });
    
    // Check for removed entities
    previous_states.forEach((state, id) => {
        if (id !== player.id && 
            !enemies.find(e => e.id === id) && 
            !towers.find(t => t.id === id) && 
            !projectiles.find(p => p.id === id)) {
            const entityType = id.split('_')[0];
            log('entity_removed', entityType, id, null, state, null);
        }
    });
}

/**
 * Export logs as a JSON file
 */
function exportLogs() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game_logs.json';
    a.click();
    URL.revokeObjectURL(url);
    console.log('Logs exported to game_logs.json');
}

// Export functions for use in main game file
window.structuredLogging = {
    log,
    assignIds,
    takeSnapshot,
    logDeltas,
    exportLogs,
    logs
};
