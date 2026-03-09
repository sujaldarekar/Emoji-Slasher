# 🎮 Emoji Slasher: Premium Edition - Deployment Guide

Welcome to the **Emoji Slasher** deployment guide! Follow these steps to get the game running on your machine.

## 🛠️ System Requirements

- **Python**: 3.8 or higher.
- **Webcam**: Required for motion detection.
- **Audio**: Speakers or headphones for sound effects and music.

## 🚀 Installation Steps

1. **Clone or Download**: Ensure all project files (listed below) are in a single folder.
2. **Install Dependencies**: Open your terminal or command prompt in the project directory and run:
   ```bash
   pip install opencv-python pygame numpy
   ```

## 🎥 Assets Checklist

Ensure the following files are present in the same directory as `main.py`:
- **Music/Sounds**: `background.mp3`, `bubble.mp3`, `fahhhhh.mp3`
- **Images**: `happy.png`, `love.png`, `shock.png`, `freeze.png`, `fever.png`, `shield.png`

## 🕹️ How to Play

1. **Run the Game**:
   ```bash
   python main.py
   ```
2. **Start Screen**: Move your hand over the **"START GAME"** button on the screen. Hold it there until the progress bar fills up.
3. **Gameplay**:
   - **Slash**: Move your hand over falling emojis to slash them.
   - **Happy/Love Emojis**: Slashed for points!
   - **Special Emojis**:
     - ❄️ **Freeze**: Slows down time.
     - 🔥 **Fever**: Double points and faster particles!
     - 🛡️ **Shield**: Protects you from one mistake.
   - **Avoid**: Do NOT slash the 😱 **Shock** emoji!
   - **Game Over**: Missing a "Good" emoji or slashing a "Shock" emoji (without a shield) ends the game.
4. **Restart**: After a Game Over, hold your hand over the **"RESTART"** button.

## 🔧 Troubleshooting

- **Webcam not opening**: Ensure no other application is using the camera.
- **Audio lag**: Pygame mixer is used; ensure your audio drivers are up to date.
- **Performance**: If the game is slow, try reducing the background lighting in your room for better motion detection.

---
*Happy Slashing!* 🔪✨
