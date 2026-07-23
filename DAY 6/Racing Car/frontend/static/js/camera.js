/**
 * @file camera.js
 * @brief Viewport projection camera class.
 * 
 * Manages 3D camera offsets (X, Y, Z) and projects viewport values 
 * into 2D screenspace coordinates.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class Camera {
    constructor() {
        // Base coordinate offsets
        this.x = 0.0;          // Horizontal offset
        this.y = 1000.0;       // Eye height
        this.z = 0.0;          // Forward distance
        this.targetX = 0.0;
        this.targetY = 1000.0;

        // Cinematic Z-Offset (acceleration/braking shift)
        this.zOffset = 0.0;
        this.targetZOffset = 0.0;

        // Roll (steering lean)
        this.roll = 0.0;
        this.targetRoll = 0.0;
        
        // Field of View
        this.baseFov = 60.0;
        this.targetFov = 60.0;
        this.fov = 60.0;
        this.depth = 1.0 / Math.tan((this.fov / 2) * Math.PI / 180.0);

        // Screenshake & Vibration
        this.shakeIntensity = 0.0;
        this.currentShakeX = 0.0;
        this.currentShakeY = 0.0;

        // Speed Lines & Eye Adaptation
        this.blurIntensity = 0.0;
        this.targetBlurIntensity = 0.0;
        this.exposure = 1.0;
        this.targetExposure = 1.0;

        // Speed for standalone visualization (if used)
        this.speed = 1200.0;   
    }

    /**
     * @brief Resets the camera coordinates and effects.
     */
    reset() {
        this.x = 0.0;
        this.y = 1000.0;
        this.z = 0.0;
        this.zOffset = 0.0;
        this.roll = 0.0;
        this.fov = this.baseFov;
        this.shakeIntensity = 0.0;
        this.blurIntensity = 0.0;
        this.exposure = 1.0;
    }

    /**
     * @brief Triggers a multi-axis screen shake (e.g. for collisions).
     */
    triggerShake(intensity) {
        this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 100.0);
    }

    /**
     * @brief Updates camera physics, interpolating towards targets.
     * @param {number} dt Time step in seconds
     */
    update(dt) {
        if (dt <= 0) return;

        // Interpolate core position targets (soft damping)
        this.x += (this.targetX - this.x) * 6.0 * dt;
        this.y += (this.targetY - this.y) * 8.0 * dt;

        // Interpolate Z-offset (acceleration eases backward, braking eases forward)
        this.zOffset += (this.targetZOffset - this.zOffset) * 4.0 * dt;

        // Interpolate Roll (steering lean)
        this.roll += (this.targetRoll - this.roll) * 5.0 * dt;

        // Interpolate FOV
        this.fov += (this.targetFov - this.fov) * 4.0 * dt;
        this.depth = 1.0 / Math.tan((this.fov / 2) * Math.PI / 180.0);

        // Process shake (exponential decay)
        if (this.shakeIntensity > 0) {
            this.currentShakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.currentShakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity -= this.shakeIntensity * 10.0 * dt;
            if (this.shakeIntensity < 0.5) {
                this.shakeIntensity = 0;
                this.currentShakeX = 0;
                this.currentShakeY = 0;
            }
        }

        // Interpolate blur and exposure
        this.blurIntensity += (this.targetBlurIntensity - this.blurIntensity) * 5.0 * dt;
        this.exposure += (this.targetExposure - this.exposure) * 2.0 * dt;
    }
}

window.Camera = Camera;
