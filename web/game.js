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
const spellChargeEl = document.getElementById('spell-charge');
const comboContainer = document.getElementById('combo-container');
const spellContainer = document.getElementById('spell-container');
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
const CHARGE_THRESHOLD = 1.1; // seconds
const SPELL_MAX = 100;
const SPELL_COOLDOWN_SEC = 5;
const GESTURE_WINDOW_MS = 900;
const TRAIL_LIMIT = 26;

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
let shieldTimer = 0;
let feverTimer = 0;
let freezeTimer = 0;
let spawnAccumulator = 0;
let lastFrameTime = performance.now();
let spellEnergy = 0;
let spellCooldown = 0;
let gestureTrail = [];
let lastCastAt = 0;
let spellFlashTimer = 0;
let spellFlashColor = 'rgba(125, 249, 255, 0.16)';

// Assets
const assets = {
    images: {},
    sounds: {}
};

const imageNames = ['happy', 'love', 'angry', 'freeze', 'fever', 'shield'];
const soundNames = ['background', 'bubble', 'fahhhhh'];

// Load Assets
function loadAssets() {
    let loadedCount = 0;
    const total = imageNames.length + soundNames.length;

    const imageFiles = {
        happy: 'happy.png',
        love: 'love.png',
        angry: 'shock.png',
        freeze: 'freeze.png',
        fever: 'fever.png',
        shield: 'shield.png'
    };

    imageNames.forEach(name => {
        const img = new Image();
        img.src = `assets/${imageFiles[name]}`;
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
    const now = performance.now();

    if (results.multiHandLandmarks) {
        for (let handIndex = 0; handIndex < results.multiHandLandmarks.length; handIndex++) {
            const landmarks = results.multiHandLandmarks[handIndex];
            // Finger Tips indexes: 4 (thumb), 8 (index), 12 (middle), 16 (ring), 20 (pinky)
            const tipIndexes = [4, 8, 12, 16, 20];
            for (const index of tipIndexes) {
                const tip = landmarks[index];
                activePoints.push({
                    x: (1 - tip.x) * canvasElement.width, // Flipped
                    y: tip.y * canvasElement.height
                });
            }

            if (handIndex === 0) {
                const indexTip = landmarks[8];
                const point = {
                    x: (1 - indexTip.x) * canvasElement.width,
                    y: indexTip.y * canvasElement.height,
                    t: now
                };
                const last = gestureTrail[gestureTrail.length - 1];
                if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 8) {
                    gestureTrail.push(point);
                    if (gestureTrail.length > TRAIL_LIMIT) {
                        gestureTrail.shift();
                    }
                }
            }
        }
    } else if (gestureTrail.length > 0) {
        gestureTrail = gestureTrail.slice(-4);
    }

    gestureTrail = gestureTrail.filter((p) => now - p.t <= GESTURE_WINDOW_MS);
    if (gestureTrail.length > TRAIL_LIMIT) {
        gestureTrail = gestureTrail.slice(-TRAIL_LIMIT);
    }
}

// Classes
class Emoji {
    constructor(type) {
        this.type = type;
        this.x = Math.random() * (canvasElement.width - emojiSize);
        this.y = -emojiSize;
        const viewportHeight = Math.max(canvasElement.height || window.innerHeight, 480);
        const baseSpeed = viewportHeight * (0.24 + Math.random() * 0.1);
        this.speed = baseSpeed + Math.min(220, score * 0.18);
        this.size = emojiSize;
        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.1;

        const config = {
            happy: { points: 5, color: '#00ff00' },
            love: { points: 20, color: '#ff0000' },
            angry: { points: 0, color: '#ff8844' },
            freeze: { points: 0, color: '#00ffff' },
            fever: { points: 0, color: '#ffff00' },
            shield: { points: 0, color: '#ff00ff' }
        };

        this.points = config[type].points;
        this.color = config[type].color;
        this.image = assets.images[type];
    }

    update(speedMult, deltaSeconds) {
        const movementScale = speedMult * deltaSeconds;
        this.y += this.speed * movementScale;
        this.rotation += this.rotSpeed * (movementScale * 60);
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

    update(speedMult, deltaSeconds) {
        const movementScale = speedMult * (deltaSeconds * 60);
        this.x += this.vx * movementScale;
        this.y += this.vy * movementScale;
        this.vy += 0.5 * movementScale; // gravity
        this.life -= 0.03 * movementScale;
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
    if (r < 0.1) type = 'angry';
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
    shieldTimer = 0;
    feverTimer = 0;
    freezeTimer = 0;
    spellEnergy = 0;
    spellCooldown = 0;
    gestureTrail = [];
    spellFlashTimer = 0;
    spawnAccumulator = 0;
    startCharge = 0;
    restartCharge = 0;
    startProgressEl.style.width = '0%';
    restartProgressEl.style.width = '0%';
    updateUI();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    safePlay(assets.sounds.background);
}

function endGame(reason) {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    gameOverReasonEl.textContent = reason;
    finalScoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('emoji_high_score', highScore);
    }
    highScoreEl.textContent = highScore;
    gameOverScreen.classList.remove('hidden');
    safePlay(assets.sounds.fahhhhh);
    if (assets.sounds.background) {
        assets.sounds.background.pause();
        assets.sounds.background.currentTime = 0;
    }
}

function safePlay(sound) {
    if (!sound) return;
    const playPromise = sound.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
            // Ignore autoplay and interrupt errors on mobile browsers.
        });
    }
}

function updateUI() {
    scoreEl.textContent = score;
    comboEl.textContent = `x${combo}`;
    if (combo > 5) comboContainer.classList.remove('hidden');
    else comboContainer.classList.add('hidden');

    shieldActive ? shieldInd.classList.remove('hidden') : shieldInd.classList.add('hidden');
    feverTimer > 0 ? feverInd.classList.remove('hidden') : feverInd.classList.add('hidden');
    freezeTimer > 0 ? freezeInd.classList.remove('hidden') : freezeInd.classList.add('hidden');

    const spellPercent = Math.floor((spellEnergy / SPELL_MAX) * 100);
    if (spellChargeEl) spellChargeEl.textContent = `${spellPercent}%`;
    if (spellContainer) {
        spellContainer.classList.toggle('spell-ready', spellEnergy >= SPELL_MAX && spellCooldown <= 0);
        spellContainer.classList.toggle('spell-cooldown', spellCooldown > 0);
    }
}

// Main Loop
function gameLoop(now = performance.now()) {
    const deltaSeconds = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

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
        checkButtonCharge('start-button', () => resetGame(), (p) => startProgressEl.style.width = `${p}%`, deltaSeconds);
    } else if (gameState === 'PLAYING') {
        if (shieldTimer > 0) {
            shieldTimer = Math.max(0, shieldTimer - deltaSeconds);
            shieldActive = shieldTimer > 0;
        }
        if (feverTimer > 0) feverTimer = Math.max(0, feverTimer - deltaSeconds);
        if (freezeTimer > 0) freezeTimer = Math.max(0, freezeTimer - deltaSeconds);
        if (spellCooldown > 0) spellCooldown = Math.max(0, spellCooldown - deltaSeconds);

        const passiveEnergyGain = 5.5 + Math.min(combo, 40) * 0.1;
        spellEnergy = Math.min(SPELL_MAX, spellEnergy + passiveEnergyGain * deltaSeconds);

        if (spellEnergy >= SPELL_MAX && spellCooldown <= 0 && performance.now() - lastCastAt > 450) {
            const spell = detectGesture();
            if (spell) {
                castSpell(spell);
                spellEnergy = 0;
                spellCooldown = SPELL_COOLDOWN_SEC;
                lastCastAt = performance.now();
                gestureTrail = [];
            }
        }

        // Background Tinting
        if (feverTimer > 0) {
            canvasCtx.fillStyle = 'rgba(255, 215, 0, 0.1)';
            canvasCtx.fillRect(0,0, canvasElement.width, canvasElement.height);
        }

        const spawnRatePerSec = Math.min(6, 1.7 + (score / 2500));
        spawnAccumulator += spawnRatePerSec * deltaSeconds;
        while (spawnAccumulator >= 1) {
            spawnEmoji();
            spawnAccumulator -= 1;
        }

        // Update & Draw Emojis
        for (let i = emojis.length - 1; i >= 0; i--) {
            const e = emojis[i];
            e.update(speedMult, deltaSeconds);
            e.draw();

            // Collision Detection for ALL active finger tips
            let slashed = false;
            for (const point of activePoints) {
                const dx = e.x + e.size / 2 - point.x;
                const dy = e.y + e.size / 2 - point.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < e.size / 1.5) {
                    if (e.type === 'angry') {
                        if (shieldActive) {
                            shieldActive = false;
                            shieldTimer = 0;
                            emojis.splice(i, 1);
                            slashed = true;
                            break;
                        }
                        endGame('Slashed an Angry Emoji! 😡');
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
                if (e.type !== 'angry' && e.points > 0) {
                    if (shieldActive) {
                        shieldActive = false;
                        shieldTimer = 0;
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
        checkButtonCharge('restart-button', () => resetGame(), (p) => restartProgressEl.style.width = `${p}%`, deltaSeconds);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].update(speedMult, deltaSeconds)) {
            particles[i].draw();
        } else {
            particles.splice(i, 1);
        }
    }

    drawGestureTrail();

    if (spellFlashTimer > 0) {
        spellFlashTimer = Math.max(0, spellFlashTimer - deltaSeconds);
        canvasCtx.fillStyle = spellFlashColor;
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
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
    if (emoji.type === 'freeze') freezeTimer = 3.2;
    else if (emoji.type === 'fever') feverTimer = 4.2;
    else if (emoji.type === 'shield') {
        shieldTimer = Math.max(shieldTimer, 5);
        shieldActive = true;
    }

    const pointsMult = (feverTimer > 0 ? 2 : 1) * (1 + Math.floor(combo / 10));
    score += emoji.points * pointsMult;
    combo++;
    spellEnergy = Math.min(SPELL_MAX, spellEnergy + 4 + emoji.points * 0.35);

    const s = assets.sounds.bubble ? assets.sounds.bubble.cloneNode() : null;
    if (s) {
        s.volume = 0.5;
        safePlay(s);
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(emoji.x + emoji.size/2, emoji.y + emoji.size/2, emoji.color));
    }
}

function detectGesture() {
    if (gestureTrail.length < 12) return null;

    const points = gestureTrail;
    const start = points[0];
    const end = points[points.length - 1];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let pathLen = 0;

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
        if (i > 0) {
            pathLen += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
        }
    }

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const diag = Math.hypot(width, height);
    if (diag < 55) return null;

    const startEndDist = Math.hypot(end.x - start.x, end.y - start.y);
    const aspect = width / height;

    const looksLikeCircle = startEndDist < diag * 0.32 && pathLen > diag * 2.05 && aspect > 0.55 && aspect < 1.8;
    if (looksLikeCircle) return 'O';

    let risingDiag = 0;
    let fallingDiag = 0;
    let diagSwitches = 0;
    let lastDiag = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        if (Math.abs(dx) + Math.abs(dy) < 5) continue;
        const diagType = dx * dy >= 0 ? 1 : -1;
        if (diagType === 1) risingDiag++;
        else fallingDiag++;
        if (lastDiag !== 0 && diagType !== lastDiag) diagSwitches++;
        lastDiag = diagType;
    }

    const looksLikeX = risingDiag >= 3 && fallingDiag >= 3 && diagSwitches >= 2;
    if (looksLikeX) return 'X';

    const zTopY = minY + height * 0.35;
    const zBottomY = minY + height * 0.65;
    const zRightX = minX + width * 0.6;
    const zLeftX = minX + width * 0.42;
    let hasTopRight = false;
    let hasMiddleLeft = false;
    let hasBottomRight = false;
    for (const p of points) {
        if (p.y <= zTopY && p.x >= zRightX) hasTopRight = true;
        if (p.y > zTopY && p.y < zBottomY && p.x <= zLeftX) hasMiddleLeft = true;
        if (p.y >= zBottomY && p.x >= zRightX) hasBottomRight = true;
    }

    const looksLikeZ = hasTopRight && hasMiddleLeft && hasBottomRight && end.x > start.x;
    if (looksLikeZ) return 'Z';

    return null;
}

function castSpell(spell) {
    if (spell === 'O') {
        shieldTimer = Math.max(shieldTimer, 2.5);
        shieldActive = true;
        spellFlashColor = 'rgba(255, 0, 255, 0.14)';
    } else if (spell === 'Z') {
        freezeTimer = Math.max(freezeTimer, 3.0);
        spellFlashColor = 'rgba(0, 200, 255, 0.14)';
    } else if (spell === 'X') {
        let removed = 0;
        for (let i = emojis.length - 1; i >= 0; i--) {
            if (emojis[i].type === 'angry') {
                const e = emojis[i];
                for (let j = 0; j < 10; j++) {
                    particles.push(new Particle(e.x + e.size / 2, e.y + e.size / 2, '#ff8844'));
                }
                emojis.splice(i, 1);
                removed++;
            }
        }
        if (removed > 0) {
            score += removed * 8;
        }
        spellFlashColor = 'rgba(255, 130, 40, 0.14)';
    }

    spellFlashTimer = 0.22;
    const s = assets.sounds.bubble ? assets.sounds.bubble.cloneNode() : null;
    if (s) {
        s.volume = 0.8;
        safePlay(s);
    }
}

function drawGestureTrail() {
    if (gameState !== 'PLAYING' || gestureTrail.length < 2 || spellEnergy < SPELL_MAX || spellCooldown > 0) {
        return;
    }

    canvasCtx.save();
    canvasCtx.strokeStyle = 'rgba(125, 249, 255, 0.75)';
    canvasCtx.lineWidth = 4;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';
    canvasCtx.beginPath();
    canvasCtx.moveTo(gestureTrail[0].x, gestureTrail[0].y);
    for (let i = 1; i < gestureTrail.length; i++) {
        canvasCtx.lineTo(gestureTrail[i].x, gestureTrail[i].y);
    }
    canvasCtx.stroke();
    canvasCtx.restore();
}

function checkButtonCharge(btnId, callback, progressCb, deltaSeconds) {
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
            startCharge += deltaSeconds;
            progressCb(Math.min(100, (startCharge / CHARGE_THRESHOLD) * 100));
            if (startCharge >= CHARGE_THRESHOLD) {
                startCharge = 0;
                callback();
            }
        } else {
            restartCharge += deltaSeconds;
            progressCb(Math.min(100, (restartCharge / CHARGE_THRESHOLD) * 100));
            if (restartCharge >= CHARGE_THRESHOLD) {
                restartCharge = 0;
                callback();
            }
        }
    } else {
        if (btnId === 'start-button') {
            startCharge = Math.max(0, startCharge - deltaSeconds * 1.25);
            progressCb(Math.min(100, (startCharge / CHARGE_THRESHOLD) * 100));
        } else {
            restartCharge = Math.max(0, restartCharge - deltaSeconds * 1.25);
            progressCb(Math.min(100, (restartCharge / CHARGE_THRESHOLD) * 100));
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
camera.start().catch((err) => {
    console.error('Camera failed to start:', err);
    const loadingText = loadingScreen.querySelector('p');
    if (loadingText) {
        loadingText.textContent = 'Camera access failed. Please allow camera permission and refresh.';
    }
});
gameLoop();
