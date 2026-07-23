/**
 * @file damage_system.js
 * @brief Manages vehicle damage, structural integrity, and performance limits.
 * 
 * Tracks hull health, breaks headlights upon impacts, triggers smoke/sparks,
 * and throttles engine speeds to model engine damage.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class DamageSystem {
    constructor() {
        this.health = 100.0;
        this.isHeadlightBroken = false;
    }

    /**
     * @brief Repairs chassis components and fills shield health.
     */
    reset() {
        this.health = 100.0;
        this.isHeadlightBroken = false;
        this.updateUI();
    }

    /**
     * @brief inflicts shield health damage and triggers component breaks.
     * @param {number} amount Damage scale
     */
    applyDamage(amount) {
        this.health = Math.max(0.0, this.health - amount);
        
        // Randomly disable one of the headlight projection cones on hard hits
        if (amount >= 15.0 && !this.isHeadlightBroken) {
            if (Math.random() < 0.55) {
                this.isHeadlightBroken = true;
                console.log("[Damage] Impact severed headlight power lines!");
            }
        }

        this.updateUI();
    }

    /**
     * @brief Returns max speed throttling factor based on vehicle health.
     * @return {number} Multiplier coefficient between 0.5 (dead) and 1.0 (clean)
     */
    getSpeedModifier() {
        // Reducibility cap: max speed drops up to 50% at 0 health
        return 0.5 + 0.5 * (this.health / 100.0);
    }

    /**
     * @brief Computes which visual smoke or spark particles to spawn.
     * @return {Object} Particle spawn flag maps
     */
    getEffectFlags() {
        return {
            smoke: this.health <= 50.0,
            sparks: this.health <= 25.0
        };
    }

    /**
     * @brief Updates visual DOM shield indicators and alerts.
     */
    updateUI() {
        const healthBar = document.getElementById('hud-health-bar');
        const healthVal = document.getElementById('hud-health-val');

        if (healthBar) {
            healthBar.style.width = `${this.health}%`;
            
            // Alter bar color tokens based on damage thresholds
            if (this.health > 50) {
                healthBar.style.backgroundColor = 'var(--accent-green)';
            } else if (this.health > 25) {
                healthBar.style.backgroundColor = 'var(--accent-orange)';
            } else {
                healthBar.style.backgroundColor = 'var(--accent-red)';
            }
        }

        if (healthVal) {
            healthVal.textContent = `${Math.round(this.health)}%`;
        }

        // Trigger damage warnings
        const warning = document.getElementById('hud-top-center');
        if (warning) {
            if (this.health <= 25.0 && this.health > 0) {
                warning.classList.add('damage-warning-blink');
            } else {
                warning.classList.remove('damage-warning-blink');
            }
        }
    }
}

window.DamageSystem = DamageSystem;
