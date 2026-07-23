/**
 * @file traffic_vehicle.js
 * @brief Individual AI Traffic Vehicle state.
 * 
 * Simulates random lane selection, variable speeds, lane changes,
 * and adaptive braking when following slower lead vehicles.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class TrafficVehicle {
    /**
     * @brief Constructor for the traffic vehicle.
     * @param {number} startX Horizontal offset (-1.0 to 1.0)
     * @param {number} startZ Distance along road
     * @param {string} type Sedan, SUV, Sports Car, Truck, Bus, Police Car, Ambulance
     * @param {number} baseSpeed Initial velocity (units/s)
     * @param {string} color Custom paint hex color
     */
    constructor(startX, startZ, type, baseSpeed, color) {
        this.x = startX;
        this.z = startZ;
        this.type = type;
        this.speed = baseSpeed;
        this.baseSpeed = baseSpeed;
        this.color = color || '#3b82f6';
        
        // Dimensions
        this.width = 110;
        this.height = 55;
        this._configureDimensions();

        // Control states
        this.isBraking = false;
        this.targetX = startX;
        this.laneChangeTimer = Math.random() * 8 + 4; // lane changes every 4-12 seconds
    }

    /**
     * @brief Adjusts drawing size markers based on vehicle classification.
     * @private
     */
    _configureDimensions() {
        switch (this.type) {
            case "Truck":
                this.width = 130;
                this.height = 100;
                break;
            case "Bus":
                this.width = 135;
                this.height = 95;
                break;
            case "SUV":
                this.width = 120;
                this.height = 70;
                break;
            case "Sports Car":
                this.width = 115;
                this.height = 50;
                break;
            case "Police Car":
            case "Ambulance":
                this.width = 118;
                this.height = 62;
                break;
            default: // Sedan
                this.width = 110;
                this.height = 55;
                break;
        }
    }

    /**
     * @brief Computes Z scrolling, steering lane-changes, and adaptive braking.
     * @param {number} dt Time step in seconds
     * @param {Array<TrafficVehicle>} allVehicles Reference to other traffic units
     */
    update(dt, allVehicles) {
        if (dt <= 0) return;

        // 1. Adaptive Speed Control: Check for slower lead cars in same lane
        const leadVehicle = this._findLeadVehicle(allVehicles);
        
        if (leadVehicle) {
            const distance = leadVehicle.z - this.z;
            
            if (distance < 1200) {
                // Too close! Brake and decelerate to match speed
                this.isBraking = true;
                this.speed = this.speed + (leadVehicle.speed * 0.95 - this.speed) * 4.0 * dt;
                
                // Trigger lane change decision early
                this.laneChangeTimer -= dt * 2.0;
            } else {
                this.isBraking = false;
                // Accelerate back to base speed
                this.speed = this.speed + (this.baseSpeed - this.speed) * 1.5 * dt;
            }
        } else {
            this.isBraking = false;
            this.speed = this.speed + (this.baseSpeed - this.speed) * 1.5 * dt;
        }

        // 2. Horizontal Lane Interpolations
        if (Math.abs(this.x - this.targetX) > 0.02) {
            // Smoothly steer toward target lane center
            this.x = this.x + (this.targetX - this.x) * 2.5 * dt;
        }

        // 3. Lane Change Timer ticks
        this.laneChangeTimer -= dt;
        if (this.laneChangeTimer <= 0) {
            this.laneChangeTimer = Math.random() * 10 + 6;
            this._decideLaneChange(allVehicles);
        }

        // 4. Update Z coordinate progress
        this.z += this.speed * dt;
    }

    /**
     * @brief Locates the nearest forward vehicle in the same lateral path.
     * @private
     */
    _findLeadVehicle(allVehicles) {
        let closestLead = null;
        let minDistance = Infinity;

        allVehicles.forEach(other => {
            if (other === this) return;
            
            // Check if vehicle is ahead and shares similar lateral X bounds
            if (other.z > this.z && Math.abs(other.x - this.x) < 0.25) {
                const distance = other.z - this.z;
                if (distance < minDistance) {
                    minDistance = distance;
                    closestLead = other;
                }
            }
        });

        return closestLead;
    }

    /**
     * @brief Decides smooth horizontal lane changes if lanes are open.
     * @private
     */
    _decideLaneChange(allVehicles) {
        // Lanes coordinate positions: Left (-0.6), Middle (0.0), Right (0.6)
        const lanes = [-0.6, 0.0, 0.6];
        const currentLaneIdx = lanes.findIndex(val => Math.abs(this.x - val) < 0.2);
        if (currentLaneIdx === -1) return;

        // Choose possible lanes adjacent to current lane
        const options = [];
        if (currentLaneIdx > 0) options.push(lanes[currentLaneIdx - 1]); // left lane
        if (currentLaneIdx < 2) options.push(lanes[currentLaneIdx + 1]); // right lane

        if (options.length === 0) return;
        const target = options[Math.floor(Math.random() * options.length)];

        // Verify target lane occupancy (safe space window)
        const isTargetOccupied = allVehicles.some(other => {
            if (other === this) return false;
            // Check if any car lies in the target lane close to our Z coordinate
            return Math.abs(other.x - target) < 0.25 && Math.abs(other.z - this.z) < 1500;
        });

        if (!isTargetOccupied) {
            this.targetX = target;
        }
    }
}

window.TrafficVehicle = TrafficVehicle;
