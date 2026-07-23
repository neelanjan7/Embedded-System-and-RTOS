"""
app.py
======
Flask backend server and communication gateway for the Motion Controlled Racing Simulator.
Exposes REST status/control endpoints, parses hardware gestures from APDS9960,
and streams telemetry states to browser clients using Server-Sent Events.

Author: Sagar Kumar
Date: 2026
"""

import os
import sys
import json
import time
from flask import Flask, render_template, jsonify, request, Response
from typing import Generator

# Align import path variables
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import Config
from serial_processor import SerialProcessor
from gesture_interpreter import GestureInterpreter
from logger import Logger

app = Flask(
    __name__,
    static_folder="../frontend/static",
    template_folder="../frontend/templates"
)
app.config.from_object(Config)

# Global instances
serial_worker = SerialProcessor(
    baud_rate=Config.DEFAULT_BAUD_RATE,
    mock_mode=Config.MOCK_SERIAL
)

@app.route('/')
def index():
    """Serves the main application page containing the game canvas & dashboard."""
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    """Retrieves current connection status, COM port metrics, and calibration state."""
    telemetry = serial_worker.get_telemetry()
    return jsonify({
        "status": "success",
        "data": {
            "arduino_connected": telemetry["connected"],
            "active_port": serial_worker.active_port,
            "baud_rate": serial_worker.baud_rate,
            "mock_mode": serial_worker.mock_mode,
            "packet_loss_rate": telemetry["packet_loss_rate"],
            "status_flags": telemetry["status_flags"],
            "calibration_status": {
                "calibrated": serial_worker.telemetry.is_calibrated,
                "roll_offset": serial_worker.telemetry.roll_offset,
                "pitch_offset": serial_worker.telemetry.pitch_offset
            },
            "interpreter_status": {
                "ready": True,
                "mappings": GestureInterpreter.GESTURE_MAP
            }
        }
    })

@app.route('/api/ports', methods=['GET'])
def get_ports():
    """Lists available COM/serial ports on the host operating system."""
    ports = SerialProcessor.list_available_ports()
    ports.append({
        "port": "MOCK_COM_PORT",
        "description": "Software Telemetry Emulator (MOCK_COM_PORT)",
        "hwid": "MOCK_DEVICE_ID"
    })
    return jsonify({
        "status": "success",
        "ports": ports
    })

@app.route('/api/connect', methods=['POST'])
def connect_serial():
    """Initiates connection with target serial port."""
    data = request.get_json() or {}
    port = data.get("port")
    
    if not port:
        ports = SerialProcessor.list_available_ports()
        hardware_ports = [p["port"] for p in ports if "MOCK" not in p["port"]]
        if hardware_ports:
            port = hardware_ports[0]
        else:
            port = "MOCK_COM_PORT"
            serial_worker.mock_mode = True

    success = serial_worker.connect(port)
    if success:
        return jsonify({
            "status": "success",
            "message": f"Successfully connected to port {port}",
            "port": port
        })
    else:
        return jsonify({
            "status": "failed",
            "message": f"Could not establish serial link on port {port}"
        }), 400

@app.route('/api/disconnect', methods=['POST'])
def disconnect_serial():
    """Stops worker threads and disconnects from active ports."""
    serial_worker.disconnect()
    return jsonify({
        "status": "success",
        "message": "Serial connection closed."
    })

@app.route('/api/calibrate', methods=['POST'])
def calibrate_sensors():
    """Performs manual software calibration to establish raw sensor center levels."""
    telemetry = serial_worker.get_telemetry()
    if not telemetry["connected"]:
        return jsonify({
            "status": "failed",
            "message": "Arduino must be connected to run calibration."
        }), 503
        
    roll_off, pitch_off = serial_worker.calibrate()
    return jsonify({
        "status": "success",
        "message": "Software calibration completed.",
        "offsets": {
            "roll": roll_off,
            "pitch": pitch_off
        }
    })

def generate_sse_stream() -> Generator[str, None, None]:
    """Retrieves serial telemetry packages, applies gesture interpreter conversion,
    and formats SSE text blocks at ~10 Hz intervals.
    """
    last_seq = -1
    
    while True:
        telemetry = serial_worker.get_telemetry()
        
        # Check connection validity
        if not telemetry["connected"]:
            yield f"event: system_status\ndata: {json.dumps({'connected': False})}\n\n"
            time.sleep(0.5)
            continue
            
        # Avoid duplicate data broadcasts
        seq = telemetry["sequence"]
        if seq == last_seq:
            time.sleep(0.01) # Yield CPU control
            continue
        last_seq = seq
        
        # Interpret APDS9960 hardware gesture code into string command
        raw_gesture_code = telemetry["gesture"]
        interpreted_gesture = GestureInterpreter.interpret(raw_gesture_code)

        # Build telemetry update frame
        sse_payload = {
            "connected": True,
            "version": telemetry["version"],
            "arduino_time": telemetry["arduino_time"],
            "sequence": telemetry["sequence"],
            "status_flags": telemetry["status_flags"],
            "roll": telemetry["roll"],
            "pitch": telemetry["pitch"],
            "accel": telemetry["accel"],
            "gyro": telemetry["gyro"],
            "gesture": raw_gesture_code,
            "interpreted_gesture": interpreted_gesture,
            "proximity": telemetry["proximity"],
            "color": telemetry["color"],
            "timestamp": telemetry["timestamp"],
            "packet_loss_rate": telemetry["packet_loss_rate"]
        }
        
        yield f"event: telemetry\ndata: {json.dumps(sse_payload)}\n\n"

@app.route('/api/events')
def stream_events():
    """Exposes Server-Sent Events (SSE) telemetry connection endpoint."""
    return Response(
        generate_sse_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disables nginx buffering
            "Connection": "keep-alive"
        }
    )

if __name__ == '__main__':
    # Start serial background thread processing
    serial_worker.start_reading()
    
    try:
        Logger.info("Server", f"Starting Web App server on http://{Config.FLASK_HOST}:{Config.FLASK_PORT}...")
        app.run(
            host=Config.FLASK_HOST,
            port=Config.FLASK_PORT,
            debug=Config.DEBUG,
            use_reloader=False  # Avoid starting redundant reading threads on hot-reload
        )
    finally:
        # Assure serial release on shut down
        serial_worker.stop_reading()
        serial_worker.disconnect()
