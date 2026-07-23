/**
 * @file connection.js
 * @brief Handles API network connections and real-time Server-Sent Events (SSE).
 * 
 * Defines wrappers around REST ports, connection routes, calibration offsets,
 * and maintains the EventSource listener loop for live telemetry updates.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class ServerConnection {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.activePort = null;
        this.isMockMode = false;
    }

    /**
     * @brief Queries available COM/serial ports from the server.
     * @returns {Promise<Array>} List of ports
     */
    async getAvailablePorts() {
        try {
            const response = await fetch(window.ClientConfig.API.PORTS);
            const result = await response.json();
            if (result.status === "success") {
                return result.ports;
            }
            return [];
        } catch (e) {
            console.error("[Connection] Failed to fetch serial ports: ", e);
            // Return local fallback list if server is offline
            return [
                { port: "MOCK_COM_PORT", description: "Software Emulator (MOCK_COM_PORT)", hwid: "MOCK_ID" }
            ];
        }
    }

    /**
     * @brief Initiates serial connection request to Flask backend.
     * @param {string} port Target port string
     * @param {number} baud Baud rate speed
     * @param {boolean} simMode Forces mock inputs simulation
     * @returns {Promise<boolean>} success flag
     */
    async connectSerial(port, baud, simMode) {
        if (simMode || port === "MOCK_COM_PORT") {
            this.isConnected = true;
            this.activePort = "MOCK_COM_PORT";
            this.isMockMode = true;
            return true;
        }

        try {
            const response = await fetch(window.ClientConfig.API.CONNECT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: port, baud: baud })
            });
            const result = await response.json();
            if (response.ok && result.status === "success") {
                this.isConnected = true;
                this.activePort = result.port;
                this.isMockMode = false;
                return true;
            }
            return false;
        } catch (e) {
            console.error("[Connection] Connect serial API request failed: ", e);
            return false;
        }
    }

    /**
     * @brief Disconnects active serial connection.
     * @returns {Promise<boolean>} success flag
     */
    async disconnectSerial() {
        if (this.isMockMode) {
            this.isConnected = false;
            this.activePort = null;
            this.isMockMode = false;
            this.stopTelemetryStream();
            return true;
        }

        try {
            const response = await fetch(window.ClientConfig.API.DISCONNECT, { method: 'POST' });
            const result = await response.json();
            if (response.ok && result.status === "success") {
                this.isConnected = false;
                this.activePort = null;
                this.stopTelemetryStream();
                return true;
            }
            return false;
        } catch (e) {
            console.error("[Connection] Disconnect serial API request failed: ", e);
            return false;
        }
    }

    /**
     * @brief Triggers sensor software calibration on the backend.
     * @returns {Promise<Object>} Offset parameters
     */
    async triggerCalibration() {
        if (this.isMockMode) {
            // Emulate delay and return
            await new Promise(r => setTimeout(r, 1000));
            return { roll: 0.0, pitch: 0.0 };
        }

        try {
            const response = await fetch(window.ClientConfig.API.CALIBRATE, { method: 'POST' });
            const result = await response.json();
            if (response.ok && result.status === "success") {
                return result.offsets;
            }
            throw new Error(result.message || "Calibration failed.");
        } catch (e) {
            console.error("[Connection] Calibration request failed: ", e);
            throw e;
        }
    }

    /**
     * @brief Starts real-time EventSource listener for Server-Sent Events.
     * @param {Function} onTelemetry Callback for roll/pitch data
     * @param {Function} onStatusChange Callback for system connectivity updates
     */
    startTelemetryStream(onTelemetry, onStatusChange) {
        this.stopTelemetryStream();

        if (this.isMockMode) {
            // Emulate SSE using local setInterval generator
            this.mockInterval = setInterval(() => {
                const now = Date.now();
                const roll = 15 * Math.sin(now * 0.001);
                const pitch = 10 * Math.cos(now * 0.0006);
                const data = {
                    connected: true,
                    version: 1,
                    arduino_time: now % 100000,
                    sequence: Math.floor(now / 100),
                    status_flags: 3,
                    roll: roll,
                    pitch: pitch,
                    accel: { x: 0.0, y: Math.sin(now * 0.001), z: 1.0 },
                    gyro: { x: 0.0, y: 0.0, z: 0.0 },
                    gesture: -1,
                    interpreted_gesture: "Normal",
                    proximity: 120 + Math.floor(20 * Math.sin(now * 0.002)),
                    color: { r: 120, g: 80, b: 240, c: 440 },
                    timestamp: now / 1000.0,
                    packet_loss_rate: 0.0
                };
                if (onTelemetry) onTelemetry(data);
            }, 100);
            
            if (onStatusChange) onStatusChange(true);
            return;
        }

        console.log("[Connection] Establishing Server-Sent Events (SSE) listener...");
        this.eventSource = new EventSource(window.ClientConfig.API.EVENTS);

        this.eventSource.addEventListener('telemetry', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (onTelemetry) {
                    onTelemetry(data);
                }
            } catch (e) {
                console.error("[Connection] Error parsing SSE telemetry: ", e);
            }
        });

        this.eventSource.addEventListener('system_status', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.isConnected = data.connected;
                if (onStatusChange) {
                    onStatusChange(data.connected);
                }
            } catch (e) {
                console.error("[Connection] Error parsing SSE status: ", e);
            }
        });

        this.eventSource.onerror = (error) => {
            console.error("[Connection] SSE event stream error: ", error);
            this.isConnected = false;
            if (onStatusChange) {
                onStatusChange(false);
            }
        };
    }

    /**
     * @brief Halts EventSource listener.
     */
    stopTelemetryStream() {
        if (this.mockInterval) {
            clearInterval(this.mockInterval);
            this.mockInterval = null;
            console.log("[Connection] Mock interval generator stopped.");
        }
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log("[Connection] EventSource listener closed.");
        }
    }
}

window.ServerConnection = ServerConnection;
