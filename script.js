// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1000;
canvas.height = 700;

const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;
let wave = 1;
let kills = 0;
let combo = 0;
let comboTimer = 0;
let mouseX = 0;
let mouseY = 0;

// Load tank images
const playerTankImg = new Image();
playerTankImg.src = 'rodrigojony/25630-removebg-preview.png';

const enemyTankImg = new Image();
enemyTankImg.src = 'rodrigojony/36042-removebg-preview.png';

// Player tank
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 50,
    height: 50,
    speed: 4,
    angle: 0,
    turretAngle: 0,
    health: 100,
    maxHealth: 100,
    damage: 25,
    fireRate: 300,
    lastShot: 0,
    speedBoost: 1,
    speedBoostTimer: 0
};

// Keys pressed
const keys = {};

// Arrays for game objects
const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];
const powerUps = [];
const explosions = [];

// Game settings
const bulletSpeed = 8;
const bulletSize = 6;
let enemiesPerWave = 3;
let enemiesSpawned = 0;
let enemiesKilledThisWave = 0;

// Event listeners
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (!gameOver) shootBullet();
});

// Player movement
function updatePlayer() {
    // Movement controls (WASD and Arrow keys)
    if (keys['w'] || keys['W'] || keys['ArrowUp']) {
        player.y -= player.speed;
    }
    if (keys['s'] || keys['S'] || keys['ArrowDown']) {
        player.y += player.speed;
    }
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
        player.x -= player.speed;
    }
    if (keys['d'] || keys['D'] || keys['ArrowRight']) {
        player.x += player.speed;
    }

    // Keep player in bounds
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));

    // Update turret angle to follow mouse
    player.turretAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
}

// Draw player tank
function drawPlayer() {
    ctx.save();
    
    // Draw tank body
    ctx.translate(player.x, player.y);
    ctx.fillStyle = player.color;
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    ctx.strokeRect(-player.width / 2, -player.height / 2, player.width, player.height);
    
    // Draw turret
    ctx.rotate(player.turretAngle);
    ctx.fillStyle = '#1e8449';
    ctx.fillRect(0, -5, 25, 10);
    ctx.strokeRect(0, -5, 25, 10);
    
    ctx.restore();
    
    // Draw health bar
    const barWidth = 50;
    const barHeight = 5;
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(player.x - barWidth / 2, player.y - 35, barWidth, barHeight);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(player.x - barWidth / 2, player.y - 35, (player.health / player.maxHealth) * barWidth, barHeight);
}

// Shoot bullet
function shootBullet() {
    bullets.push({
        x: player.x + Math.cos(player.turretAngle) * 25,
        y: player.y + Math.sin(player.turretAngle) * 25,
        vx: Math.cos(player.turretAngle) * bulletSpeed,
        vy: Math.sin(player.turretAngle) * bulletSpeed,
        size: bulletSize
    });
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
    // Player bullets
    ctx.fillStyle = '#f39c12';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Enemy bullets
    ctx.fillStyle = '#e74c3c';
    enemyBullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Spawn enemy
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -40; break;
        case 1: x = canvas.width + 40; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 40; break;
        case 3: x = -40; y = Math.random() * canvas.height; break;
    }
    
    enemies.push({
        x: x,
        y: y,
        width: 35,
        height: 35,
        speed: 1 + Math.random() * 0.5,
        health: 50,
        maxHealth: 50,
        color: '#e74c3c',
        turretAngle: 0,
        lastShot: Date.now()
    });
}

// Update enemies
function updateEnemies() {
    enemies.forEach(enemy => {
        // Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 200) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
        
        // Aim at player
        enemy.turretAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        
        // Shoot at player
        if (Date.now() - enemy.lastShot > 1500 && dist < 400) {
            enemyBullets.push({
                x: enemy.x + Math.cos(enemy.turretAngle) * 20,
                y: enemy.y + Math.sin(enemy.turretAngle) * 20,
                vx: Math.cos(enemy.turretAngle) * 4,
                vy: Math.sin(enemy.turretAngle) * 4,
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
        
        // Draw tank body
        ctx.translate(enemy.x, enemy.y);
        ctx.fillStyle = enemy.color;
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        
        ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.strokeRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        
        // Draw turret
        ctx.rotate(enemy.turretAngle);
        ctx.fillStyle = '#a93226';
        ctx.fillRect(0, -4, 20, 8);
        ctx.strokeRect(0, -4, 20, 8);
        
        ctx.restore();
        
        // Draw health bar
        const barWidth = 40;
        const barHeight = 4;
        ctx.fillStyle = '#34495e';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 25, barWidth, barHeight);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 25, (enemy.health / enemy.maxHealth) * barWidth, barHeight);
    });
}

// Create explosion particles
function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 60,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
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

// Draw particles
function drawParticles() {
    particles.forEach(particle => {
        ctx.globalAlpha = particle.life / 60;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
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
                
                enemies[j].health -= 25;
                bullets.splice(i, 1);
                
                if (enemies[j].health <= 0) {
                    createExplosion(enemies[j].x, enemies[j].y, '#e74c3c');
                    enemies.splice(j, 1);
                    score += 100;
                    updateHUD();
                }
                break;
            }
        }
    }
    
    // Enemy bullets vs player
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (enemyBullets[i].x > player.x - player.width / 2 &&
            enemyBullets[i].x < player.x + player.width / 2 &&
            enemyBullets[i].y > player.y - player.height / 2 &&
            enemyBullets[i].y < player.y + player.height / 2) {
            
            player.health -= 10;
            enemyBullets.splice(i, 1);
            createExplosion(player.x, player.y, '#f39c12');
            updateHUD();
            
            if (player.health <= 0) {
                endGame();
            }
        }
    }
}

// Update HUD
function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('health').textContent = Math.max(0, player.health);
    document.getElementById('enemyCount').textContent = enemies.length;
}

// End game
function endGame() {
    gameOver = true;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.add('show');
}

// Main game loop
function gameLoop(timestamp) {
    if (gameOver) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Spawn enemies
    if (timestamp - lastEnemySpawn > enemySpawnRate) {
        spawnEnemy();
        lastEnemySpawn = timestamp;
    }
    
    // Update game objects
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateParticles();
    checkCollisions();
    
    // Draw everything
    drawParticles();
    drawBullets();
    drawEnemies();
    drawPlayer();
    
    requestAnimationFrame(gameLoop);
}

// Start the game
updateHUD();
requestAnimationFrame(gameLoop);