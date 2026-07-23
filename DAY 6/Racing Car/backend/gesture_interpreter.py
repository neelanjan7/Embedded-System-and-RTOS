"""
gesture_interpreter.py
======================
Translates APDS9960 hardware gesture outputs into high-level game actions.

Author: Sagar Kumar
Date: 2026
"""

from typing import Dict

class GestureInterpreter:
    """Decodes integer codes from APDS9960 hardware gestures to simulator commands."""
    
    # Mapping matching the Arduino_APDS9960 library return values
    GESTURE_MAP: Dict[int, str] = {
        -1: "Normal",     # GESTURE_NONE
         0: "Boost",      # GESTURE_UP (Representing forward rocket boost)
         1: "Handbrake",  # GESTURE_DOWN (Representing emergency braking)
         2: "Drift Left", # GESTURE_LEFT (Representing sideways sliding)
         3: "Drift Right" # GESTURE_RIGHT (Representing sideways sliding)
    }

    @classmethod
    def interpret(cls, gesture_code: int) -> str:
        """Converts raw sensor values to descriptive game action labels.
        
        Args:
            gesture_code (int): Hardware return value code (-1, 0, 1, 2, 3).
            
        Returns:
            str: Game command label (e.g. "Normal", "Boost", "Handbrake", "Drift Left", "Drift Right").
        """
        return cls.GESTURE_MAP.get(gesture_code, "Normal")
