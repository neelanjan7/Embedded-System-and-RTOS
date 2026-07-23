"""
test_backend.py
===============
Unit tests for checking backend packet parsing, CRC-8 validation, 
telemetry state updates, and gesture interpreter functionality.

Author: Sagar Kumar
Date: 2026
"""

import unittest
import sys
import os

# Ensure parent directory is in the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from packet_parser import PacketParser
from telemetry_manager import TelemetryManager
from gesture_interpreter import GestureInterpreter

class TestPacketParser(unittest.TestCase):
    def setUp(self):
        self.parser = PacketParser()

    def test_crc8_calculation(self):
        """Tests that CRC-8 calculates correctly according to Dallas/Maxim polynomial."""
        # Simple test strings
        self.assertEqual(self.parser.calculate_crc8("IMU,1,2000,5,3"), 0xD3)
        self.assertEqual(self.parser.calculate_crc8("HBT,1,3000,12,3"), 0x3C)

    def test_parse_valid_imu_packet(self):
        """Verifies parsing of valid, checksummed IMU telemetry packets."""
        # Sample CSV: IMU,version,millis,seq,status,roll,pitch,ax,ay,az,gx,gy,gz,gesture,proximity,r,g,b,c
        payload = "IMU,1,1000,42,3,-12.50,5.20,0.010,-0.080,0.990,1.20,-0.40,15.80,0,150,200,150,150,500"
        crc = self.parser.calculate_crc8(payload)
        packet_bytes = f"${payload}*{crc:02X}\r\n".encode('ascii')
        
        header, values = self.parser.parse(packet_bytes)
        self.assertEqual(header, "IMU")
        self.assertEqual(values[0], 1)       # version
        self.assertEqual(values[1], 1000)    # millis
        self.assertEqual(values[2], 42)      # seq
        self.assertEqual(values[3], 3)       # status flags
        self.assertEqual(values[4], -12.5)   # roll
        self.assertEqual(values[5], 5.2)    # pitch
        self.assertEqual(values[12], 0)      # gesture (0 = UP)
        self.assertEqual(values[13], 150)    # proximity
        self.assertEqual(values[17], 500)    # c (clear color)

    def test_parse_valid_heartbeat_packet(self):
        """Verifies parsing of valid, checksummed Heartbeat signals."""
        payload = "HBT,1,5000,99,3"
        crc = self.parser.calculate_crc8(payload)
        packet_bytes = f"${payload}*{crc:02X}\r\n".encode('ascii')
        
        header, values = self.parser.parse(packet_bytes)
        self.assertEqual(header, "HBT")
        self.assertEqual(values[0], 1)
        self.assertEqual(values[1], 5000)
        self.assertEqual(values[2], 99)
        self.assertEqual(values[3], 3)

    def test_parse_invalid_crc_packet(self):
        """Ensures parser rejects data with corrupted or mismatched CRCs."""
        payload = "HBT,1,5000,99,3"
        # Force a corrupt CRC string
        packet_bytes = f"${payload}*FF\r\n".encode('ascii')
        
        parsed = self.parser.parse(packet_bytes)
        self.assertIsNone(parsed)

    def test_parse_malformed_packet(self):
        """Ensures parser rejects structural anomalies and missing delimiters."""
        self.assertIsNone(self.parser.parse(b"IMU,1,2,3,4"))
        self.assertIsNone(self.parser.parse(b"$IMU,1,2,3,4"))
        self.assertIsNone(self.parser.parse(b"IMU,1,2,3,4*00"))

class TestTelemetryManager(unittest.TestCase):
    def setUp(self):
        self.telemetry = TelemetryManager()

    def test_telemetry_updates_and_offsets(self):
        """Tests that telemetry values are saved and software offsets calibrate correctly."""
        # version,millis,seq,status,roll,pitch,ax,ay,az,gx,gy,gz,gesture,proximity,r,g,b,c
        parsed_imu_values = [
            1, 2500, 10, 3, 
            15.5, -10.2, 
            0.1, -0.2, 0.9, 1.5, -2.2, 10.5, 
            -1, 0, 10, 20, 30, 40
        ]
        
        self.telemetry.update_telemetry(parsed_imu_values)
        snapshot = self.telemetry.get_snapshot()
        
        self.assertTrue(snapshot["connected"])
        self.assertEqual(snapshot["roll"], 15.5)
        self.assertEqual(snapshot["pitch"], -10.2)
        self.assertEqual(snapshot["packet_loss_rate"], 0.0)

        # Trigger software calibration offset lock
        self.telemetry.calibrate()
        self.assertTrue(self.telemetry.is_calibrated)
        self.assertEqual(self.telemetry.roll_offset, 15.5)
        self.assertEqual(self.telemetry.pitch_offset, -10.2)

        # Submit next frame, check offset deduction (should map back to neutral 0,0)
        self.telemetry.update_telemetry(parsed_imu_values)
        next_snapshot = self.telemetry.get_snapshot()
        self.assertEqual(next_snapshot["roll"], 0.0)
        self.assertEqual(next_snapshot["pitch"], 0.0)

    def test_packet_loss_calculations(self):
        """Tests packet sequence checks and rolling packet loss rate math."""
        # 1st packet: seq = 1
        self.telemetry.update_telemetry([1, 100, 1, 3, 0.0, 0.0, 0,0,1, 0,0,0, -1, 0, 0,0,0,0])
        # 2nd packet: seq = 4 (skips 2 and 3 = 2 lost packets)
        self.telemetry.update_telemetry([1, 300, 4, 3, 0.0, 0.0, 0,0,1, 0,0,0, -1, 0, 0,0,0,0])
        
        snapshot = self.telemetry.get_snapshot()
        self.assertEqual(self.telemetry.sequence_skips, 2)
        # Expected total packets = 2 received + 2 skipped = 4. Loss rate = 2 / 4 = 50% (0.5)
        self.assertEqual(snapshot["packet_loss_rate"], 0.5)

class TestGestureInterpreter(unittest.TestCase):
    def test_gesture_mappings(self):
        """Checks integer codes mapping to standard game label commands."""
        self.assertEqual(GestureInterpreter.interpret(-1), "Normal")
        self.assertEqual(GestureInterpreter.interpret(0), "Boost")
        self.assertEqual(GestureInterpreter.interpret(1), "Handbrake")
        self.assertEqual(GestureInterpreter.interpret(2), "Drift Left")
        self.assertEqual(GestureInterpreter.interpret(3), "Drift Right")
        # Test default fallback for unknown codes
        self.assertEqual(GestureInterpreter.interpret(99), "Normal")

if __name__ == '__main__':
    unittest.main()
