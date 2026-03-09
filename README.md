# Emoji Slasher: Premium Edition

Welcome to the Emoji Slasher project. This repository contains two versions of the game: a modern, high-performance web version designed for browsers and mobile devices, and the original Python-based desktop version.

## Project Structure

- **[web/](file:///c:/Users/Sujal%20Y.%20Darekar/OneDrive/Desktop/game%20smash/web/)**: This version is best for mobile play and quick access in any browser. It uses AI hand tracking to detect your movements.
- **[desktop/](file:///c:/Users/Sujal%20Y.%20Darekar/OneDrive/Desktop/game%20smash/desktop/)**: This is the original Python implementation that uses OpenCV and Pygame to run on your computer.

---

## Quick Start: Web Version (Mobile/Browser)
*Recommended for most users.*

1. **Navigate to the web folder**: `cd web`
2. **Start a local server**:
   ```bash
   python -m http.server 8000
   ```
3. **Open in your Browser**: Visit `http://localhost:8000`
4. **Playing on Mobile**: Visit `http://YOUR_IP:8000` on your phone's browser once the server is running on your PC.

> [!TIP]
> Check the [**`web/DEPLOY_WEB.md`**](file:///c:/Users/Sujal%20Y.%20Darekar/OneDrive/Desktop/game%20smash/web/DEPLOY_WEB.md) file for more specific mobile setup instructions.

---

## Quick Start: Desktop Version (Python)

1. **Navigate to the desktop folder**: `cd desktop`
2. **Install necessary dependencies**:
   ```bash
   pip install opencv-python pygame numpy
   ```
3. **Run the game**:
   ```bash
   python main.py
   ```

---

## Online Deployment with Render
 
You can easily host the web version of the game for free using Render.
 
1. **GitHub Setup**: I have already initialized the repository and pushed the code to [**sujaldarekar/Emoji-Slasher**](https://github.com/sujaldarekar/Emoji-Slasher).
2. **Connect to Render**:
   - Sign up at [Render.com](https://render.com/).
   - Create a new **Static Site**.
   - Select the `Emoji-Slasher` repository.
3. **Configuration**:
   - **Name**: `emoji-slasher`
   - **Root Directory**: `web` (IMPORTANT: Point this to the `web` folder)
   - **Build Command**: Leave this empty.
   - **Publish Directory**: `.`
4. **Final Step**: Render will detect the configuration and deploy your site automatically.
 
---
Enjoy the game! 🎮
