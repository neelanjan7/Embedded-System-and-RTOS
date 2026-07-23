"""
serial_processor.py
===================
Background worker thread reading, parsing, and validating incoming serial telemetry.
Utilizes PacketParser for CRC validation, TelemetryManager for state retention,
and Logger for modular logging.

Author: Sagar Kumar
Date: 2026
"""

import threading
import time
import serial
import serial.tools.list_ports
from typing import Dict, List, Optional, Tuple, Any

from mock_serial import MockSerial
from logger import Logger
from packet_parser import PacketParser
from telemetry_manager import TelemetryManager

class SerialProcessor:
    """Manages serial port lifecycle, executes reading threads, and handles reconnects.
    Delegates parsing to PacketParser and state storage to TelemetryManager.
    """
    def __init__(self, baud_rate: int = 115200, mock_mode: bool = False):
        """Initializes settings, instantiates helper modules, and setups variables.
        
        Args:
            baud_rate (int): Serial speed.
            mock_mode (bool): Run software mock telemetry if True.
        """
        self.baud_rate = baud_rate
        self.mock_mode = mock_mode
        self.active_port: Optional[str] = None
        self.serial_conn: Optional[Any] = None
        
        self.thread: Optional[threading.Thread] = None
        self.running = False
        self.lock = threading.Lock()
        
        # Subsystems delegation
        self.parser = PacketParser()
        self.telemetry = TelemetryManager()
        
        self.last_packet_time = 0.0

    @staticmethod
    def list_available_ports() -> List[Dict[str, str]]:
        """Scans host system to locate open serial terminals.
        
        Returns:
            List[Dict[str, str]]: Details of detected hardware COM ports.
        """
        ports = serial.tools.list_ports.comports()
        ports_list = []
        for p in ports:
            ports_list.append({
                "port": p.device,
                "description": p.description,
                "hwid": p.hwid
            })
        return ports_list

    def connect(self, port_name: str) -> bool:
        """Establishes link with target COM interface.
        
        Args:
            port_name (str): Address name of the serial terminal.
            
        Returns:
            bool: True if connection succeeded.
        """
        self.disconnect()
        
        with self.lock:
            self.active_port = port_name
            try:
                if self.mock_mode or port_name == "MOCK_COM_PORT":
                    Logger.info("Serial", f"Initializing emulation link on {port_name}...")
                    self.serial_conn = MockSerial(port_name, self.baud_rate, timeout=1.0)
                    self.telemetry.set_connected(True)
                    self.last_packet_time = time.time()
                    return True
                
                Logger.info("Serial", f"Initializing hardware link on {port_name}...")
                self.serial_conn = serial.Serial(port_name, self.baud_rate, timeout=1.0)
                self.serial_conn.reset_input_buffer()
                self.telemetry.set_connected(True)
                self.last_packet_time = time.time()
                Logger.info("Serial", f"Hardware connection established on port {port_name}")
                return True
            except Exception as e:
                Logger.error("Serial", f"Connection failed to port {port_name}: {e}")
                self.serial_conn = None
                self.active_port = None
                self.telemetry.set_connected(False)
                return False

    def disconnect(self) -> None:
        """Disconnects serial port and sets status flag."""
        with self.lock:
            if self.serial_conn:
                try:
                    self.serial_conn.close()
                    Logger.info("Serial", f"Released port {self.active_port}")
                except Exception as e:
                    Logger.error("Serial", f"Error closing active port: {e}")
                self.serial_conn = None
            self.active_port = None
            self.telemetry.set_connected(False)

    def start_reading(self) -> None:
        """Launches the background serial processor thread."""
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        Logger.info("Serial", "Background reading thread started.")

    def stop_reading(self) -> None:
        """Halts background loop execution."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
            self.thread = None
        Logger.info("Serial", "Background reading thread stopped.")

    def _read_loop(self) -> None:
        """Background loop reading, routing, and processing lines."""
        while self.running:
            conn = self.serial_conn
            if conn is None:
                time.sleep(0.1)
                continue
                
            try:
                raw_line = conn.readline()
                if not raw_line:
                    # Connection Timeout checks
                    if time.time() - self.last_packet_time > 3.0:
                        Logger.warn("Serial", "No data packets received for 3 seconds. Attempting reconnect...")
                        self._handle_reconnect()
                    continue
                    
                parsed_packet = self.parser.parse(raw_line)
                if parsed_packet is None:
                    # CRC error logging
                    self.telemetry.record_crc_error()
                    continue
                    
                self.last_packet_time = time.time()
                header, values = parsed_packet
                
                # Update telemetry states
                if header == "IMU":
                    self.telemetry.update_telemetry(values)
                elif header == "HBT":
                    self.telemetry.update_heartbeat(values)
                elif header == "ERR":
                    Logger.error("Arduino", f"Received Hardware Error: {','.join(values)}")
                    
            except Exception as e:
                Logger.error("Serial", f"Exception in reading loop: {e}")
                self._handle_reconnect()

    def _handle_reconnect(self) -> None:
        """Closes connection, blocks thread, and loops until serial link returns."""
        port = self.active_port
        if not port:
            return
            
        self.disconnect()
        
        while self.running and not self.telemetry.get_snapshot()["connected"]:
            Logger.warn("Serial", f"Auto-reconnection loop: Retrying port {port} in 2 seconds...")
            time.sleep(2.0)
            if self.connect(port):
                break

    def calibrate(self) -> Tuple[float, float]:
        """Runs sensor calibration alignment.
        
        Returns:
            Tuple[float, float]: Updated offsets (roll, pitch).
        """
        offsets = self.telemetry.calibrate()
        Logger.info("Calibration", f"offsets calibrated -> roll offset: {offsets[0]:.2f}, pitch offset: {offsets[1]:.2f}")
        return offsets

    def get_telemetry(self) -> Dict[str, Any]:
        """Thread-safe snapshot getter of telemetry values.
        
        Returns:
            Dict: State database fields mapping.
        """
        return self.telemetry.get_snapshot()
