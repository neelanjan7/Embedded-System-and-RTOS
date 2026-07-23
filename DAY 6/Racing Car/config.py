import os

class Config:
    """Master configuration class for the AI Motion Controlled Racing Simulator.
    Contains configurations for Flask, Serial Communication, AI Model, and Game Settings.
    """
    # Flask Server Settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_key_for_racing_simulator_2026')
    FLASK_HOST = os.environ.get('FLASK_HOST', '127.0.0.1')
    FLASK_PORT = int(os.environ.get('FLASK_PORT', 5000))
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')

    # Serial Port Settings
    DEFAULT_BAUD_RATE = 115200
    SERIAL_TIMEOUT = 1.0  # seconds
    
    # Auto-detect triggers for Arduino Nano 33 BLE Sense
    ARDUINO_VID = 0x2341  # Arduino LLC
    ARDUINO_PID = 0x005a  # Nano 33 BLE
    
    # Mock Mode (runs simulation if hardware is not connected)
    MOCK_SERIAL = os.environ.get('MOCK_SERIAL', 'False').lower() in ('true', '1', 't')
    MOCK_PORT_NAME = "MOCK_COM_PORT"

    # Sensor Filtering and Processing
    FILTER_ALPHA = 0.98  # Complementary filter weight (gyro vs accel)
    ACCEL_SENSITIVITY = 1.0
    GYRO_SENSITIVITY = 1.0


    # Game Physics Constraints
    GAME_LOOP_FREQUENCY_HZ = 60.0
    MAX_STEERING_ANGLE_RAD = 0.6  # approx 35 degrees
    MAX_SPEED_PX_SEC = 600.0      # Canvas pixels per second
