# 🎮 Mini Arcade

A browser-based arcade collection built **from scratch** with pure HTML,
CSS, and JavaScript.\
No frameworks. No backend. No external dependencies.

This project was designed and implemented by **Ruslan Babashaikhov** as
a lightweight static game platform focused on clean structure, smooth
mechanics, and classic gameplay logic.

------------------------------------------------------------------------

## 🕹 Games

Built and maintained by me:

-   **Whack-a-Mole**
-   **Pong**
-   **Tetris**
-   **Snake**
-   **Space Invaders**
-   **Pac-Man**

Each game runs inside a unified launcher interface with fullscreen
support and consistent input handling.

------------------------------------------------------------------------

## ✨ Highlights

-   Responsive launcher UI + fullscreen mode
-   Reliable keyboard input handling for embedded games
-   Canvas-based rendering per game
-   LocalStorage high scores
-   Modular folder structure (each game isolated)
-   Static hosting ready (Nginx / VPS / GitHub Pages)

------------------------------------------------------------------------

## 🎯 Controls

Most games support:

-   **Arrows / WASD** --- move
-   **Space** --- action / shoot / drop (depends on the game)
-   **P** --- pause
-   **R** --- restart

Game-specific controls are shown in the launcher panel when you select a
game.

------------------------------------------------------------------------

## 🧠 Project Structure

    public/
      index.html
      styles.css
      app.js
      games.json
      games/
        whack-a-mole/
        pong/
        tetris/
        snake/
        space-invaders/
        pacman/

------------------------------------------------------------------------

## 🚀 Run Locally

From the `public/` folder:

``` bash
cd public
python -m http.server 8000
```

Open:

    http://localhost:8000

------------------------------------------------------------------------

## 🌐 Deployment

This is a **static site** and can be deployed via:

-   Nginx (VPS)
-   Proxy hosting
-   Static hosting providers
-   GitHub Pages

------------------------------------------------------------------------

## 👤 Автор

**Руслан Бабашаихов**\
Senior Web Analytics & AI Enthusiast

GitHub: https://github.com/rbabashaikhov\
Website: https://leadmeter.ru

**Status:** pet-project
