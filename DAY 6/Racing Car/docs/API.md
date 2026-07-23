# API Specification Document

This document outlines the REST APIs and Real-Time Event Streams provided by the Python Flask backend for communication with the browser interface.

---

## 1. REST API Endpoints

All REST routes are prefixed with `/api` to keep backend routes cleanly separated from static asset routes.

### 1.1. Get System Status
Returns diagnostic details about the serial connection and system configurations.

*   **URL**: `/api/status`
*   **Method**: `GET`
*   **Response Codes**: Success (`200 OK`)
*   **Response Payload**:
    ```json
    {
      "status": "success",
      "data": {
        "arduino_connected": true,
        "active_port": "COM3",
        "baud_rate": 115200,
        "mock_mode": false,
        "packet_loss_rate": 0.02,
        "calibration_status": {
          "calibrated": true,
          "roll_offset": -1.24,
          "pitch_offset": 0.45
        },
        "model_status": {
          "trained": true,
          "classes": ["Idle", "Steer Left", "Steer Right", "Boost", "Brake"]
        }
      }
    }
    ```

---

### 1.2. Get Available Serial Ports
Scans the host operating system for active serial/COM ports.

*   **URL**: `/api/ports`
*   **Method**: `GET`
*   **Response Codes**: Success (`200 OK`)
*   **Response Payload**:
    ```json
    {
      "status": "success",
      "ports": [
        {
          "port": "COM3",
          "description": "Arduino Nano 33 BLE Sense (COM3)",
          "hwid": "USB VID:PID=2341:005A"
        },
        {
          "port": "COM4",
          "description": "Intel(R) Active Management Technology - SOL (COM4)",
          "hwid": "PCI\\VEN_8086&DEV_A367"
        }
      ]
    }
    ```

---

### 1.3. Connect to Port
Instructs the backend to open a connection to a specific serial port.

*   **URL**: `/api/connect`
*   **Method**: `POST`
*   **Request Headers**: `Content-Type: application/json`
*   **Request Body**:
    ```json
    {
      "port": "COM3"
    }
    ```
*   **Response Codes**: Success (`200 OK`), Bad Request (`400 Bad Request`), Internal Server Error (`500 Internal Server Error`)
*   **Response Payload**:
    ```json
    {
      "status": "success",
      "message": "Successfully connected to port COM3"
    }
    ```

---

### 1.4. Disconnect Port
Closes the active serial connection to release system resources.

*   **URL**: `/api/disconnect`
*   **Method**: `POST`
*   **Response Codes**: Success (`200 OK`)
*   **Response Payload**:
    ```json
    {
      "status": "success",
      "message": "Serial connection closed successfully"
    }
    ```

---

### 1.5. Calibrate Sensors
Resets accelerometer and gyroscope offsets using the current readings.

*   **URL**: `/api/calibrate`
*   **Method**: `POST`
*   **Response Codes**: Success (`200 OK`), Service Unavailable (`503 Service Unavailable` if Arduino is disconnected)
*   **Response Payload**:
    ```json
    {
      "status": "success",
      "message": "Calibration completed successfully.",
      "offsets": {
        "roll": -0.15,
        "pitch": 0.22
      }
    }
    ```

---

### 1.6. Train AI Gesture Model
Runs gradient descent on collected training sequences to fit the classifier weights.

*   **URL**: `/api/train`
*   **Method**: `POST`
*   **Request Headers**: `Content-Type: application/json`
*   **Request Body**:
    ```json
    {
      "training_data": {
        "Idle": [[-0.01, 0.05, 0.99, ...], ...],
        "Steer Left": [[-0.34, 0.12, 0.88, ...], ...],
        "Steer Right": [[0.36, -0.08, 0.89, ...], ...],
        "Boost": [[-0.12, 0.85, 0.44, ...], ...],
        "Brake": [[0.08, -0.65, 0.72, ...], ...]
      }
    }
    ```
*   **Response Codes**: Success (`200 OK`), Unprocessable Entity (`422 Unprocessable Entity` if training data is invalid)
*   **Response Payload**:
    ```json
    {
      "status": "success",
      "message": "AI Gesture model trained successfully.",
      "metrics": {
        "loss": 0.045,
        "accuracy": 0.985
      }
    }
    ```

---

## 2. Server-Sent Events (SSE) Stream

Real-time telemetry and classification streams are broadcast using standard HTTP Server-Sent Events at a frequency of approximately $50\text{ Hz}$.

*   **URL**: `/api/events`
*   **Method**: `GET`
*   **Headers**:
    *   `Content-Type: text/event-stream`
    *   `Cache-Control: no-cache`
    *   `Connection: keep-alive`

### 2.1. Event Message Types

#### `telemetry`
Broadcasts IMU raw data and calculated Euler angles.
```event
event: telemetry
data: {
  "timestamp": 1718290382.42,
  "roll": -12.45,
  "pitch": 5.20,
  "accel": {"x": 0.01, "y": -0.08, "z": 0.99},
  "gyro": {"x": 1.2, "y": -0.4, "z": 15.8}
}
```

#### `gesture`
Fires when the active AI prediction model detects a new motion gesture.
```event
event: gesture
data: {
  "timestamp": 1718290382.42,
  "predicted_class": "Steer Left",
  "probabilities": {
    "Idle": 0.05,
    "Steer Left": 0.85,
    "Steer Right": 0.02,
    "Boost": 0.01,
    "Brake": 0.07
  }
}
```

#### `system_status`
Fired dynamically when hardware state or connection errors occur.
```event
event: system_status
data: {
  "connected": false,
  "error": "Serial exception: Device was unplugged."
}
```
