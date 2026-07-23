/**
 * @file weather_manager.js
 * @brief Coordinates weather transitions, fog colors, and rain parameters.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class WeatherManager {
    constructor() {
        this.activeWeather = "SUNNY";
        
        // Current values (smoothed)
        this.rainIntensity = 0.0;
        this.fogDensity = 0.05;
        this.cloudCover = 0.1;

        // Target destinations
        this.targets = {
            rain: 0.0,
            fog: 0.05,
            clouds: 0.1
        };

        this.transitionTimer = 25.0; // Seconds between weather transitions
    }

    /**
     * @brief Resets weather conditions to clear.
     */
    reset() {
        this.activeWeather = "SUNNY";
        this.rainIntensity = 0.0;
        this.fogDensity = 0.05;
        this.cloudCover = 0.1;
        this.targets = { rain: 0.0, fog: 0.05, clouds: 0.1 };
        this.transitionTimer = 25.0;
    }

    /**
     * @brief Blends current values toward weather targets.
     * @param {number} dt Time step in seconds
     */
    update(dt) {
        if (dt <= 0) return;

        // Smoothly interpolate parameters (lerp over time)
        const lerpFactor = 0.25; // Speed of weather shifts
        this.rainIntensity += (this.targets.rain - this.rainIntensity) * lerpFactor * dt;
        this.fogDensity += (this.targets.fog - this.fogDensity) * lerpFactor * dt;
        this.cloudCover += (this.targets.clouds - this.cloudCover) * lerpFactor * dt;

        // Countdown transition timer
        this.transitionTimer -= dt;
        if (this.transitionTimer <= 0.0) {
            this.transitionTimer = 30.0 + Math.random() * 20.0; // change weather every 30-50s
            this._triggerNewWeather();
        }
    }

    /**
     * @brief Triggers a random weather state transition.
     * @private
     */
    _triggerNewWeather() {
        const types = ["SUNNY", "CLOUDY", "RAINY", "FOGGY"];
        
        // Randomly pick new weather
        const newWeather = types[Math.floor(Math.random() * types.length)];
        this.activeWeather = newWeather;

        console.log(`[Weather] Transitioning to: ${newWeather}`);

        switch (newWeather) {
            case "SUNNY":
                this.targets.rain = 0.0;
                this.targets.fog = 0.03;
                this.targets.clouds = 0.1;
                break;
            case "CLOUDY":
                this.targets.rain = 0.0;
                this.targets.fog = 0.15;
                this.targets.clouds = 0.85;
                break;
            case "RAINY":
                this.targets.rain = 0.85;
                this.targets.fog = 0.45;
                this.targets.clouds = 0.95;
                break;
            case "FOGGY":
                this.targets.rain = 0.0;
                this.targets.fog = 0.9;
                this.targets.clouds = 0.5;
                break;
        }
    }

    /**
     * @brief Returns atmospheric fog color based on the current hour.
     * @param {number} hour Current daynight cycle hour
     * @return {string} Fog Hex Color
     */
    getFogColor(hour) {
        if (hour >= 5.0 && hour < 8.0) {
            return '#fca5a5'; // morning mist pinkish red
        } else if (hour >= 8.0 && hour < 17.0) {
            return '#94a3b8'; // golden/gray bright noon fog
        } else if (hour >= 17.0 && hour < 20.0) {
            return '#701a75'; // sunset fog purple/violet
        } else {
            return '#0f172a'; // dark night fog
        }
    }
}

window.WeatherManager = WeatherManager;
