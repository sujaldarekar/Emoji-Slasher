# 🌐 Emoji Slasher Web - Deployment Guide

This version of **Emoji Slasher** is designed to run in modern web browsers on both **Mobile** and **Desktop**.

## 🚀 How to Run Locally

Because the game uses your camera, browsers require the files to be served through a **Web Server** (it won't work if you just double-click `index.html`).

### Option 1: Using VS Code (Easiest)
1. Open the `web` folder in VS Code.
2. Install the **"Live Server"** extension.
3. Click **"Go Live"** at the bottom right.

### Option 2: Using Python (No Install)
1. Open your terminal in the `web` folder.
2. Run:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

## 📱 How to Play on Mobile

To play on your phone, you need to "host" it so your phone can see it:
1. **Local Network**: Ensure your phone and PC are on the same Wi-Fi.
2. **Find your IP**: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your local IP (e.g., `192.168.1.5`).
3. **Open on Phone**: Visit `http://YOUR_IP:8000` on your phone's browser (Safari or Chrome).

### Mobile Controls
- **Permission**: The browser will ask for Camera access—click **Allow**.
- **Interaction**: Most browsers require you to **Tap the screen once** to enable sound.
- **Slashing**: Use your hand in front of the front-facing camera to slash emojis!
- **Spells**: Fill spell charge and draw gestures in air: `O` = Shield, `Z` = Freeze, `X` = Rage Cut.

## ✨ Features
- **MediaPipe Tracking**: Uses AI to detect your hand movements even on high-end phones.
- **Gesture Spells**: Cast powers by drawing hand gestures once spell meter is full.
- **Glassmorphism UI**: High-tech transparent HUD.
- **Smooth Particles**: Optimized for mobile performance.

---
*Happy Mobile Slashing!* 🔪📱
