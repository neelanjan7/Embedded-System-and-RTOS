# Color Sensor Web Interface using Arduino Nano 33 BLE

## Overview

This project demonstrates real-time color detection using the **Arduino Nano 33 BLE** and the **APDS9960 Color Sensor**. The Arduino reads RGB values from the sensor and sends them to a Python Flask application through serial communication. The Flask server displays the live RGB values in a web browser along with a color preview and progress bars.

---

## Features

- Real-time RGB color detection
- Live color preview in the browser
- RGB value display
- Progress bars for Red, Green, and Blue channels
- Serial communication between Arduino and Python
- Simple Flask-based web interface

---

## Hardware Used

- Arduino Nano 33 BLE
- APDS9960 Color Sensor (built into the Nano 33 BLE Sense series or external module)
- USB Cable
- Computer

---

## Software Used

- Arduino IDE
- Python 3
- Flask
- PySerial

---

## Project Structure

```
Color Sensor/
│
├── app.py
├── color_sensor.ino
├── README.md
└── templates/
    └── index.html
```

---

## Python Libraries

Install the required libraries before running the project:

```bash
pip install flask pyserial
```

---

## How to Run

### 1. Upload the Arduino Code

- Open `color_sensor.ino` in the Arduino IDE.
- Select the correct board and COM port.
- Upload the sketch to the Arduino.

### 2. Configure the COM Port

Open `app.py` and update the COM port if necessary:

```python
PORT = "COM28"
```

Replace `COM28` with the COM port assigned to your Arduino.

### 3. Start the Flask Server

Run:

```bash
python app.py
```

### 4. Open the Web Interface

Open your browser and visit:

```
http://127.0.0.1:5000
```

The webpage will continuously display the current RGB values detected by the sensor.

---

## How It Works

1. The Arduino reads RGB values using the APDS9960 sensor.
2. The values are transmitted over Serial at 9600 baud.
3. The Flask application receives and processes the serial data.
4. The browser requests updated sensor values every 300 milliseconds.
5. The webpage updates the RGB values, progress bars, and live color preview.

---

## Sample Serial Output

```
R:337,G:307,B:292
```

---

## Future Improvements

- Add gesture detection using the APDS9960 sensor.
- Display detected color names.
- Store sensor readings in a database.
- Add data visualization and graphs.
- Support multiple sensors.

---

## Author

Developed as part of an **Embedded Systems Laboratory** project.
