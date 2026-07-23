/**
 * @file obstacle_manager.js
 * @brief Manages roadside and surface obstacles.
 * 
 * Tracks static barriers, cones, barrels, and executes dynamic animations
 * like spinning oil spills and blinking construction lights.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class ObstacleManager {
    constructor() {
        this.obstacles = [];
    }

    /**
     * @brief Steps animation clocks for indicators and spin components.
     * @param {number} dt Time step in seconds
     */
    update(dt) {
        if (dt <= 0) return;
        
        this.obstacles.forEach(o => {
            if (o.type === "Oil Spill") {
                // Spin oil spill slicks (radians)
                o.rotation = (o.rotation || 0) + 1.2 * dt;
            } else if (o.type === "Construction Barrier") {
                // Blink flashing hazard lights
                o.blinkTimer = (o.blinkTimer || 0) + dt;
                if (o.blinkTimer >= 0.4) {
                    o.blinkTimer = 0.0;
                    o.hazardLightOn = !o.hazardLightOn;
                }
            }
        });
    }

    /**
     * @brief Creates and appends an obstacle object.
     */
    spawn(x, z, type, color) {
        const obstacle = {
            x: x,
            z: z,
            type: type,
            color: color || '#f97316',
            width: 40,
            height: 40,
            rotation: 0.0,
            blinkTimer: 0.0,
            hazardLightOn: true
        };

        this._setObstacleDimensions(obstacle);
        this.obstacles.push(obstacle);
        return obstacle;
    }

    /**
     * @brief Configures dimensional sizes based on obstacle type.
     * @private
     */
    _setObstacleDimensions(obs) {
        switch (obs.type) {
            case "Traffic Cone":
                obs.width = 30;
                obs.height = 40;
                break;
            case "Barrel":
                obs.width = 45;
                obs.height = 55;
                break;
            case "Construction Barrier":
                obs.width = 90;
                obs.height = 45;
                break;
            case "Oil Spill":
                obs.width = 120;
                obs.height = 10; // Flat on road plane
                break;
            case "Broken Vehicle":
                obs.width = 115;
                obs.height = 55;
                break;
            case "Billboard":
                obs.width = 200;
                obs.height = 120;
                break;
            case "Tree":
                obs.width = 100;
                obs.height = 180;
                break;
            case "Road Sign":
                obs.width = 50;
                obs.height = 90;
                break;
        }
    }

    /**
     * @brief Resets the array of active obstacles.
     */
    clear() {
        this.obstacles = [];
    }
}

window.ObstacleManager = ObstacleManager;
