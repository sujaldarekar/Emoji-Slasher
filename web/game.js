/**
 * Emoji Slasher - Premium Edition (Web Version)
 * Hand Tracking powered by MediaPipe
 */

const videoElement = document.getElementById('input-video');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const comboContainer = document.getElementById('combo-container');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const loadingScreen = document.getElementById('loading-screen');
const finalScoreEl = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');
const gameOverReasonEl = document.getElementById('game-over-reason');
const startProgressEl = document.getElementById('start-progress');
const restartProgressEl = document.getElementById('restart-progress');

// Status Indicators
const shieldInd = document.getElementById('shield-indicator');
const feverInd = document.getElementById('fever-indicator');
const freezeInd = document.getElementById('freeze-indicator');

// Game Constants
let emojiSize = 80; // Base size, will be updated dynamically
const PARTICLE_COUNT = 15;
const CHARGE_THRESHOLD = 45; // ~1.5 seconds

// Game State
let gameState = 'START';
let score = 0;
let combo = 0;
let highScore = localStorage.getItem('emoji_high_score') || 0;
let emojis = [];
let particles = [];
let activePoints = []; // Array of {x, y} for all detected finger tips
let startCharge = 0;
let restartCharge = 0;
let shieldActive = false;
let feverTimer = 0;
let freezeTimer = 0;

// Assets
const assets = {
    images: {},
    sounds: {}
};

const imageNames = ['happy', 'love', 'shock', 'freeze', 'fever', 'shield'];
const soundNames = ['background', 'bubble', 'fahhhhh'];

// Load Assets
function loadAssets() {
    let loadedCount = 0;
    const total = imageNames.length + soundNames.length;

    imageNames.forEach(name => {
        const img = new Image();
        img.src = `assets/${name}.png`;
        img.onload = () => {
            assets.images[name] = img;
            checkAllLoaded();
        };
        img.onerror = () => {
            console.warn(`Failed to load image: ${name}`);
            assets.images[name] = null; // Placeholder logic could go here
            checkAllLoaded();
        };
    });

    soundNames.forEach(name => {
        const audio = new Audio(`assets/${name}.mp3`);
        if (name === 'background') audio.loop = true;
        assets.sounds[name] = audio;
        // Audio might not "load" until interaction, but we'll count it
        checkAllLoaded();
    });

    function checkAllLoaded() {
        loadedCount++;
        if (loadedCount >= total) {
            loadingScreen.classList.add('hidden');
        }
    }
}

// MediaPipe Setup
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2, // Support both hands
    modelComplexity: 0,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

function onResults(results) {
    activePoints = [];
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            // Finger Tips indexes: 4 (thumb), 8 (index), 12 (middle), 16 (ring), 20 (pinky)
            const tipIndexes = [4, 8, 12, 16, 20];
            for (const index of tipIndexes) {
                const tip = landmarks[index];
                activePoints.push({
                    x: (1 - tip.x) * canvasElement.width, // Flipped
                    y: tip.y * canvasElement.height
                });
            }
        }
    }
}

// Classes
class Emoji {
    constructor(type) {
        this.type = type;
        this.x = Math.random() * (canvasElement.width - emojiSize);
        this.y = -emojiSize;
        // Further increased speed: Base (6.5-8.5) + faster scaling (score/1500)
        this.speed = (Math.random() * 2 + 6.5) + (score / 1500);
        this.size = emojiSize;
        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.1;

        const config = {
            happy: { points: 5, color: '#00ff00' },
            love: { points: 20, color: '#ff0000' },
            shock: { points: 0, color: '#ffffff' },
            freeze: { points: 0, color: '#00ffff' },
            fever: { points: 0, color: '#ffff00' },
            shield: { points: 0, color: '#ff00ff' }
        };

        this.points = config[type].points;
        this.color = config[type].color;
        this.image = assets.images[type];
    }

    update(speedMult) {
        this.y += this.speed * speedMult;
        this.rotation += this.rotSpeed * speedMult;
    }

    draw() {
        if (!this.image) return;
        canvasCtx.save();
        canvasCtx.translate(this.x + this.size / 2, this.y + this.size / 2);
        canvasCtx.rotate(this.rotation);
        canvasCtx.drawImage(this.image, -this.size / 2, -this.size / 2, this.size, this.size);
        canvasCtx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15;
        this.life = 1.0;
        this.color = color;
    }

    update(speedMult) {
        this.x += this.vx * speedMult;
        this.y += this.vy * speedMult;
        this.vy += 0.5 * speedMult; // gravity
        this.life -= 0.03 * speedMult;
        return this.life > 0;
    }

    draw() {
        canvasCtx.globalAlpha = this.life;
        canvasCtx.fillStyle = this.color;
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, 4 * this.life, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.globalAlpha = 1.0;
    }
}

// Game Logic
function spawnEmoji() {
    const r = Math.random();
    let type = 'happy';
    if (r < 0.1) type = 'shock';
    else if (r < 0.2) type = 'love';
    else if (r < 0.25) type = 'freeze';
    else if (r < 0.3) type = 'fever';
    else if (r < 0.35) type = 'shield';
    
    emojis.push(new Emoji(type));
}

function resetGame() {
    score = 0;
    combo = 0;
    emojis = [];
    particles = [];
    shieldActive = false;
    feverTimer = 0;
    freezeTimer = 0;
    updateUI();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    if (assets.sounds.background) assets.sounds.background.play();
}

function endGame(reason) {
    gameState = 'GAMEOVER';
    gameOverReasonEl.textContent = reason;
    finalScoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('emoji_high_score', highScore);
    }
    highScoreEl.textContent = highScore;
    gameOverScreen.classList.remove('hidden');
    if (assets.sounds.fahhhhh) assets.sounds.fahhhhh.play();
    if (assets.sounds.background) assets.sounds.background.pause();
}

function updateUI() {
    scoreEl.textContent = score;
    comboEl.textContent = `x${combo}`;
    if (combo > 5) comboContainer.classList.remove('hidden');
    else comboContainer.classList.add('hidden');

    shieldActive ? shieldInd.classList.remove('hidden') : shieldInd.classList.add('hidden');
    feverTimer > 0 ? feverInd.classList.remove('hidden') : feverInd.classList.add('hidden');
    freezeTimer > 0 ? freezeInd.classList.remove('hidden') : freezeInd.classList.add('hidden');
}

// Main Loop
function gameLoop() {
    // Resize canvas
    if (canvasElement.width !== window.innerWidth || canvasElement.height !== window.innerHeight) {
        canvasElement.width = window.innerWidth;
        canvasElement.height = window.innerHeight;
        // Dynamic emoji size: 18% of screen width, clamped between 50 and 120
        emojiSize = Math.max(50, Math.min(120, canvasElement.width * 0.18));
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw Video (Mirrored & Tinted)
    canvasCtx.save();
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);
    canvasCtx.globalAlpha = 0.3;
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    const speedMult = freezeTimer > 0 ? 0.4 : 1.0;

    if (gameState === 'START') {
        checkButtonCharge('start-button', () => resetGame(), (p) => startProgressEl.style.width = `${p}%`);
    } else if (gameState === 'PLAYING') {
        if (feverTimer > 0) feverTimer--;
        if (freezeTimer > 0) freezeTimer--;

        // Background Tinting
        if (feverTimer > 0) {
            canvasCtx.fillStyle = 'rgba(255, 215, 0, 0.1)';
            canvasCtx.fillRect(0,0, canvasElement.width, canvasElement.height);
        }

        if (Math.random() < 0.03 + (score / 10000)) spawnEmoji();

        // Update & Draw Emojis
        for (let i = emojis.length - 1; i >= 0; i--) {
            const e = emojis[i];
            e.update(speedMult);
            e.draw();

            // Collision Detection for ALL active finger tips
            let slashed = false;
            for (const point of activePoints) {
                const dx = e.x + e.size / 2 - point.x;
                const dy = e.y + e.size / 2 - point.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < e.size / 1.5) {
                    if (e.type === 'shock') {
                        if (shieldActive) {
                            shieldActive = false;
                            emojis.splice(i, 1);
                            slashed = true;
                            break;
                        }
                        endGame('Slashed a Shock Emoji! 😱');
                    } else {
                        // Slashed!
                        handleSlash(e);
                        emojis.splice(i, 1);
                        slashed = true;
                        break;
                    }
                }
            }
            if (slashed) continue;

            // Missed
            if (e.y > canvasElement.height) {
                if (e.type !== 'shock' && e.points > 0) {
                    if (shieldActive) {
                        shieldActive = false;
                        emojis.splice(i, 1);
                    } else {
                        endGame(`Missed a ${e.type.toUpperCase()}!`);
                    }
                } else {
                    emojis.splice(i, 1);
                }
            }
        }
        updateUI();
    } else if (gameState === 'GAMEOVER') {
        checkButtonCharge('restart-button', () => resetGame(), (p) => restartProgressEl.style.width = `${p}%`);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].update(speedMult)) {
            particles[i].draw();
        } else {
            particles.splice(i, 1);
        }
    }

    // Hand Cursors (Draw all active points)
    canvasCtx.save();
    canvasCtx.fillStyle = 'rgba(0, 255, 204, 0.4)';
    canvasCtx.shadowBlur = 10;
    canvasCtx.shadowColor = '#00ffcc';
    for (const point of activePoints) {
        canvasCtx.beginPath();
        canvasCtx.arc(point.x, point.y, 10, 0, Math.PI * 2);
        canvasCtx.fill();
    }
    canvasCtx.restore();

    requestAnimationFrame(gameLoop);
}

function handleSlash(emoji) {
    if (emoji.type === 'freeze') freezeTimer = 200;
    else if (emoji.type === 'fever') feverTimer = 250;
    else if (emoji.type === 'shield') shieldActive = true;

    const pointsMult = (feverTimer > 0 ? 2 : 1) * (1 + Math.floor(combo / 10));
    score += emoji.points * pointsMult;
    combo++;

    if (assets.sounds.bubble) {
        const s = assets.sounds.bubble.cloneNode();
        s.volume = 0.5;
        s.play();
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(emoji.x + emoji.size/2, emoji.y + emoji.size/2, emoji.color));
    }
}

function checkButtonCharge(btnId, callback, progressCb) {
    const btn = document.getElementById(btnId);
    const rect = btn.getBoundingClientRect();
    const padding = 20;

    let pointInButton = false;
    for (const point of activePoints) {
        if (point.x > rect.left - padding && point.x < rect.right + padding &&
            point.y > rect.top - padding && point.y < rect.bottom + padding) {
            pointInButton = true;
            break;
        }
    }

    if (pointInButton) {
        if (btnId === 'start-button') {
            startCharge++;
            progressCb((startCharge / CHARGE_THRESHOLD) * 100);
            if (startCharge >= CHARGE_THRESHOLD) {
                startCharge = 0;
                callback();
            }
        } else {
            restartCharge++;
            progressCb((restartCharge / CHARGE_THRESHOLD) * 100);
            if (restartCharge >= CHARGE_THRESHOLD) {
                restartCharge = 0;
                callback();
            }
        }
    } else {
        if (btnId === 'start-button') {
            startCharge = Math.max(0, startCharge - 1);
            progressCb((startCharge / CHARGE_THRESHOLD) * 100);
        } else {
            restartCharge = Math.max(0, restartCharge - 1);
            progressCb((restartCharge / CHARGE_THRESHOLD) * 100);
        }
    }
}

// Click Fallback for Buttons (Mobile compatibility)
document.getElementById('start-button').addEventListener('click', () => {
    if (gameState === 'START') resetGame();
});
document.getElementById('restart-button').addEventListener('click', () => {
    if (gameState === 'GAMEOVER') resetGame();
});

// Init
loadAssets();
camera.start();
gameLoop();
