# Changelog - VelocityAI Simulator

All notable changes to the VelocityAI Racing Simulator project will be documented in this file.

---

## [1.0.0-RC1] - 2026-07-14

### Added
*   **Collision Manager**: Real-time bounding box overlap checks for player vs. traffic and player vs. obstacles with broad-phase optimizations.
*   **Damage Modulations**: Shield health systems ($100\%$ to $0\%$) that dynamically scale maximum throttle velocities and trigger smoke/spark particle sheets.
*   **Game State Machine**: Centralized state triggers managing overlays for loading screens, play frames, paused drives, and game over stats cards.
*   **Score Calculations**: Tracks travel distances, registers $+500\text{ point}$ near-miss bonuses, and inflicts $-1000\text{ point}$ collision penalties.
*   **Day-Night Progression**: Hour-cycling transitions modulating sky color gradients, celestial solar/lunar coordinates, and ambient multipliers.
*   **Climate Systems**: Dynamic Sunny (birds flapping), Cloudy (horizon mist), Rainy (slanted droplets and wet puddles), and Foggy (Z-depth atmospheric fogging) shifts.
*   **Lighting Overlays**: Specular sky reflections on tarmac, glossy puddle ellipses, and streetlight cone spotlights that project at night.
*   **Audio Synthesizers**: Web Audio API engine oscillator pitch sweeps (RPM/gear linked), rain patters, and speed wind friction whooshes running completely offline.
*   **Settings Persistence**: Automatically saves and restores deadzones and audio checkboxes using `localStorage`.

### Fixed
*   **Object Pooling**: Pre-allocated particle pools in `renderer.js` to recycle dead sparks/smoke, resolving garbage collection framerate lags.
*   **Reconnects Handling**: Auto-reconnection timer in `connection.js` attempting recovery on serial stream dropout.
*   **Z-Wrap Alignment**: Fixed coordinates overflow alignment in `game.js` during Z looping.
*   **Browser Resize Glitches**: Bound dimension checks on resize to maintain canvas aspects.
