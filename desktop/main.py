import cv2
import random
import time
import pygame
import numpy as np
import os

# Initialize Pygame for Audio
pygame.mixer.init()
try:
    # Load background music
    if os.path.exists("background.mp3"):
        pygame.mixer.music.load("background.mp3")
        pygame.mixer.music.set_volume(0.3)
        pygame.mixer.music.play(-1) # Loop forever
    
    # Load sound effects
    bubble_sound = None
    if os.path.exists("bubble.mp3"):
        bubble_sound = pygame.mixer.Sound("bubble.mp3")
    
    game_over_sound = None
    if os.path.exists("fahhhhh.mp3"):
        game_over_sound = pygame.mixer.Sound("fahhhhh.mp3")
        
except Exception as e:
    print(f"Warning: Audio initialization failed: {e}")

# Constants
WIDTH, HEIGHT = 640, 480
EMOJI_SIZE = 60
FALL_SPEED_MIN = 3
FALL_SPEED_MAX = 7
HIGH_SCORE_FILE = "highscore.txt"

# Load Assets
def load_image(name):
    img = cv2.imread(name, cv2.IMREAD_UNCHANGED)
    if img is None:
        img = np.zeros((EMOJI_SIZE, EMOJI_SIZE, 4), dtype=np.uint8)
        img[:, :, 0:3] = [random.randint(0,255), random.randint(0,255), random.randint(0,255)]
        img[:, :, 3] = 255
    else:
        img = cv2.resize(img, (EMOJI_SIZE, EMOJI_SIZE))
    return img

# Load Assets
def load_image(name):
    img = cv2.imread(name, cv2.IMREAD_UNCHANGED)
    if img is None:
        img = np.zeros((EMOJI_SIZE, EMOJI_SIZE, 4), dtype=np.uint8)
        img[:, :, 0:3] = [random.randint(0,255), random.randint(0,255), random.randint(0,255)]
        img[:, :, 3] = 255
    else:
        # If it's 3-channel, add an alpha channel
        if img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        img = cv2.resize(img, (EMOJI_SIZE, EMOJI_SIZE))
    return img

happy_img = load_image("happy.png")
love_img = load_image("love.png")
shock_img = load_image("shock.png")
freeze_img = load_image("freeze.png")
fever_img = load_image("fever.png")
shield_img = load_image("shield.png")

def get_high_score():
    if os.path.exists(HIGH_SCORE_FILE):
        try:
            with open(HIGH_SCORE_FILE, "r") as f:
                return int(f.read())
        except: return 0
    return 0

def save_high_score(score):
    if score > get_high_score():
        with open(HIGH_SCORE_FILE, "w") as f:
            f.write(str(score))

class Particle:
    def __init__(self, x, y, color):
        self.x = x
        self.y = y
        self.vx = random.uniform(-8, 8)
        self.vy = random.uniform(-8, 8)
        self.life = 1.0
        self.color = color

    def update(self, speed_mult=1.0):
        self.x += self.vx * speed_mult
        self.y += self.vy * speed_mult
        self.vy += 0.2 * speed_mult # Gravity
        self.life -= 0.04 * speed_mult
        return self.life > 0

    def draw(self, frame):
        size = int(self.life * 5)
        cv2.circle(frame, (int(self.x), int(self.y)), size, self.color, -1)

class Emoji:
    def __init__(self, type, current_score=0):
        self.type = type
        self.x = random.randint(0, WIDTH - EMOJI_SIZE)
        self.y = -EMOJI_SIZE
        difficulty_boost = current_score // 150
        self.speed = random.uniform(FALL_SPEED_MIN, FALL_SPEED_MAX) + difficulty_boost
        
        if type == "happy":
            self.image = happy_img
            self.points = 5
            self.color = (0, 255, 0)
        elif type == "love":
            self.image = love_img
            self.points = 20
            self.color = (0, 0, 255)
        elif type == "freeze":
            self.image = freeze_img
            self.points = 0
            self.color = (255, 255, 0)
        elif type == "fever":
            self.image = fever_img
            self.points = 0
            self.color = (0, 215, 255) # Goldish
        elif type == "shield":
            self.image = shield_img
            self.points = 0
            self.color = (255, 0, 255)
        else: # shock
            self.image = shock_img
            self.points = -1
            self.color = (255, 255, 255)

    def fall(self, speed_mult=1.0):
        self.y += self.speed * speed_mult

def draw_glow_text(frame, text, pos, font, scale, color, thickness, glow_size=3):
    # Draw glow
    for i in range(glow_size, 0, -1):
        cv2.putText(frame, text, pos, font, scale, (color[0]//4, color[1]//4, color[2]//4), thickness + i*2, cv2.LINE_AA)
    # Draw main text
    cv2.putText(frame, text, pos, font, scale, color, thickness, cv2.LINE_AA)

def main():
    cap = cv2.VideoCapture(0)
    backSub = cv2.createBackgroundSubtractorMOG2(history=300, varThreshold=40, detectShadows=True)
    
    score = 0
    high_score = get_high_score()
    combo = 0
    emojis = []
    particles = []
    
    # Game States: "START", "PLAYING", "GAMEOVER"
    game_state = "START"
    game_over_reason = ""
    start_charge = 0
    restart_charge = 0
    CHARGE_THRESHOLD = 45 # ~1.5 seconds at 30 fps
    
    # Mechanics states
    freeze_timer = 0
    fever_timer = 0
    shield_active = False
    
    # Button Config
    btn_w, btn_h = 240, 60
    btn_x, btn_y = (WIDTH - btn_w) // 2, (HEIGHT - btn_h) // 2
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
            
        frame = cv2.flip(frame, 1)
        fgMask = backSub.apply(frame)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fgMask = cv2.morphologyEx(fgMask, cv2.MORPH_OPEN, kernel)
        
        # Dynamic Background Tint logic
        if game_state == "PLAYING":
            tint_intensity = min(0.3, score / 5000)
            target_color = (0, 0, 50) # Dark Reddish tint for difficulty
            if fever_timer > 0:
                target_color = (0, 50, 50) # Golden tint
            elif freeze_timer > 0:
                target_color = (50, 50, 0) # Blueish tint
            
            overlay = np.full(frame.shape, target_color, dtype=np.uint8)
            cv2.addWeighted(overlay, tint_intensity, frame, 1 - tint_intensity, 0, frame)

        if game_state == "START":
            # Draw Start Screen Overlay
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (WIDTH, HEIGHT), (50, 20, 20), -1)
            cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
            
            # Button Drawing
            cv2.rectangle(frame, (btn_x, btn_y), (btn_x + btn_w, btn_y + btn_h), (0, 255, 0), -1)
            cv2.rectangle(frame, (btn_x, btn_y), (btn_x + btn_w, btn_y + btn_h), (255, 255, 255), 3)
            cv2.putText(frame, "START GAME", (btn_x + 35, btn_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
            cv2.putText(frame, "Hold hand here to start!", (180, btn_y + 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            
            # Charge Bar Drawing
            bar_w = int((start_charge / CHARGE_THRESHOLD) * btn_w)
            cv2.rectangle(frame, (btn_x, btn_y + btn_h + 10), (btn_x + btn_w, btn_y + btn_h + 20), (50, 50, 50), -1)
            cv2.rectangle(frame, (btn_x, btn_y + btn_h + 10), (btn_x + bar_w, btn_y + btn_h + 20), (0, 255, 0), -1)

            # Button Trigger Logic (Hold to Charge)
            roi = fgMask[btn_y:btn_y+btn_h, btn_x:btn_x+btn_w]
            if np.count_nonzero(roi) > (btn_w * btn_h * 0.1):
                start_charge += 1
                if start_charge >= CHARGE_THRESHOLD:
                    game_state = "PLAYING"
                    score, combo = 0, 0
                    emojis, particles = [], []
                    start_charge = 0
                    shield_active = False
                    freeze_timer = 0
                    fever_timer = 0
            else:
                start_charge = max(0, start_charge - 2)

        elif game_state == "PLAYING":
            # Timers
            if freeze_timer > 0: freeze_timer -= 1
            if fever_timer > 0: fever_timer -= 1
            
            # Spawn logic
            spawn_rate = 0.05 + (score // 1000) * 0.01
            if random.random() < spawn_rate:
                rand_val = random.random()
                if rand_val < 0.6: emojis.append(Emoji("happy", score))
                elif rand_val < 0.8: emojis.append(Emoji("love", score))
                elif rand_val < 0.85: emojis.append(Emoji("freeze", score))
                elif rand_val < 0.90: emojis.append(Emoji("fever", score))
                elif rand_val < 0.93: emojis.append(Emoji("shield", score))
                else: emojis.append(Emoji("shock", score))

            # Update emojis
            speed_mult = 0.4 if freeze_timer > 0 else 1.0
            for emoji in emojis[:]:
                emoji.fall(speed_mult)
                
                # Collision detection
                ex1, ex2 = int(emoji.x), int(emoji.x + EMOJI_SIZE)
                ey1, ey2 = int(emoji.y), int(emoji.y + EMOJI_SIZE)
                
                if 0 <= ey1 < ey2 < HEIGHT and 0 <= ex1 < ex2 < WIDTH:
                    roi = fgMask[ey1:ey2, ex1:ex2]
                    if np.count_nonzero(roi) > (EMOJI_SIZE * EMOJI_SIZE * 0.08):
                        if emoji.type == "shock":
                            if shield_active:
                                shield_active = False
                                emojis.remove(emoji)
                                continue
                            game_state = "GAMEOVER"
                            game_over_reason = "Slashed a Shock Emoji!"
                            if game_over_sound: game_over_sound.play()
                        else:
                            # Handling special effects
                            if emoji.type == "freeze":
                                freeze_timer = 150
                            elif emoji.type == "fever":
                                fever_timer = 200
                            elif emoji.type == "shield":
                                shield_active = True
                            
                            points_mult = (2 if fever_timer > 0 else 1) * (1 + combo // 10)
                            score += emoji.points * points_mult
                            combo += 1
                            if bubble_sound: bubble_sound.play()
                            num_p = 30 if fever_timer > 0 else 15
                            for _ in range(num_p):
                                particles.append(Particle(emoji.x + EMOJI_SIZE/2, emoji.y + EMOJI_SIZE/2, emoji.color))
                            emojis.remove(emoji)
                        continue

                # Missed emoji logic
                if emoji.y > HEIGHT:
                    if emoji.type != "shock" and emoji.points > 0: # Only care about happy/love misses
                        if shield_active:
                            shield_active = False
                            emojis.remove(emoji)
                        else:
                            game_state = "GAMEOVER"
                            game_over_reason = f"Missed a {emoji.type.capitalize()}!"
                            if game_over_sound: game_over_sound.play()
                    else:
                        emojis.remove(emoji)

            particles = [p for p in particles if p.update(speed_mult)]

            # Drawing
            for emoji in emojis:
                y1, y2 = max(0, int(emoji.y)), min(HEIGHT, int(emoji.y + EMOJI_SIZE))
                x1, x2 = max(0, int(emoji.x)), min(WIDTH, int(emoji.x + EMOJI_SIZE))
                if y1 < y2 and x1 < x2:
                    img_y1, img_y2 = y1 - int(emoji.y), y1 - int(emoji.y) + (y2 - y1)
                    img_x1, img_x2 = x1 - int(emoji.x), x1 - int(emoji.x) + (x2 - x1)
                    overlay = emoji.image[img_y1:img_y2, img_x1:img_x2, :3]
                    if emoji.image.shape[2] == 4:
                        mask = emoji.image[img_y1:img_y2, img_x1:img_x2, 3] / 255.0
                        for c in range(3):
                            frame[y1:y2, x1:x2, c] = (1.0 - mask) * frame[y1:y2, x1:x2, c] + mask * overlay[:, :, c]
                    else: frame[y1:y2, x1:x2] = overlay
            
            for p in particles: p.draw(frame)
            
            # Motion indicators
            contours, _ = cv2.findContours(fgMask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                if cv2.contourArea(cnt) > 400:
                    cv2.drawContours(frame, [cnt], -1, (0, 255, 0), 1)

            # High-Tech HUD
            score_color = (0, 255, 255) if fever_timer > 0 else (255, 255, 0)
            draw_glow_text(frame, f"SCORE: {score}", (10, 45), cv2.FONT_HERSHEY_DUPLEX, 1.2, score_color, 2)
            
            if combo > 1:
                combo_color = (0, 100, 255) if combo > 20 else (0, 255, 255)
                draw_glow_text(frame, f"COMBO: x{combo}", (10, 90), cv2.FONT_HERSHEY_DUPLEX, 0.8, combo_color, 2)
            
            # Status Indicators
            if shield_active:
                cv2.putText(frame, "SHIELD ACTIVE", (WIDTH - 180, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 100, 0), 2)
            if fever_timer > 0:
                cv2.putText(frame, "FEVER MODE!", (WIDTH // 2 - 80, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 215, 255), 2)
            if freeze_timer > 0:
                cv2.putText(frame, "FREEZE!", (WIDTH // 2 - 50, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)

        elif game_state == "GAMEOVER":
            save_high_score(score)
            high_score = get_high_score()
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (WIDTH, HEIGHT), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.8, frame, 0.2, 0, frame)
            
            draw_glow_text(frame, "GAME OVER", (140, 160), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 5)
            cv2.putText(frame, game_over_reason, (180, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 100, 100), 2)
            cv2.putText(frame, f"Score: {score}", (240, 260), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            cv2.putText(frame, f"High Score: {high_score}", (220, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            
            # Restart Button Drawing
            rv_y = btn_y + 110
            cv2.rectangle(frame, (btn_x, rv_y), (btn_x + btn_w, rv_y + btn_h), (0, 255, 255), -1)
            cv2.rectangle(frame, (btn_x, rv_y), (btn_x + btn_w, rv_y + btn_h), (255, 255, 255), 3)
            cv2.putText(frame, "RESTART", (btn_x + 65, rv_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
            cv2.putText(frame, "Hold here to go back!", (180, rv_y + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

            # Charge Bar Drawing
            bar_w = int((restart_charge / CHARGE_THRESHOLD) * btn_w)
            cv2.rectangle(frame, (btn_x, rv_y + btn_h + 10), (btn_x + btn_w, rv_y + btn_h + 20), (50, 50, 50), -1)
            cv2.rectangle(frame, (btn_x, rv_y + btn_h + 10), (btn_x + bar_w, rv_y + btn_h + 20), (0, 255, 255), -1)

            # Restart Button Trigger logic
            roi = fgMask[rv_y : rv_y + btn_h, btn_x : btn_x + btn_w]
            if np.count_nonzero(roi) > (btn_w * btn_h * 0.1):
                restart_charge += 1
                if restart_charge >= CHARGE_THRESHOLD:
                    game_state = "START"
                    restart_charge = 0
            else:
                restart_charge = max(0, restart_charge - 2)

        cv2.imshow("Emoji Slasher - Premium Edition", frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('r') or key == ord('R'):
            game_state = "START"
        elif key == 27: break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
