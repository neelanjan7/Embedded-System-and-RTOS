# Release Notes - VelocityAI Racing Simulator v1.0.0 (Release Candidate)

VelocityAI is a high-performance, modular, and production-quality motion-controlled racing simulator. It leverages low-latency IMU sensor fusion on hardware and a custom HTML5 canvas rendering pipeline in the browser.

---

## 1. Release Highlights

*   **Complementary IMU Filter**: Low-pass and high-pass sensor fusion running at 100 ms intervals on the Arduino Nano 33 BLE Sense, outputting pitch, roll, and hardware gesture telemetry.
*   **Decoupled Backend Architecture**: Modular Python class hierarchy (PacketParser, TelemetryManager, Logger, GestureInterpreter) validating inputs with a Dallas/Maxim CRC-8 checksum.
*   **HTML5 Canvas 3D Perspective Road Engine**: Winding 3-lane perspective road scrolling at a locked 60 FPS using coordinate projection, horizon clouds, and far-hills Y-clipping.
*   **Dynamic Visuals & Audio Synthesizers**: Integrates day-night transitions (Morning, Noon, Evening, Night), climate shifts (Sunny, Cloudy, Rainy, Foggy), leaf/rain particles, and synthesized Web Audio engine hums/wind noises that run completely offline.
*   **Collision & State Systems**: Realistic bounding box calculations, structural shield damage, speed caps, and floating HUDs (shield bar, speedometer, gear dials, and high-score multipliers).
*   **Local Settings Persistence**: Restores deadzones and audio configurations automatically using `localStorage`.

---

## 2. Technical Stack

*   **Firmware**: C++ (Arduino CLI / IDE), APDS9960, LSM9DS1 IMU libraries.
*   **Backend**: Python 3.9+, Flask, PySerial, NumPy.
*   **Frontend**: HTML5 Canvas, Web Audio API, Vanilla CSS (cyberpunk glassmorphism), ES6 Modular JavaScript.

---

## 3. Quick Start & Setup

1.  **Flash Firmware**: Upload motion_controller.ino to the Arduino Nano 33 BLE Sense.
2.  **Install Python Libraries**: Run `pip install -r requirements.txt` inside the python backend folder.
3.  **Launch Python Server**: Run `python backend/app.py` in your terminal.
4.  **Connect in Browser**: Open `http://127.0.0.1:5000`, open the Connection Modal, scan serial COM interfaces, and click connect (or select **Simulation Mode**).
