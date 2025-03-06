// Game canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const debugPanel = document.getElementById('debugPanel');
const startScreen = document.getElementById('startScreen');
const endScreen = document.getElementById('endScreen');
const pauseScreen = document.getElementById('pauseScreen');
const startButton = document.getElementById('startButton');
const quitButton = document.getElementById('quitButton');
const playAgainButton = document.getElementById('playAgainButton');
const mainMenuButton = document.getElementById('mainMenuButton');
const quitGameButton = document.getElementById('quitGameButton');
const resumeButton = document.getElementById('resumeButton');
const pauseMainMenuButton = document.getElementById('pauseMainMenuButton');
const pauseQuitButton = document.getElementById('pauseQuitButton');

let gameState = 'menu'; // menu, playing, paused, or end

// Start button listener
startButton.addEventListener('click', () => {
    startGame();
});

// Quit buttons listener
quitButton.addEventListener('click', () => {
    window.close();
    // Fallback if window.close() is blocked
    window.location.href = "about:blank";
});

quitGameButton.addEventListener('click', () => {
    window.close();
    // Fallback if window.close() is blocked
    window.location.href = "about:blank";
});

pauseQuitButton.addEventListener('click', () => {
    window.close();
    // Fallback if window.close() is blocked
    window.location.href = "about:blank";
});

// Play Again button listener
playAgainButton.addEventListener('click', () => {
    startGame();
});

// Main Menu button listeners
mainMenuButton.addEventListener('click', () => {
    endScreen.style.display = 'none';
    startScreen.style.display = 'flex';
    gameState = 'menu';
});

pauseMainMenuButton.addEventListener('click', () => {
    pauseScreen.style.display = 'none';
    startScreen.style.display = 'flex';
    gameState = 'menu';
});

// Resume button listener
resumeButton.addEventListener('click', () => {
    resumeGame();
});

function startGame() {
    resetGame();
    gameState = 'playing';
    startScreen.style.display = 'none';
    endScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    requestAnimationFrame(gameLoop);
}

function showEndScreen() {
    gameState = 'end';
    endScreen.style.display = 'flex';
    // Clear any remaining game objects
    enemies = [];
    projectiles = [];
    towers = [];
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        pauseScreen.style.display = 'flex';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        log('Game paused', 'system');
    }
}

function resumeGame() {
    if (gameState === 'paused') {
        gameState = 'playing';
        pauseScreen.style.display = 'none';
        log('Game resumed', 'system');
        lastTime = performance.now();
        lastSpawnTime = lastTime;  // Reset spawn timer
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Debug logger
function log(message, type = 'system') {
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logEntry.className = `debug-${type}`;
    debugPanel.appendChild(logEntry);
    
    // Keep only the most recent logs
    while (debugPanel.children.length > 50) {
        debugPanel.removeChild(debugPanel.firstChild);
    }
    
    // Auto-scroll to bottom
    debugPanel.scrollTop = debugPanel.scrollHeight;
}

// Game state
let lastTime = 0;
let lastSpawnTime = 0;
let spawnInterval = 2000;
let animationFrameId = null;  // Track the animation frame

// Game entities
const player = {
    x: 400,
    y: 300,
    width: 30,
    height: 30,
    velocity: { x: 0, y: 0 },
    targetVelocity: { x: 0, y: 0 },
    speed: 3,
    acceleration: 0.2,
    friction: 0.1,
    health: 100,
    invulnerable: false,
    invulnerabilityTime: 1000,
    invulnerabilityTimer: 0,
    color: '#4A90E2', // Nice blue color
    resources: {
        wood: 100,
        rocks: 100
    }
};

let enemies = [];
let projectiles = [];
let towers = [];

// Tower costs
const TOWER_COST = {
    wood: 30,
    rocks: 50
};

// Colors and styles
const COLORS = {
    enemy: {
        full: '#FF6B6B',     // Coral red
        empty: '#4A4A4A'     // Dark gray
    },
    bullet: '#50E3C2',    // Cyan
    tower: {
        full: '#A593E0',     // Purple
        empty: '#4A4A4A'     // Dark gray
    },
    towerRange: 'rgba(165, 147, 224, 0.1)',  // Transparent purple
    player: {
        full: '#4A90E2',     // Bright blue
        empty: '#2C547A'     // Dark blue
    }
};

// Input handlers
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState === 'playing') {
        pauseGame();
        return;
    }

    if (gameState !== 'playing') return;
    
    switch (e.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case ' ': placeTower(); break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
    }
});

canvas.addEventListener('click', (e) => {
    if (gameState !== 'playing') return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Check if clicking on enemy
    let targetEnemy = null;
    for (const enemy of enemies) {
        if (clickX >= enemy.x && clickX <= enemy.x + enemy.width &&
            clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
            targetEnemy = enemy;
            break;
        }
    }
    
    // Fire projectile
    const projectile = new Projectile(
        player.x + player.width / 2, 
        player.y + player.height / 2, 
        targetEnemy ? targetEnemy.x + targetEnemy.width / 2 : clickX, 
        targetEnemy ? targetEnemy.y + targetEnemy.height / 2 : clickY
    );
    
    projectiles.push(projectile);
    log(`Player fired projectile at (${Math.round(projectile.velocity.x)}, ${Math.round(projectile.velocity.y)})`, 'player');
});

// Game object constructors
function Projectile(startX, startY, targetX, targetY) {
    const speed = 4;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.velocity = { x: (dx / distance) * speed, y: (dy / distance) * speed };
    this.x = startX;
    this.y = startY;
    this.width = 8;
    this.height = 8;
    this.destroyed = false;
}

function calculateVelocityTowardPlayer(x, y, speed) {
    const dx = player.x + player.width / 2 - x;
    const dy = player.y + player.height / 2 - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed
    };
}

function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (edge) {
        case 0: x = Math.random() * canvas.width; y = 0; break;
        case 1: x = canvas.width; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height; break;
        case 3: x = 0; y = Math.random() * canvas.height; break;
    }
    
    const speed = 1;
    const enemy = {
        x,
        y,
        width: 25,
        height: 25,
        speed,
        velocity: calculateVelocityTowardPlayer(x, y, speed),
        targetVelocity: { x: 0, y: 0 },
        acceleration: 0.1,
        maxHealth: 2,
        health: 2,
        damage: 10,
        destroyed: false,
        lastUpdateTime: 0
    };
    
    enemies.push(enemy);
    log(`Enemy spawned at edge ${edge}`, 'enemy');
}

function placeTower() {
    const towerX = player.x + player.width + 5;
    const towerY = player.y;
    
    // Check if player has enough resources
    if (player.resources.wood < TOWER_COST.wood || player.resources.rocks < TOWER_COST.rocks) {
        log('Not enough resources to build tower!', 'system');
        return;
    }
    
    if (towerX + 30 <= canvas.width && towerY >= 0 && towerY + 30 <= canvas.height) {
        // Deduct resources
        player.resources.wood -= TOWER_COST.wood;
        player.resources.rocks -= TOWER_COST.rocks;
        
        const tower = {
            x: towerX,
            y: towerY,
            width: 30,
            height: 30,
            range: 150,
            attackTimer: 0,
            attackInterval: 1500,  // Slower attack rate
            maxHealth: 5,
            health: 5,
            destroyed: false
        };
        
        towers.push(tower);
        log(`Tower placed (${TOWER_COST.wood} wood, ${TOWER_COST.rocks} rocks)`, 'tower');
    }
}

// Helper function to draw a hexagon
function drawHexagon(ctx, x, y, size) {
    const numberOfSides = 6;
    const step = 2 * Math.PI / numberOfSides;
    const xCenter = x + size / 2;
    const yCenter = y + size / 2;
    
    ctx.beginPath();
    for (let i = 0; i <= numberOfSides; i++) {
        const curStep = i * step + Math.PI / 6;
        const xPos = xCenter + size / 2 * Math.cos(curStep);
        const yPos = yCenter + size / 2 * Math.sin(curStep);
        if (i === 0) {
            ctx.moveTo(xPos, yPos);
        } else {
            ctx.lineTo(xPos, yPos);
        }
    }
    ctx.closePath();
}

// Helper function to draw a triangle
function drawTriangle(ctx, x, y, width, height) {
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y); // Top
    ctx.lineTo(x + width, y + height); // Bottom right
    ctx.lineTo(x, y + height); // Bottom left
    ctx.closePath();
}

// Game functions
function resetGame() {
    player.x = 400;
    player.y = 300;
    player.health = 100;
    player.velocity = { x: 0, y: 0 };
    player.invulnerable = false;
    player.invulnerabilityTimer = 0;
    player.resources = {
        wood: 100,
        rocks: 100
    };
    
    enemies = [];
    projectiles = [];
    towers = [];
    
    log('Game reset', 'system');
}

function damagePlayer(amount) {
    if (player.invulnerable) return;
    
    player.health -= amount;
    log(`Player took ${amount} damage! Health: ${player.health}`, 'player');
    
    if (player.health <= 0) {
        showEndScreen();
        log('GAME OVER', 'system');
    } else {
        // Make player invulnerable briefly
        player.invulnerable = true;
        player.invulnerabilityTimer = 0;
    }
}

// Game loop
function gameLoop(currentTime) {
    if (gameState !== 'playing') {
        return;
    }
    
    // Initialize lastTime on first frame
    if (!lastTime) {
        lastTime = currentTime;
        lastSpawnTime = currentTime;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }
    
    const deltaTime = Math.min(currentTime - lastTime, 32); // Cap at ~30 FPS to prevent huge jumps
    lastTime = currentTime;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Handle player invulnerability
    if (player.invulnerable) {
        player.invulnerabilityTimer += deltaTime;
        if (player.invulnerabilityTimer >= player.invulnerabilityTime) {
            player.invulnerable = false;
            player.invulnerabilityTimer = 0;
        }
    }
    
    // Spawn enemies
    if (currentTime - lastSpawnTime >= spawnInterval) {
        lastSpawnTime = currentTime;
        spawnEnemy();
    }
    
    // Update and render enemies with smooth movement
    enemies.forEach(enemy => {
        if (currentTime - enemy.lastUpdateTime > 1000) {
            enemy.targetVelocity = calculateVelocityTowardPlayer(enemy.x, enemy.y, enemy.speed);
            enemy.lastUpdateTime = currentTime;
        }
        
        // Smooth velocity transition
        enemy.velocity.x += (enemy.targetVelocity.x - enemy.velocity.x) * enemy.acceleration;
        enemy.velocity.y += (enemy.targetVelocity.y - enemy.velocity.y) * enemy.acceleration;
        
        enemy.x += enemy.velocity.x;
        enemy.y += enemy.velocity.y;
        
        // Check for collision with player
        if (!player.invulnerable &&
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            damagePlayer(enemy.damage);
            enemy.destroyed = true;
        }
        
        // Check for collision with towers
        towers.forEach(tower => {
            if (enemy.x < tower.x + tower.width &&
                enemy.x + enemy.width > tower.x &&
                enemy.y < tower.y + tower.height &&
                enemy.y + enemy.height > tower.y) {
                tower.health--;
                enemy.health--;
                if (tower.health <= 0) {
                    tower.destroyed = true;
                }
                if (enemy.health <= 0) {
                    enemy.destroyed = true;
                    // Add random resources when enemy is destroyed
                    const woodGain = Math.floor(Math.random() * 4); // 0-3 wood
                    const rocksGain = Math.floor(Math.random() * 4); // 0-3 rocks
                    player.resources.wood += woodGain;
                    player.resources.rocks += rocksGain;
                    log(`Enemy destroyed! Gained ${woodGain} wood, ${rocksGain} rocks`, 'enemy');
                }
            }
        });
        
        // Render enemy with health gradient
        const healthPercent = enemy.health / enemy.maxHealth;
        
        // Create linear gradient (top to bottom)
        const gradient = ctx.createLinearGradient(
            enemy.x, enemy.y,                 // Start from top
            enemy.x, enemy.y + enemy.height   // To bottom
        );
        
        // Empty at top, full at bottom, drain from top down
        gradient.addColorStop(0, COLORS.enemy.empty);
        gradient.addColorStop(1 - healthPercent, COLORS.enemy.empty);
        gradient.addColorStop(Math.min(1 - healthPercent + 0.1, 1), COLORS.enemy.full);
        gradient.addColorStop(1, COLORS.enemy.full);
        
        drawTriangle(ctx, enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = gradient;
        ctx.fill();
    });
    
    // Update and render projectiles
    projectiles.forEach(projectile => {
        projectile.x += projectile.velocity.x;
        projectile.y += projectile.velocity.y;
        
        // Render projectile
        ctx.fillStyle = COLORS.bullet;
        ctx.beginPath();
        ctx.arc(
            projectile.x + projectile.width / 2,
            projectile.y + projectile.height / 2,
            projectile.width / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Check for projectile collision with enemies
        enemies.forEach(enemy => {
            if (!enemy.destroyed && !projectile.destroyed &&
                projectile.x < enemy.x + enemy.width &&
                projectile.x + projectile.width > enemy.x &&
                projectile.y < enemy.y + enemy.height &&
                projectile.y + projectile.height > enemy.y) {
                enemy.health--;
                if (enemy.health <= 0) {
                    enemy.destroyed = true;
                    log(`Enemy destroyed`, 'projectile');
                }
                projectile.destroyed = true;
            }
        });
        
        if (projectile.x < 0 || projectile.x > canvas.width ||
            projectile.y < 0 || projectile.y > canvas.height) {
            projectile.destroyed = true;
        }
    });
    
    // Update and render towers
    towers.forEach(tower => {
        tower.attackTimer += deltaTime;
        
        if (tower.attackTimer >= tower.attackInterval) {
            tower.attackTimer = 0;
            
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            for (const enemy of enemies) {
                const dx = enemy.x + enemy.width / 2 - (tower.x + tower.width / 2);
                const dy = enemy.y + enemy.height / 2 - (tower.y + tower.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < tower.range && distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }
            
            if (closestEnemy) {
                const projectile = new Projectile(
                    tower.x + tower.width / 2,
                    tower.y + tower.height / 2,
                    closestEnemy.x + closestEnemy.width / 2,
                    closestEnemy.y + closestEnemy.height / 2
                );
                projectiles.push(projectile);
            }
        }
        
        // Draw tower range
        ctx.beginPath();
        ctx.arc(tower.x + tower.width / 2, tower.y + tower.height / 2, tower.range, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.towerRange;
        ctx.fill();
        
        // Draw tower with health gradient
        const healthPercent = tower.health / tower.maxHealth;
        
        // Create linear gradient (top to bottom)
        const gradient = ctx.createLinearGradient(
            tower.x, tower.y,                 // Start from top
            tower.x, tower.y + tower.height   // To bottom
        );
        
        // Empty at top, full at bottom, drain from top down
        gradient.addColorStop(0, COLORS.tower.empty);
        gradient.addColorStop(1 - healthPercent, COLORS.tower.empty);
        gradient.addColorStop(Math.min(1 - healthPercent + 0.1, 1), COLORS.tower.full);
        gradient.addColorStop(1, COLORS.tower.full);
        
        drawHexagon(ctx, tower.x, tower.y, tower.width);
        ctx.fillStyle = gradient;
        ctx.fill();
    });
    
    // Draw player with health gradient
    const healthPercent = player.health / 100;
    
    // Create linear gradient (top to bottom)
    const gradient = ctx.createLinearGradient(
        player.x, player.y,                 // Start from top
        player.x, player.y + player.height  // To bottom
    );
    
    // Empty at top, full at bottom, drain from top down
    gradient.addColorStop(0, COLORS.player.empty);
    gradient.addColorStop(1 - healthPercent, COLORS.player.empty);
    gradient.addColorStop(Math.min(1 - healthPercent + 0.1, 1), COLORS.player.full);
    gradient.addColorStop(1, COLORS.player.full);
    
    ctx.beginPath();
    ctx.arc(
        player.x + player.width / 2,
        player.y + player.height / 2,
        player.width / 2,
        0,
        Math.PI * 2
    );
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Remove destroyed entities
    projectiles = projectiles.filter(p => !p.destroyed);
    enemies = enemies.filter(e => !e.destroyed);
    towers = towers.filter(t => !t.destroyed);
    
    // Smooth player movement
    player.targetVelocity.x = 0;
    player.targetVelocity.y = 0;
    
    if (keys.w) player.targetVelocity.y = -player.speed;
    if (keys.s) player.targetVelocity.y = player.speed;
    if (keys.a) player.targetVelocity.x = -player.speed;
    if (keys.d) player.targetVelocity.x = player.speed;
    
    // Apply acceleration and friction
    player.velocity.x += (player.targetVelocity.x - player.velocity.x) * player.acceleration;
    player.velocity.y += (player.targetVelocity.y - player.velocity.y) * player.acceleration;
    
    // Apply friction when not moving
    if (player.targetVelocity.x === 0) player.velocity.x *= (1 - player.friction);
    if (player.targetVelocity.y === 0) player.velocity.y *= (1 - player.friction);
    
    player.x += player.velocity.x;
    player.y += player.velocity.y;
    
    // Boundary checks for player
    player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));
    player.y = Math.max(0, Math.min(player.y, canvas.height - player.height));
    
    // Draw UI elements
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`Health: ${player.health}`, 10, 20);
    ctx.fillText(`Wood: ${player.resources.wood}`, 10, 40);
    ctx.fillText(`Rocks: ${player.resources.rocks}`, 10, 60);
    ctx.fillText(`Tower Cost: ${TOWER_COST.wood} wood, ${TOWER_COST.rocks} rocks`, 10, 80);
    
    if (gameState === 'playing') {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Track key states for smooth movement
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

// Update key states
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState === 'playing') {
        pauseGame();
        return;
    }

    if (gameState !== 'playing') return;
    
    switch (e.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case ' ': placeTower(); break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
    }
});

// Start the game
log('Game initialized', 'system');
