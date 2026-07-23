/**
 * @file player.js
 * @brief Player vehicle state management and physics simulation.
 * 
 * Simulates engine force acceleration, braking deceleration, drag friction,
 * steering lane-shifts, body-roll vectors, suspension bouncing, and realistic
 * RPM/gear-ratio shifts.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class Player {
    constructor() {
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        
        this.speed = 0.0;
        this.maxSpeed = 2600.0;
        
        this.accel = 600.0;
        this.decel = 1200.0;
        this.drag = 0.15;
        this.steerSpeed = 1.6;

        this.steerAngle = 0.0;
        this.bodyRoll = 0.0;
        this.bounce = 0.0;
        this.bounceTime = 0.0;

        // Collision immunity frame counter (seconds)
        this.collisionImmunityTimer = 0.0;

        this.gear = 1;
        this.rpm = 0.2;
        
        this.gearLimits = [
            { gear: 1, min: 0,   max: 40 },
            { gear: 2, min: 40,  max: 80 },
            { gear: 3, min: 80,  max: 120 },
            { gear: 4, min: 120, max: 160 },
            { gear: 5, min: 160, max: 220 }
        ];
        this.suspensionY = 0.0;
        this.isOffRoad = false;
    }

    /**
     * @brief Resets player vehicle parameters.
     */
    reset() {
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        this.speed = 0.0;
        this.steerAngle = 0.0;
        this.bodyRoll = 0.0;
        this.bounce = 0.0;
        this.collisionImmunityTimer = 0.0;
        this.gear = 1;
        this.rpm = 0.2;
        this.suspensionY = 0.0;
        this.isOffRoad = false;
    }

    /**
     * @brief Steps vehicle coordinate states and updates engine parameters.
     * @param {number} dt Time step in seconds
     * @param {Controls} controls Driver inputs
     * @param {DamageSystem} damageSystem Vehicle damage data
     */
    update(dt, controls, damageSystem) {
        if (dt <= 0) return;

        // Tick down collision immunity frames
        if (this.collisionImmunityTimer > 0) {
            this.collisionImmunityTimer = Math.max(0.0, this.collisionImmunityTimer - dt);
        }

        const isBraking = controls.brake > 0.05 || controls.handbrake;
        
        if (controls.throttle > 0 && !isBraking) {
            let accelMultiplier = controls.throttle;
            if (controls.boost) {
                accelMultiplier *= 2.0;
            }
            this.speed += this.accel * accelMultiplier * dt;
        }

        if (controls.brake > 0) {
            this.speed -= this.decel * controls.brake * dt;
        }
        
        if (controls.handbrake) {
            this.speed -= this.decel * 2.2 * dt;
        }

        // Natural resistance (drag + rolling friction)
        const dragDecel = this.speed * this.drag * dt;
        this.speed -= (100.0 * dt) + dragDecel;

        // Apply health-based speed limitations (drops max speed when damaged)
        const speedModifier = damageSystem.getSpeedModifier();
        let baseLimit = this.maxSpeed * speedModifier;

        // Apply off-road penalty (shoulders/grass)
        const isOffRoad = Math.abs(this.x) > 1.0;
        this.isOffRoad = isOffRoad;
        if (isOffRoad) {
            baseLimit = baseLimit * 0.4; // cap top speed to 40%
            this.speed = Math.max(0.0, this.speed - 350.0 * dt); // slow down faster off-road
        }

        const limitSpeed = controls.boost ? baseLimit * 1.25 : baseLimit;

        this.speed = Math.max(0.0, Math.min(limitSpeed, this.speed));

        // Steer angle interpolation
        const targetSteer = controls.steer;
        this.steerAngle = this.steerAngle + (targetSteer - this.steerAngle) * 8.0 * dt;

        // Steering lane-shifts
        const speedRatio = this.speed / this.maxSpeed;
        this.x += this.steerAngle * this.steerSpeed * Math.min(1.0, speedRatio * 1.5) * dt;

        this.x = Math.max(-1.8, Math.min(1.8, this.x));

        this.z += this.speed * dt;

        // Calculate visual effects
        this.bodyRoll = -this.steerAngle * 0.06 * Math.min(1.0, speedRatio);

        // Suspension pitch offsets (accel squat and brake dive)
        const targetSuspensionY = (controls.throttle * 4.0) - (controls.brake * 6.0) + (controls.handbrake ? -8.0 : 0.0);
        this.suspensionY = this.suspensionY + (targetSuspensionY - this.suspensionY) * 10.0 * dt;

        if (this.speed > 5.0) {
            this.bounceTime += dt * Math.min(1.5, speedRatio) * 15.0;
            this.bounce = Math.sin(this.bounceTime) * 3.0 * Math.min(1.0, speedRatio);
            
            // Add high speed road vibration bumps
            if (this.speed > 800.0) {
                const roadNoise = (Math.random() - 0.5) * 1.5 * Math.min(1.0, speedRatio);
                this.bounce += roadNoise;
            }
        } else {
            this.bounce = 0.0;
        }

        this._updateEngineMetrics(controls);
    }

    /**
     * @brief Engine RPM and Gear shifts.
     * @private
     */
    _updateEngineMetrics(controls) {
        const speedKMH = this.getSpeedKMH();
        
        let matchedGear = 1;
        for (let i = 0; i < this.gearLimits.length; i++) {
            const limit = this.gearLimits[i];
            if (speedKMH >= limit.min && speedKMH <= limit.max) {
                matchedGear = limit.gear;
                break;
            }
        }
        
        if (speedKMH > 220) {
            matchedGear = 5;
        }

        this.gear = matchedGear;

        const limit = this.gearLimits[this.gear - 1];
        const gearSpeedRange = limit.max - limit.min;
        const currentSpeedInGear = speedKMH - limit.min;
        
        let rpmRatio = currentSpeedInGear / gearSpeedRange;
        rpmRatio = 0.2 + (rpmRatio * 0.8);

        if (controls.throttle > 0.05) {
            rpmRatio += 0.05;
        }
        if (controls.boost) {
            rpmRatio = Math.min(1.0, rpmRatio + 0.15);
        }

        this.rpm = Math.max(0.2, Math.min(1.0, rpmRatio));
    }

    /**
     * @brief Computes velocity representation in KM/H.
     * @return {number} Speed representation
     */
    getSpeedKMH() {
        const speedScale = 0.08;
        return Math.round(this.speed * speedScale);
    }
}

window.Player = Player;
