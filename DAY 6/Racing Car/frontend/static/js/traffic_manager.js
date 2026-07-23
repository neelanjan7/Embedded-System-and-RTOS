/**
 * @file traffic_manager.js
 * @brief Coordinates traffic list loops and instantiations.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class TrafficManager {
    constructor() {
        this.vehicles = [];
    }

    /**
     * @brief Updates physics calculations and AI parameters for all traffic.
     * @param {number} dt Time step in seconds
     */
    update(dt) {
        this.vehicles.forEach(v => {
            v.update(dt, this.vehicles);
        });
    }

    /**
     * @brief Instantiates and records a new traffic car.
     */
    spawn(x, z, type, speed, color) {
        const vehicle = new TrafficVehicle(x, z, type, speed, color);
        this.vehicles.push(vehicle);
        return vehicle;
    }

    /**
     * @brief Clear and reset the vehicle array.
     */
    clear() {
        this.vehicles = [];
    }
}

window.TrafficManager = TrafficManager;
