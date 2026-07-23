/**
 * @file controls.js
 * @brief Input controller for keyboard, Arduino, and simulation controls.
 * 
 * Normalizes all steering, throttle, braking, handbrake, and boost inputs
 * into a single unified driver interface.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class Controls {
    constructor() {
        // Normalized driver outputs
        this.steer = 0.0;     // -1.0 (Left) to 1.0 (Right)
        this.throttle = 0.0;  // 0.0 to 1.0
        this.brake = 0.0;     // 0.0 to 1.0
        this.boost = false;   // Active Nitro flag
        this.handbrake = false; // Active Handbrake flag

        // Keyboard keys tracking
        this.keys = {
            ArrowUp: false,    KeyW: false,
            ArrowDown: false,  KeyS: false,
            ArrowLeft: false,  KeyA: false,
            ArrowRight: false, KeyD: false,
            Space: false,
            ShiftLeft: false,  KeyB: false
        };

        // Arduino/Telemetry inputs
        this.arduinoData = {
            roll: 0.0,
            pitch: 0.0,
            gesture: -1,
            interpreted_gesture: "Normal",
            isActive: false
        };

        this._setupKeyboardListeners();
    }

    /**
     * @brief Hooks keyboard keydown and keyup events.
     * @private
     */
    _setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.code in this.keys) {
                this.keys[e.code] = true;
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code in this.keys) {
                this.keys[e.code] = false;
                e.preventDefault();
            }
        });
    }

    /**
     * @brief Integrates incoming telemetry packets from Server-Sent Events.
     * @param {Object} data Decoded telemetry payload
     */
    handleArduinoTelemetry(data) {
        this.arduinoData.roll = data.roll;
        this.arduinoData.pitch = data.pitch;
        this.arduinoData.gesture = data.gesture;
        this.arduinoData.interpreted_gesture = data.interpreted_gesture;
        this.arduinoData.isActive = true;
    }

    /**
     * @brief Drops active Arduino state flag (upon disconnects).
     */
    setArduinoInactive() {
        this.arduinoData.isActive = false;
    }

    /**
     * @brief Merges keyboard, Arduino, and simulation controls, writing values to variables.
     * @param {Object} settings Current simulator deadzone settings
     * @param {boolean} isSimulationMode If active, uses simulation updates
     */
    update(settings, isSimulationMode) {
        // Reset controls
        this.steer = 0.0;
        this.throttle = 0.0;
        this.brake = 0.0;
        this.boost = false;
        this.handbrake = false;

        // A. Priority 1: Hardware Arduino Telemetry Controls
        if (this.arduinoData.isActive && !isSimulationMode) {
            // Steering tilt calculations
            const rollLimit = window.ClientConfig.DEFAULTS.pitchLimit + 5.0; // scale dynamically
            if (Math.abs(this.arduinoData.roll) > settings.steerDeadzone) {
                this.steer = this.arduinoData.roll / settings.pitchLimit; // map angle
                this.steer = Math.max(-1.0, Math.min(1.0, this.steer));
            }

            // Gas/Brake tilt calculations
            const deadzone = 5.0;
            const pitchLimit = settings.pitchLimit;
            
            if (this.arduinoData.pitch > deadzone) {
                this.throttle = (this.arduinoData.pitch - deadzone) / (pitchLimit - deadzone);
                this.throttle = Math.max(0.0, Math.min(1.0, this.throttle));
            } else if (this.arduinoData.pitch < -deadzone) {
                this.brake = (-this.arduinoData.pitch - deadzone) / (pitchLimit - deadzone);
                this.brake = Math.max(0.0, Math.min(1.0, this.brake));
            }

            // Gesture actions mapping
            if (this.arduinoData.interpreted_gesture === "Boost") {
                this.boost = true;
            } else if (this.arduinoData.interpreted_gesture === "Handbrake") {
                this.handbrake = true;
            }
        } 
        // B. Priority 2: Keyboard fallbacks
        else {
            // Steer Left / Right
            if (this.keys.ArrowLeft || this.keys.KeyA) this.steer = -1.0;
            if (this.keys.ArrowRight || this.keys.KeyD) this.steer = 1.0;

            // Accelerate
            if (this.keys.ArrowUp || this.keys.KeyW) this.throttle = 1.0;

            // Brake
            if (this.keys.ArrowDown || this.keys.KeyS) this.brake = 1.0;

            // Handbrake
            if (this.keys.Space) this.handbrake = true;

            // Boost
            if (this.keys.ShiftLeft || this.keys.KeyB) this.boost = true;
        }
    }
}

window.Controls = Controls;
