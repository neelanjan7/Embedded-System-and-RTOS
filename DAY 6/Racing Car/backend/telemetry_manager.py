"""
telemetry_manager.py
====================
Thread-safe controller storing runtime metrics, offsets, and connection states.

Author: Sagar Kumar
Date: 2026
"""

import threading
import time
from typing import Dict, Any, Tuple, Optional

class TelemetryManager:
    """Manages the current operational telemetry state, applies software 
    calibration, and computes packet loss statistics.
    """
    
    def __init__(self):
        self.lock = threading.Lock()
        
        # Diagnostics
        self.packet_count = 0
        self.crc_errors = 0
        self.last_sequence_num: Optional[int] = None
        self.sequence_skips = 0
        
        # Software Calibration Offsets
        self.roll_offset = 0.0
        self.pitch_offset = 0.0
        self.is_calibrated = False

        # Central State Database
        self.state: Dict[str, Any] = {
            "connected": False,
            "version": 1,
            "arduino_time": 0,
            "sequence": 0,
            "status_flags": 0,
            "roll": 0.0,
            "pitch": 0.0,
            "accel": {"x": 0.0, "y": 0.0, "z": 0.0},
            "gyro": {"x": 0.0, "y": 0.0, "z": 0.0},
            "gesture": -1,
            "proximity": 0,
            "color": {"r": 0, "g": 0, "b": 0, "c": 0},
            "timestamp": 0.0,
            "packet_loss_rate": 0.0
        }

    def set_connected(self, connected: bool) -> None:
        """Sets the system hardware connection flag."""
        with self.lock:
            self.state["connected"] = connected

    def record_crc_error(self) -> None:
        """Increments the CRC checksum error counter."""
        with self.lock:
            self.crc_errors += 1

    def update_telemetry(self, values: list) -> None:
        """Decodes and applies sensor calibration offsets to IMU values.
        
        Args:
            values (list): Parsed token components list.
        """
        with self.lock:
            self.packet_count += 1
            
            version = values[0]
            arduino_time = values[1]
            seq = values[2]
            status = values[3]
            
            raw_roll = values[4]
            raw_pitch = values[5]
            
            ax, ay, az = values[6], values[7], values[8]
            gx, gy, gz = values[9], values[10], values[11]
            
            gesture = values[12]
            proximity = values[13]
            r, g, b, c = values[14], values[15], values[16], values[17]

            # Sequence validation for packet loss monitoring
            if self.last_sequence_num is not None:
                expected_seq = self.last_sequence_num + 1
                if seq > expected_seq:
                    self.sequence_skips += (seq - expected_seq)
            self.last_sequence_num = seq

            # Calculate packet loss rate
            loss_rate = 0.0
            total_expected_packets = self.packet_count + self.sequence_skips
            if total_expected_packets > 0:
                loss_rate = self.sequence_skips / total_expected_packets

            # Apply software offsets
            calibrated_roll = raw_roll - self.roll_offset
            calibrated_pitch = raw_pitch - self.pitch_offset

            # Keep angles in range bounds
            calibrated_roll = max(-180.0, min(180.0, calibrated_roll))
            calibrated_pitch = max(-90.0, min(90.0, calibrated_pitch))

            # Store in unified state database
            self.state.update({
                "connected": True,
                "version": version,
                "arduino_time": arduino_time,
                "sequence": seq,
                "status_flags": status,
                "roll": round(calibrated_roll, 2),
                "pitch": round(calibrated_pitch, 2),
                "accel": {"x": ax, "y": ay, "z": az},
                "gyro": {"x": gx, "y": gy, "z": gz},
                "gesture": gesture,
                "proximity": proximity,
                "color": {"r": r, "g": g, "b": b, "c": c},
                "timestamp": time.time(),
                "packet_loss_rate": round(loss_rate, 4)
            })

    def update_heartbeat(self, values: list) -> None:
        """Updates connection variables from heartbeat signals.
        
        Args:
            values (list): Parsed token components list.
        """
        with self.lock:
            version = values[0]
            arduino_time = values[1]
            seq = values[2]
            status = values[3]
            
            # Simple connection update
            self.state.update({
                "connected": True,
                "version": version,
                "arduino_time": arduino_time,
                "sequence": seq,
                "status_flags": status,
                "timestamp": time.time()
            })

    def calibrate(self) -> Tuple[float, float]:
        """Locks current roll and pitch raw values as software-level calibration offsets.
        
        Returns:
            Tuple[float, float]: Offset angles (roll, pitch).
        """
        with self.lock:
            self.roll_offset = self.state["roll"] + self.roll_offset
            self.pitch_offset = self.state["pitch"] + self.pitch_offset
            self.is_calibrated = True
            return self.roll_offset, self.pitch_offset

    def get_snapshot(self) -> Dict[str, Any]:
        """Returns a copy of the current state mapping."""
        with self.lock:
            return dict(self.state)
