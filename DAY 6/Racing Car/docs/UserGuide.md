# User Guide & Setup Manual

This document provides setup and operational instructions for running the **AI Motion Controlled Racing Simulator**.

---

## 1. Prerequisites

### 1.1. Hardware Requirements
1.  **Microcontroller**: Arduino Nano 33 BLE Sense.
2.  **USB Cable**: Micro-USB data cable (ensure it supports data transfer, not just charging).
3.  **Client Machine**: Computer with a USB-A or USB-C port, supporting Python 3.13 and a modern browser (Chrome, Edge, or Firefox).

### 1.2. Software Requirements
1.  **Python**: Version 3.13 installed (ensure Python is added to the system `PATH`).
2.  **Arduino Environment**: Arduino IDE (v2.x recommended) or Arduino CLI.
3.  **Arduino Libraries**:
    *   `Arduino_LSM9DS1` (IMU sensor driver library)

---

## 2. Step-by-Step Installation

### Step 2.1: Flash the Arduino Firmware
1.  Connect your Arduino Nano 33 BLE Sense to your computer using the USB cable.
2.  Open the Arduino IDE.
3.  Navigate to **Library Manager** (Ctrl+Shift+I or Cmd+Shift+I) and search for `Arduino_LSM9DS1`. Install the latest version.
4.  Open the sketch located at `embedded/motion_controller/motion_controller.ino`.
5.  Select **Tools -> Board -> Arduino Mbed OS Nano Boards -> Arduino Nano 33 BLE**. If not present, download it via the Boards Manager.
6.  Select the corresponding COM Port (**Tools -> Port**).
7.  Click **Upload** (arrow icon). Once uploading is complete, note down the COM port number (e.g., `COM3` on Windows or `/dev/ttyACM0` on Linux/macOS).

### Step 2.2: Setup the Python Backend
1.  Open a terminal / PowerShell window and navigate to the project directory:
    ```bash
    cd "Racing Car"
    ```
2.  Create a virtual environment to prevent dependency conflicts:
    ```bash
    python -m venv .venv
    ```
3.  Activate the virtual environment:
    *   **Windows (PowerShell)**: `.venv\Scripts\Activate.ps1`
    *   **Windows (CMD)**: `.venv\Scripts\activate.bat`
    *   **macOS / Linux**: `source .venv/bin/activate`
4.  Install the required packages using pip:
    ```bash
    pip install -r requirements.txt
    ```

### Step 2.3: Start the Server
1.  Start the Flask server from the project root directory:
    ```bash
    python backend/app.py
    ```
2.  The output should indicate that the server is running on `http://127.0.0.1:5000`.
3.  The backend will automatically attempt to scan and open connection channels with the Arduino board.

---

## 3. Operational Guide

### 3.1. Browser Connection
1.  Open your browser and navigate to `http://127.0.0.1:5000`.
2.  The web dashboard will open, displaying the telemetry monitors and control configuration tools.
3.  Verify the connection state:
    *   **Green Indicator**: Arduino successfully connected. Telemetry plots will update dynamically.
    *   **Yellow Indicator**: Simulator is running in Mock Mode (software-emulated controls).
    *   **Red Indicator**: Connection failed. Verify cable attachment, select the COM port in the dashboard, and click "Connect".

### 3.2. Calibration Phase (Neutral Alignment)
1.  Hold the Arduino board completely flat in your hands (simulating a standard flat steering wheel orientation).
2.  On the web dashboard, locate and click the **Calibrate Controller** button.
3.  Keep the board stationary for 2 seconds. The HUD will read "Calibrated" once the current orientation is locked as the neutral center $(0,0)$ position.

### 3.3. Control Instructions
*   **Steering**: Tilt the Arduino board like a steering wheel.
    *   **Roll Left**: Steers the racing car left.
    *   **Roll Right**: Steers the racing car right.
*   **Throttle & Braking**:
    *   **Pitch Forward**: Acceleration / Throttle.
    *   **Pitch Backward**: Braking / Reverse.
*   **Gestures (AI Assisted)**:
    *   **Quick Forward Shake**: Activate Boost (Nitro).
    *   **Quick Side Flick (Yaw/Roll acceleration spike)**: Trigger Drift sliding mode.

### 3.4. Tuning AI Gestures
1.  Navigate to the **AI Trainer** tab on the web dashboard.
2.  Select the desired gesture (e.g., "Boost") and click **Record Samples**.
3.  Execute the movement pattern with your controller.
4.  Repeat for other gesture states, then click **Train Classifier Model**. The dashboard will display the resulting network training accuracy.
