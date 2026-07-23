# System Architecture Document

This document outlines the detailed system architecture, component modules, communication protocols, and mathematical foundations of the **AI Motion Controlled Racing Simulator**.

---

## 1. Modular Architecture Overview

The application is structured into three clean, decoupled layers following strict software engineering principles:

```
                  +-----------------------------------+
                  |      Arduino Nano 33 BLE Sense    |
                  |  - Accelerometer/Gyroscope        |
                  |  - Onboard Complementary Filter   |
                  +-----------------+-----------------+
                                    |
                                    | USB Serial ($IMU,...)
                                    v
                  +-----------------+-----------------+
                  |          Python Backend           |
                  |  - PySerial Reader Thread         |
                  |  - Checksum Validation Engine     |
                  |  - NumPy Multinomial Classifier   |
                  |  - Flask HTTP & SSE Server        |
                  +-----------------+-----------------+
                                    |
                                    | Server-Sent Events (SSE)
                                    v
                  +-----------------+-----------------+
                  |         HTML5 Web Client          |
                  |  - Canvas Game Renderer (ES6)     |
                  |  - Vector Track Collision Engine  |
                  |  - Drift Vehicle Physics Model    |
                  |  - Web Audio Engine Sound Synth   |
                  +-----------------------------------+
```

---

## 2. Component Layout & Modular Structure

The codebase is organized as follows:

```
Racing Car/
├── config.py                 # Master configuration settings
├── requirements.txt          # Python environment dependencies
├── README.md                 # Project introduction and build instructions
├── LICENSE                   # Project software license
├── .gitignore                # Target exclude rules
├── docs/                     # Detailed architectural manuals
│   ├── Architecture.md       # (This file) Deep dive into math and structure
│   ├── API.md                # Server HTTP APIs & SSE structures
│   └── UserGuide.md          # Setup and operational instructions
├── embedded/                 
│   └── motion_controller/
│       ├── motion_controller.ino  # Main embedded program
│       └── IMUFilter.h            # Filter definitions (header-only implementation)
├── backend/
│   ├── app.py                # Flask entry point and static route controllers
│   ├── serial_processor.py   # Background serial worker thread
│   ├── ai_classifier.py      # Gestures classifier using pure NumPy matrices
│   └── mock_serial.py        # Simulated serial generator for desktop-only testing
└── frontend/
    ├── templates/
    │   └── index.html        # Main SPA UI structure
    └── static/
        ├── css/
        │   └── style.css     # HUD styles & modern dashboard interface
        └── js/
            ├── connection.js # Interface handling events streaming
            ├── game.js       # Game loop management & Canvas track drawer
            ├── physics.js    # Multi-force vehicle physics model
            ├── sound.js      # Synthesized Web Audio engine frequencies
            └── ui.js         # Interactive calibration UI
```

---

## 3. Mathematical Foundations

### 3.1. Sensor Fusion (Complementary Filter)
To maintain orientation without drifting over time (common to gyroscope integration) and without high-frequency vibration noise (common to accelerometer raw readings), we implement a **Complementary Filter** inside the Arduino Nano 33 BLE Sense:

$$\theta_{\text{roll}, t} = \alpha (\theta_{\text{roll}, t-1} + \omega_x dt) + (1-\alpha) \theta_{\text{acc, roll}}$$

$$\theta_{\text{pitch}, t} = \alpha (\theta_{\text{pitch}, t-1} + \omega_y dt) + (1-\alpha) \theta_{\text{acc, pitch}}$$

- **Gyroscope Integration**: $\omega_x dt$ gives the change in angle from gyroscope angular velocity $\omega_x$ over timestamp $dt$.
- **Accelerometer Baseline**:
  $$\theta_{\text{acc, roll}} = \text{atan2}(a_y, a_z) \times \frac{180}{\pi}$$
  $$\theta_{\text{acc, pitch}} = \text{atan2}(-a_x, \sqrt{a_y^2 + a_z^2}) \times \frac{180}{\pi}$$
- **Weight Factor**: $\alpha \approx 0.98$ assigns 98% weight to integration (stable short-term) and 2% to gravity direction tracking (stable long-term).

---

### 3.2. AI Gesture Classification (NumPy Logistic Regression)
We utilize a **Multinomial Logistic Regression (Softmax Classifier)** designed using pure NumPy matrices. This choice yields low-latency execution and operates without heavy framework overhead.

1. **Feature Extraction**:
   From a sliding window of length $N$ containing raw accelerations and angular velocities $\vec{s}_t = [a_x, a_y, a_z, g_x, g_y, g_z]^T$, we compute:
   - Mean vector: $\vec{\mu} = \frac{1}{N} \sum_{i=1}^{N} \vec{s}_i$
   - Standard deviation vector: $\vec{\sigma} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (\vec{s}_i - \vec{\mu})^2}$
   - Feature vector: $\vec{x} = [\vec{\mu}, \vec{\sigma}]^T \in \mathbb{R}^{12}$

2. **Classification (Softmax)**:
   For weight matrix $W \in \mathbb{R}^{K \times 12}$ and bias vector $\vec{b} \in \mathbb{R}^K$, where $K = 5$ represents target gesture categories:
   $$\vec{z} = W \vec{x} + \vec{b}$$
   $$P(y = k \mid \vec{x}) = \frac{e^{z_k}}{\sum_{j=1}^{K} e^{z_j}}$$
   The predicted output is $\hat{y} = \arg\max_k P(y = k \mid \vec{x})$.

3. **Online Calibration & Training**:
   During calibration, the system records samples for each state. We minimize cross-entropy loss using Gradient Descent:
   $$\mathcal{L} = -\sum_{k=1}^K y_k \log P(y=k \mid \vec{x})$$
   $$W \leftarrow W - \eta \frac{\partial \mathcal{L}}{\partial W}, \quad \vec{b} \leftarrow \vec{b} - \eta \frac{\partial \mathcal{L}}{\partial \vec{b}}$$

---

### 3.3. Top-Down Vehicle Physics & Drifting Model
The simulator models realistic longitudinal and lateral forces:

1. **Heading and Velocity Vectors**:
   The car's position is updated by integrating velocity vectors:
   $$x_{t} = x_{t-1} + v_x \cdot dt, \quad y_{t} = y_{t-1} + v_y \cdot dt$$

2. **Longitudinal Mechanics**:
   $$F_{\text{engine}} = \text{Throttle} \times T_{\text{max}}$$
   $$F_{\text{resistance}} = -C_{\text{rolling}} \cdot v_{\text{long}} - C_{\text{drag}} \cdot v_{\text{long}}^2$$
   $$F_{\text{net, long}} = F_{\text{engine}} + F_{\text{resistance}} + F_{\text{brake}}$$

3. **Lateral Mechanics (Drift Threshold)**:
   Tire lateral force is governed by lateral slip angle $\beta$ and grip coefficient $C_{\text{grip}}$:
   $$F_{\text{lateral}} = -C_{\text{grip}} \cdot v_{\text{lateral}}$$
   When $|F_{\text{lateral}}| > F_{\text{sliding\_threshold}}$, the tires lose adhesion:
   $$C_{\text{grip}} \leftarrow C_{\text{grip}} \times \mu_{\text{kinetic\_friction\_coefficient}}$$
   This drops sideways resistance, enabling realistic power slides (drifting) before dynamic grip returns as velocity vectors realign.

---

## 4. Communication Protocol

The serial pipeline transmits data frames at $50\text{ Hz}$ over USB Serial.

```
+-----------+--------+---------------+-------------------+---------------+----+---------+
| Delimiter | Header | Roll Angle    | Pitch Angle       | Sensor Values | *  | Checksum|
|    $      |  IMU   | -180.0, 180.0 | -90.0, 90.0       | Ax,Ay,Az,Gx,Gy,Gz  |    |  (Hex)  |
+-----------+--------+---------------+-------------------+---------------+----+---------+
```

Example frame: `$IMU,-12.45,5.20,0.01,-0.08,0.99,1.2,-0.4,15.8*4F\r\n`
- Header: `$IMU`
- Checksum: Computed by applying a bitwise XOR to all bytes between `$` and `*` exclusive. The target backend validates this block against the trailing HEX byte string to reject noise-induced frame errors.
