"""
mock_serial.py
==============
Emulates serial hardware transmission by generating sinusoidal telemetry signals
and mock gestures for testing environments without an attached microcontroller.

Author: Sagar Kumar
Date: 2026
"""

import time
import math
import random

class MockSerial:
    """Mock interface class mimicking the API signatures of a pySerial object.
    Supports versioning, sequence tracking, status flags, and CRC-8 calculation.
    """
    def __init__(self, port: str, baudrate: int, timeout: float = 1.0):
        """Initializes mock attributes.
        
        Args:
            port (str): Mock port name.
            baudrate (int): Speed parameters.
            timeout (float): Connection block timeout.
        """
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.is_open = True
        self.start_time = time.time()
        self.sequence_num = 0
        self.last_transmit_time = 0.0
        self.last_heartbeat_time = 0.0
        
        # Dallas/Maxim CRC-8 table for fast computation
        self.crc_table = self._precompute_crc_table()

    def _precompute_crc_table(self) -> list:
        """Precomputes Dallas/Maxim CRC-8 table (polynomial = 0x07)."""
        table = []
        for i in range(256):
            crc = i
            for _ in range(8):
                if crc & 0x80:
                    crc = ((crc << 1) ^ 0x07) & 0xFF
                else:
                    crc = (crc << 1) & 0xFF
            table.append(crc)
        return table

    def open(self) -> None:
        """Sets internal state to open."""
        self.is_open = True
        self.start_time = time.time()

    def close(self) -> None:
        """Sets internal state to closed."""
        self.is_open = False

    def readline(self) -> bytes:
        """Generates dynamic telemetry data packet as bytes.
        Calculates realistic mock roll and pitch patterns with check values.
        
        Returns:
            bytes: Valid formatted serial packet matching communication specs.
        """
        if not self.is_open:
            raise ValueError("Serial port is closed.")
            
        time.sleep(0.01)  # Minimal sleep to avoid CPU thrashing in read loop
        
        current_time = time.time()
        elapsed_ms = int((current_time - self.start_time) * 1000)
        
        # Check heartbeat packet timing (1 Hz)
        if current_time - self.last_heartbeat_time >= 1.0:
            self.last_heartbeat_time = current_time
            payload = f"HBT,1,{elapsed_ms},{self.sequence_num},3"
            crc = self._calculate_crc8(payload)
            packet = f"${payload}*{crc:02X}\r\n"
            return packet.encode('ascii')
            
        # Check data packet timing (10 Hz = 100 ms)
        if current_time - self.last_transmit_time >= 0.1:
            self.last_transmit_time = current_time
            self.sequence_num += 1
            
            # Generate sinusoidal paths to simulate tilt controls
            t = current_time - self.start_time
            roll = 15.0 * math.sin(t * 0.5)      # Steering tilt
            pitch = 10.0 * math.cos(t * 0.3)     # Throttle tilt
            
            # Simulated raw sensor components
            ax = -math.sin(pitch * math.pi / 180.0)
            ay = math.sin(roll * math.pi / 180.0)
            az = math.cos(roll * math.pi / 180.0) * math.cos(pitch * math.pi / 180.0)
            
            gx = 0.5 * math.cos(t * 0.5)
            gy = -0.3 * math.sin(t * 0.3)
            gz = 0.05 * math.cos(t * 1.2)
            
            # Occasional simulated gestures: UP (0), DOWN (1), LEFT (2), RIGHT (3), NONE (-1)
            gesture = -1
            if random.random() < 0.05:
                gesture = random.choice([0, 1, 2, 3])
                
            proximity = int(20 + 10 * math.sin(t * 0.8)) if gesture != -1 else 0
            
            # Color variables (Clear, Red, Green, Blue)
            c = int(500 + 100 * math.sin(t))
            r = int(c * 0.4)
            g = int(c * 0.3)
            b = int(c * 0.3)
            
            # CSV schema: IMU,version,millis,seq,status,roll,pitch,ax,ay,az,gx,gy,gz,gesture,proximity,r,g,b,c
            payload = (
                f"IMU,1,{elapsed_ms},{self.sequence_num},3,"
                f"{roll:.2f},{pitch:.2f},{ax:.3f},{ay:.3f},{az:.3f},"
                f"{gx:.2f},{gy:.2f},{gz:.2f},{gesture},{proximity},{r},{g},{b},{c}"
            )
            
            crc = self._calculate_crc8(payload)
            packet = f"${payload}*{crc:02X}\r\n"
            return packet.encode('ascii')
            
        return b""

    def write(self, data: bytes) -> int:
        """Processes incoming requests sent to the mock device.
        
        Args:
            data (bytes): Input command.
            
        Returns:
            int: Number of bytes processed.
        """
        if not self.is_open:
            raise ValueError("Serial port is closed.")
        return len(data)

    def _calculate_crc8(self, data_str: str) -> int:
        """Calculates Dallas/Maxim CRC-8 checksum over the given payload.
        
        Args:
            data_str (str): Input csv telemetry payload.
            
        Returns:
            int: Calculated 8-bit checksum.
        """
        crc = 0x00
        for char in data_str:
            data_byte = ord(char)
            crc = self.crc_table[crc ^ data_byte]
        return crc
