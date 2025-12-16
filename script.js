// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Load tank images
const playerTankImg = new Image();
const enemyTankImg = new Image();
let imagesLoaded = 0;
const totalImages = 2;

playerTankImg.onload = function() {
    imagesLoaded++;
    console.log('Player tank image loaded');
};
playerTankImg.onerror = function() {
    console.error('Failed to load player tank image');
};
playerTankImg.src = 'rodrigojony/25630-removebg-preview.png';

enemyTankImg.onload = function() {
    imagesLoaded++;
    console.log('Enemy tank image loaded');
};
enemyTankImg.onerror = function() {
    console.error('Failed to load enemy tank image');
};
enemyTankImg.src = 'rodrigojony/36042-removebg-preview.png';

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;
let level = 1;
let kills = 0;
let mouseX = 0;
let mouseY = 0;

// Player tank
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 50,
    height: 50,
    speed: 3.5,
    turretAngle: 0,
    bodyAngle: 0,
    health: 100,
    maxHealth: 100,
    color: '#2ecc71',
    invulnerable: false,
    invulnerableTime: 0,
    fireRate: 300,
    lastShot: 0,
    powerup: null,
    powerupDuration: 0
};

// Keys pressed
const keys = {};

// Arrays for game objects
const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];
const powerups = [];
const explosions = [];

// Game settings
const bulletSpeed = 8;
const bulletSize = 6;
let enemySpawnRate = 2500;
let lastEnemySpawn = 0;
let lastPowerupSpawn = 0;
const powerupSpawnRate = 15000;

// Start game function
function startGame() {
    // Check if images are loaded
    if (imagesLoaded < totalImages) {
        console.log('Waiting for images to load... (' + imagesLoaded + '/' + totalImages + ')');
        // Try again after a short delay
        setTimeout(startGame, 100);
        return;
    }
    
    gameStarted = true;
    document.getElementById('startScreen').classList.add('hide');
    requestAnimationFrame(gameLoop);
}

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        activatePowerup();
    }
});
window.addEventListener('keyup', (e) => keys[e.key] = false);

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (!gameOver && gameStarted) shootBullet();
});

let autoShoot = false;
canvas.addEventListener('mousedown', () => autoShoot = true);
canvas.addEventListener('mouseup', () => autoShoot = false);

// Player movement
function updatePlayer(timestamp) {
    let dx = 0, dy = 0;
    
    // Movement controls (WASD and Arrow keys)
    if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }
    
    // Apply speed
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    
    // Update body angle based on movement
    if (dx !== 0 || dy !== 0) {
        player.bodyAngle = Math.atan2(dy, dx);
    }

    // Keep player in bounds
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));

    // Update turret angle to follow mouse
    player.turretAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
    
    // Update invulnerability
    if (player.invulnerable && timestamp - player.invulnerableTime > 3000) {
        player.invulnerable = false;
    }
    
    // Update powerup duration
    if (player.powerup && timestamp - player.powerupDuration > 10000) {
        player.powerup = null;
        applyPowerupEffects(null);
    }
    
    // Auto shoot
    if (autoShoot && timestamp - player.lastShot > player.fireRate) {
        shootBullet();
        player.lastShot = timestamp;
    }
}

// Draw player tank
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Invulnerability flash effect
    if (player.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Power-up glow effect
    if (player.powerup) {
        const glowColors = {
            speed: '#22d3ee',
            damage: '#ef4444',
            shield: '#fbbf24',
            rapid: '#a855f7'
        };
        ctx.shadowBlur = 20;
        ctx.shadowColor = glowColors[player.powerup] || '#fff';
    }
    
    // Draw tank image or fallback
    ctx.rotate(player.turretAngle);
    if (playerTankImg.complete && playerTankImg.naturalHeight !== 0) {
        ctx.drawImage(playerTankImg, -player.width / 2, -player.height / 2, player.width, player.height);
    } else {
        // Fallback: draw colored rectangle
        ctx.fillStyle = player.color;
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        // Draw turret direction indicator
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, -5, player.width / 2, 10);
    }
    
    ctx.restore();
    
    // Draw health bar
    const barWidth = 60;
    const barHeight = 8;
    const barX = player.x - barWidth / 2;
    const barY = player.y - player.height / 2 - 15;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    
    // Health bar
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Current health
    const healthPercent = player.health / player.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    ctx.shadowBlur = 0;
}

// Shoot bullet
function shootBullet() {
    const damage = player.powerup === 'damage' ? 2 : 1;
    const speed = bulletSpeed * (player.powerup === 'rapid' ? 1.5 : 1);
    
    bullets.push({
        x: player.x + Math.cos(player.turretAngle) * 30,
        y: player.y + Math.sin(player.turretAngle) * 30,
        vx: Math.cos(player.turretAngle) * speed,
        vy: Math.sin(player.turretAngle) * speed,
        size: bulletSize,
        damage: damage
    });
    
    // Triple shot for rapid fire
    if (player.powerup === 'rapid') {
        const spreadAngle = 0.2;
        bullets.push({
            x: player.x + Math.cos(player.turretAngle + spreadAngle) * 30,
            y: player.y + Math.sin(player.turretAngle + spreadAngle) * 30,
            vx: Math.cos(player.turretAngle + spreadAngle) * speed,
            vy: Math.sin(player.turretAngle + spreadAngle) * speed,
            size: bulletSize,
            damage: damage
        });
        bullets.push({
            x: player.x + Math.cos(player.turretAngle - spreadAngle) * 30,
            y: player.y + Math.sin(player.turretAngle - spreadAngle) * 30,
            vx: Math.cos(player.turretAngle - spreadAngle) * speed,
            vy: Math.sin(player.turretAngle - spreadAngle) * speed,
            size: bulletSize,
            damage: damage
        });
    }
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x += bullets[i].vx;
        bullets[i].y += bullets[i].vy;
        
        // Remove bullets that are off screen
        if (bullets[i].x < 0 || bullets[i].x > canvas.width || 
            bullets[i].y < 0 || bullets[i].y > canvas.height) {
            bullets.splice(i, 1);
        }
    }
    
    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].x += enemyBullets[i].vx;
        enemyBullets[i].y += enemyBullets[i].vy;
        
        if (enemyBullets[i].x < 0 || enemyBullets[i].x > canvas.width || 
            enemyBullets[i].y < 0 || enemyBullets[i].y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

// Draw bullets
function drawBullets() {
    // Player bullets with glow
    bullets.forEach(bullet => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    
    // Enemy bullets with glow
    enemyBullets.forEach(bullet => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Spawn enemy
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -50; break;
        case 1: x = canvas.width + 50; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 50; break;
        case 3: x = -50; y = Math.random() * canvas.height; break;
    }
    
    // Increase difficulty with level
    const baseHealth = 50 + (level - 1) * 10;
    const baseSpeed = 1 + Math.random() * 0.5 + (level - 1) * 0.1;
    
    enemies.push({
        x: x,
        y: y,
        width: 45,
        height: 45,
        speed: Math.min(baseSpeed, 3),
        health: baseHealth,
        maxHealth: baseHealth,
        color: '#e74c3c',
        turretAngle: 0,
        bodyAngle: 0,
        lastShot: Date.now(),
        shootCooldown: 2000 - (level - 1) * 100
    });
}

// Update enemies
function updateEnemies() {
    enemies.forEach(enemy => {
        // Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 180) {
            const moveX = (dx / dist) * enemy.speed;
            const moveY = (dy / dist) * enemy.speed;
            enemy.x += moveX;
            enemy.y += moveY;
            
            // Update body angle
            enemy.bodyAngle = Math.atan2(moveY, moveX);
        } else {
            // Circle around player when close
            const angle = Math.atan2(dy, dx) + 0.02;
            enemy.x += Math.cos(angle) * enemy.speed * 0.5;
            enemy.y += Math.sin(angle) * enemy.speed * 0.5;
        }
        
        // Aim at player
        enemy.turretAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        
        // Shoot at player with improved accuracy
        if (Date.now() - enemy.lastShot > enemy.shootCooldown && dist < 450) {
            // Predict player position
            const predictX = player.x + (keys['d'] ? 20 : keys['a'] ? -20 : 0);
            const predictY = player.y + (keys['s'] ? 20 : keys['w'] ? -20 : 0);
            const predictAngle = Math.atan2(predictY - enemy.y, predictX - enemy.x);
            
            enemyBullets.push({
                x: enemy.x + Math.cos(predictAngle) * 25,
                y: enemy.y + Math.sin(predictAngle) * 25,
                vx: Math.cos(predictAngle) * 5,
                vy: Math.sin(predictAngle) * 5,
                size: bulletSize
            });
            enemy.lastShot = Date.now();
        }
    });
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        // Red glow for enemies
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444';
        
        // Draw enemy tank image or fallback
        ctx.rotate(enemy.turretAngle);
        if (enemyTankImg.complete && enemyTankImg.naturalHeight !== 0) {
            ctx.drawImage(enemyTankImg, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        } else {
            // Fallback: draw colored rectangle
            ctx.fillStyle = enemy.color;
            ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
            // Draw turret direction indicator
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, -5, enemy.width / 2, 10);
        }
        
        ctx.restore();
        
        // Draw health bar
        const barWidth = 50;
        const barHeight = 6;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.height / 2 - 12;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        
        // Health bar
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Current health
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(barX, barY, (enemy.health / enemy.maxHealth) * barWidth, barHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        ctx.shadowBlur = 0;
    });
}

// Create explosion particles
function createExplosion(x, y, color, intensity = 1) {
    const particleCount = Math.floor(20 * intensity);
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8 * intensity,
            vy: (Math.random() - 0.5) * 8 * intensity,
            life: 60,
            color: color,
            size: Math.random() * 5 + 2
        });
    }
    
    // Add larger explosion effect
    explosions.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: 50 * intensity,
        life: 30,
        color: color
    });
}

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life--;
        
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Update explosions
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].radius += (explosions[i].maxRadius - explosions[i].radius) * 0.2;
        explosions[i].life--;
        
        if (explosions[i].life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

// Draw explosions
function drawExplosions() {
    explosions.forEach(explosion => {
        ctx.save();
        const alpha = explosion.life / 30;
        ctx.globalAlpha = alpha;
        
        // Outer ring
        ctx.strokeStyle = explosion.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = explosion.color;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

// Draw particles
function drawParticles() {
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life / 60;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Spawn powerup
function spawnPowerup() {
    const types = ['speed', 'damage', 'shield', 'rapid', 'health'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = {
        speed: '#22d3ee',
        damage: '#ef4444',
        shield: '#fbbf24',
        rapid: '#a855f7',
        health: '#22c55e'
    };
    
    powerups.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: Math.random() * (canvas.height - 100) + 50,
        size: 20,
        type: type,
        color: colors[type],
        rotation: 0
    });
}

// Update powerups
function updatePowerups() {
    powerups.forEach(powerup => {
        powerup.rotation += 0.05;
    });
}

// Draw powerups
function drawPowerups() {
    powerups.forEach(powerup => {
        ctx.save();
        ctx.translate(powerup.x, powerup.y);
        ctx.rotate(powerup.rotation);
        
        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = powerup.color;
        
        // Draw powerup box
        ctx.fillStyle = powerup.color;
        ctx.fillRect(-powerup.size / 2, -powerup.size / 2, powerup.size, powerup.size);
        
        // Draw icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { speed: '⚡', damage: '💥', shield: '🛡️', rapid: '🔫', health: '❤️' };
        ctx.fillText(icons[powerup.type], 0, 0);
        
        ctx.restore();
    });
}

// Activate powerup
function activatePowerup() {
    if (player.powerup && player.powerup !== 'health') {
        showNotification(`Power-up ${player.powerup.toUpperCase()} ativado!`);
        applyPowerupEffects(player.powerup);
    }
}

// Apply powerup effects
function applyPowerupEffects(type) {
    // Reset to defaults
    player.speed = 3.5;
    player.fireRate = 300;
    
    // Apply new effects
    switch(type) {
        case 'speed':
            player.speed = 5.5;
            break;
        case 'rapid':
            player.fireRate = 100;
            break;
    }
}

// Show notification
function showNotification(text) {
    const notif = document.createElement('div');
    notif.className = 'powerup-notification';
    notif.textContent = text;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// Collision detection
function checkCollisions() {
    // Player bullets vs enemies
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && enemies[j] &&
                bullets[i].x > enemies[j].x - enemies[j].width / 2 &&
                bullets[i].x < enemies[j].x + enemies[j].width / 2 &&
                bullets[i].y > enemies[j].y - enemies[j].height / 2 &&
                bullets[i].y < enemies[j].y + enemies[j].height / 2) {
                
                const damage = bullets[i].damage || 1;
                enemies[j].health -= 25 * damage;
                createExplosion(bullets[i].x, bullets[i].y, '#fbbf24', 0.5);
                bullets.splice(i, 1);
                
                if (enemies[j].health <= 0) {
                    createExplosion(enemies[j].x, enemies[j].y, '#ef4444', 1.5);
                    enemies.splice(j, 1);
                    score += 100 * level;
                    kills++;
                    updateHUD();
                    checkLevelUp();
                }
                break;
            }
        }
    }
    
    // Enemy bullets vs player
    if (!player.invulnerable) {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            if (enemyBullets[i].x > player.x - player.width / 2 &&
                enemyBullets[i].x < player.x + player.width / 2 &&
                enemyBullets[i].y > player.y - player.height / 2 &&
                enemyBullets[i].y < player.y + player.height / 2) {
                
                const damage = player.powerup === 'shield' ? 5 : 10;
                player.health -= damage;
                enemyBullets.splice(i, 1);
                createExplosion(player.x, player.y, '#fbbf24', 0.7);
                updateHUD();
                
                if (player.health <= 0) {
                    endGame();
                }
            }
        }
    }
    
    // Player vs powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const dx = player.x - powerups[i].x;
        const dy = player.y - powerups[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < player.width / 2 + powerups[i].size / 2) {
            const powerup = powerups[i];
            powerups.splice(i, 1);
            
            if (powerup.type === 'health') {
                player.health = Math.min(player.maxHealth, player.health + 30);
                showNotification('❤️ +30 VIDA');
            } else {
                player.powerup = powerup.type;
                player.powerupDuration = Date.now();
                applyPowerupEffects(powerup.type);
                showNotification(`⚡ Power-up: ${powerup.type.toUpperCase()}`);
            }
            
            createExplosion(powerup.x, powerup.y, powerup.color, 0.8);
        }
    }
}

// Check level up
function checkLevelUp() {
    const nextLevel = Math.floor(kills / 10) + 1;
    if (nextLevel > level) {
        level = nextLevel;
        enemySpawnRate = Math.max(1000, 2500 - (level - 1) * 150);
        showNotification(`🎉 NÍVEL ${level} ALCANÇADO!`);
        player.invulnerable = true;
        player.invulnerableTime = Date.now();
        createExplosion(player.x, player.y, '#22d3ee', 2);
    }
}

// Update HUD
function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('health').textContent = Math.max(0, Math.floor(player.health));
    document.getElementById('enemyCount').textContent = enemies.length;
    document.getElementById('level').textContent = level;
    
    if (player.powerup && player.powerup !== 'health') {
        const timeLeft = Math.ceil((10000 - (Date.now() - player.powerupDuration)) / 1000);
        document.getElementById('ammo').textContent = `${player.powerup.toUpperCase()} (${timeLeft}s)`;
    } else {
        document.getElementById('ammo').textContent = '∞';
    }
}

// End game
function endGame() {
    gameOver = true;
    createExplosion(player.x, player.y, '#ef4444', 3);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('totalKills').textContent = kills;
    document.getElementById('gameOver').classList.add('show');
}

// Draw minimap
function drawMinimap() {
    const scale = 0.225;
    const offsetX = canvas.width * scale / 2 - 90;
    const offsetY = canvas.height * scale / 2 - 67.5;
    
    ctx.save();
    ctx.translate(canvas.width - 200, 20);
    
    // Minimap background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 180, 135);
    
    // Player
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(player.x * scale + 10 - offsetX, player.y * scale + 10 - offsetY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Enemies
    ctx.fillStyle = '#ef4444';
    enemies.forEach(enemy => {
        ctx.beginPath();
        ctx.arc(enemy.x * scale + 10 - offsetX, enemy.y * scale + 10 - offsetY, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Powerups
    ctx.fillStyle = '#fbbf24';
    powerups.forEach(powerup => {
        ctx.beginPath();
        ctx.arc(powerup.x * scale + 10 - offsetX, powerup.y * scale + 10 - offsetY, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.restore();
}

// Main game loop
function gameLoop(timestamp) {
    if (!gameStarted || gameOver) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Spawn enemies
    if (timestamp - lastEnemySpawn > enemySpawnRate) {
        spawnEnemy();
        lastEnemySpawn = timestamp;
    }
    
    // Spawn powerups
    if (timestamp - lastPowerupSpawn > powerupSpawnRate) {
        spawnPowerup();
        lastPowerupSpawn = timestamp;
    }
    
    // Update game objects
    updatePlayer(timestamp);
    updateBullets();
    updateEnemies();
    updateParticles();
    updatePowerups();
    updateExplosions();
    checkCollisions();
    
    // Draw everything
    drawExplosions();
    drawParticles();
    drawPowerups();
    drawBullets();
    drawEnemies();
    drawPlayer();
    drawMinimap();
    
    updateHUD();
    
    requestAnimationFrame(gameLoop);
}

// Initialize game
updateHUD();
