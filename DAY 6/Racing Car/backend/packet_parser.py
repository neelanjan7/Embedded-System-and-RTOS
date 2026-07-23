"""
packet_parser.py
================
Decodes raw bytes from serial ports and validates structural CRC-8 check blocks.

Author: Sagar Kumar
Date: 2026
"""

from typing import Optional, Tuple, List, Any
from logger import Logger

class PacketParser:
    """Decodes, splits, and verifies incoming communication data packets."""
    
    def __init__(self):
        """Initializes packet states and precomputes the CRC-8 table."""
        self.crc_table = self._precompute_crc_table()

    def _precompute_crc_table(self) -> List[int]:
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

    def calculate_crc8(self, data_str: str) -> int:
        """Calculates 8-bit Dallas/Maxim checksum over characters.
        
        Args:
            data_str (str): CSV string elements.
            
        Returns:
            int: 8-bit CRC code.
        """
        crc = 0x00
        for char in data_str:
            crc = self.crc_table[crc ^ ord(char)]
        return crc

    def parse(self, raw_bytes: bytes) -> Optional[Tuple[str, List[Any]]]:
        """Parses and validates a raw byte packet from the serial stream.
        
        Args:
            raw_bytes (bytes): Raw line from serial.
            
        Returns:
            Optional[Tuple[str, List[Any]]]: Packet header and parsed values.
        """
        try:
            line = raw_bytes.decode('ascii', errors='ignore').strip()
            if not line.startswith('$') or '*' not in line:
                return None
                
            parts = line[1:].split('*')
            if len(parts) != 2:
                return None
                
            payload, hex_crc = parts
            
            # Verify checksum integrity
            try:
                expected_crc = int(hex_crc, 16)
            except ValueError:
                Logger.warn("Parser", f"Invalid CRC hexadecimal format: {hex_crc}")
                return None
                
            calculated_crc = self.calculate_crc8(payload)
            if calculated_crc != expected_crc:
                Logger.warn("Parser", f"CRC Error! Expected: {expected_crc:02X}, Calculated: {calculated_crc:02X}")
                return None
                
            tokens = payload.split(',')
            if not tokens:
                return None
                
            header = tokens[0]
            values = tokens[1:]
            
            # Type-cast standard values according to header structures
            if header == "IMU":
                return header, self._cast_imu(values)
            elif header == "HBT":
                return header, self._cast_heartbeat(values)
            elif header == "ERR":
                return header, values
                
            return header, values
        except Exception as e:
            Logger.error("Parser", f"Exception parsing packet: {e}")
            return None

    def _cast_imu(self, tokens: List[str]) -> List[Any]:
        """Casts IMU telemetry tokens to proper numerical formats.
        Format: version,millis,seq,status,roll,pitch,ax,ay,az,gx,gy,gz,gesture,proximity,r,g,b,c
        """
        if len(tokens) < 18:
            raise ValueError(f"Telemetry packet too short: length {len(tokens)}")
            
        return [
            int(tokens[0]),       # version
            int(tokens[1]),       # millis
            int(tokens[2]),       # seq
            int(tokens[3]),       # status flags
            float(tokens[4]),     # roll
            float(tokens[5]),     # pitch
            float(tokens[6]),     # ax
            float(tokens[7]),     # ay
            float(tokens[8]),     # az
            float(tokens[9]),     # gx
            float(tokens[10]),    # gy
            float(tokens[11]),    # gz
            int(tokens[12]),      # gesture
            int(tokens[13]),      # proximity
            int(tokens[14]),      # r
            int(tokens[15]),      # g
            int(tokens[16]),      # b
            int(tokens[17])       # c
        ]

    def _cast_heartbeat(self, tokens: List[str]) -> List[Any]:
        """Casts heartbeat tokens.
        Format: version,millis,seq,status
        """
        if len(tokens) < 4:
            raise ValueError("Heartbeat packet too short")
        return [
            int(tokens[0]),  # version
            int(tokens[1]),  # millis
            int(tokens[2]),  # seq
            int(tokens[3])   # status flags
        ]
