# AI Motion Controlled Racing Simulator

An immersive browser-based racing simulator controlled via hand movements using an **Arduino Nano 33 BLE Sense** microcontroller. The project features on-device sensor fusion, a real-time serial pipeline, a custom gesture recognition engine built with NumPy, and a vector physics-based canvas racing game complete with Web Audio engine sound synthesis.

---

## Technical Features

*   **Real-time Sensor Fusion**: Onboard complementary filter running on the Arduino LSM9DS1 IMU to track tilt angles (roll & pitch) with sub-degree accuracy.
*   **Low-Latency Serial Protocol**: Compact binary-checksum-validated CSV transmission format running at $50\text{ Hz}$.
*   **NumPy Machine Learning Classifier**: A custom, lightweight, gradient-descent-trained multinomial logistic classifier implemented in pure Python/NumPy to classify gestures like Boost and Drift in real time.
*   **Physics-Based Game Engine**: Dynamic top-down vehicle simulation in HTML5 Canvas, implementing drag, sliding thresholds, and realistic drift mechanics.
*   **Interactive Audio Synthesis**: Engine sound dynamically synthesized on-the-fly in the browser using the Web Audio API based on car RPM and velocity.
*   **Glassmorphic HUD Dashboard**: Sleek UI dashboard presenting connection health, serial signal diagnostic graphs, calibration control panels, and game statistics.

---

## Repository Structure

```
Racing Car/
├── config.py                 # Configuration options for Flask/Serial/AI/Physics
├── requirements.txt          # Root Python environment dependencies
├── LICENSE                   # Software license (MIT)
├── .gitignore                # Target folder exclude filters
├── docs/                     # Comprehensive documentation manuals
│   ├── Architecture.md       # Math formulas, sensor fusion, and systems architecture
│   ├── API.md                # Server HTTP REST APIs & SSE event structures
│   └── UserGuide.md          # Hardware installation, calibration, & compile steps
├── embedded/                 # Arduino C++ sources
├── backend/                  # Python Flask backend & Serial parser
└── frontend/                 # Canvas game engine, styling sheets, & event connectors
```

---

## Documentation Quick Links

To examine specific architectural designs or operational instructions, consult the documentation manuals:
1.  **Architecture Specifications**: Review [Architecture.md](docs/Architecture.md) to inspect sensor equations, classifier details, and physics mechanics.
2.  **API Manual**: Review [API.md](docs/API.md) to inspect REST endpoints and SSE payload schemas.
3.  **User Setup Guide**: Review [UserGuide.md](docs/UserGuide.md) for full compilation and run commands.

---

## Quick Start Instructions

For detailed instructions, refer to the [User Guide](docs/UserGuide.md).

### 1. Compile & Upload Arduino Sketch
Open the sketch in `embedded/motion_controller/motion_controller.ino` with the Arduino IDE and upload it to your board.

### 2. Setup Server and Dependencies
Install dependencies and run the server:
```bash
# Setup virtual environment
python -m venv .venv
source .venv/bin/activate  # Or Windows equivalent

# Install python dependencies
pip install -r requirements.txt

# Run Flask backend
python backend/app.py
```

### 3. Open Browser Simulator
Open your browser and navigate to `http://127.0.0.1:5000`. Set up alignment, calibrate your controller, and start driving!
