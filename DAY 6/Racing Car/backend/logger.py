"""
logger.py
=========
Simple, structured console logger utility for the simulator backend.

Author: Sagar Kumar
Date: 2026
"""

import time
from datetime import datetime

class Logger:
    """Standardized console logging helper with timestamp headers and severity levels."""
    
    @staticmethod
    def _get_timestamp() -> str:
        """Returns the current local formatted timestamp."""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

    @classmethod
    def info(cls, module: str, message: str) -> None:
        """Logs informational diagnostics."""
        print(f"[{cls._get_timestamp()}] [INFO] [{module}] {message}")

    @classmethod
    def warn(cls, module: str, message: str) -> None:
        """Logs system warnings."""
        print(f"[{cls._get_timestamp()}] [WARN] [{module}] {message}")

    @classmethod
    def error(cls, module: str, message: str) -> None:
        """Logs system failure events."""
        print(f"[{cls._get_timestamp()}] [ERROR] [{module}] {message}")

    @classmethod
    def debug(cls, module: str, message: str) -> None:
        """Logs fine-grained debugging details."""
        print(f"[{cls._get_timestamp()}] [DEBUG] [{module}] {message}")
