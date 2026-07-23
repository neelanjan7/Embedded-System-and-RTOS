/**
 * @file score_manager.js
 * @brief Handles game scores, near-miss triggers, and collision penalties.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class ScoreManager {
    constructor() {
        this.score = 0;
        this.nearMisses = 0;
        this.collisions = 0;
        this.lastZ = 0.0;
    }

    /**
     * @brief Resets all points and records.
     */
    reset() {
        this.score = 0;
        this.nearMisses = 0;
        this.collisions = 0;
        this.lastZ = 0.0;
        this.updateUI();
    }

    /**
     * @brief Steps score based on travel distance.
     * @param {number} playerZ Current player longitudinal Z progress
     * @param {DashboardUI} ui UI subsystem reference for alerts
     */
    update(playerZ, ui) {
        if (this.lastZ === 0.0) {
            this.lastZ = playerZ;
            return;
        }

        const distanceDelta = playerZ - this.lastZ;
        
        // Handle coordinates wrapping
        if (distanceDelta > -50000) {
            if (distanceDelta > 0) {
                // Score increases proportional to distance traveled
                this.score += Math.round(distanceDelta * 0.05);
            }
        }
        
        this.lastZ = playerZ;
        this.updateUI();
    }

    /**
     * @brief Awards points for passing close to traffic.
     * @param {DashboardUI} ui UI reference
     */
    addNearMiss(ui) {
        this.nearMisses++;
        this.score += 500;
        ui.showNotification('success', '+500 NEAR MISS BONUS!');
        this.updateUI();
    }

    /**
     * @brief Subtracts points during collisions.
     * @param {DashboardUI} ui UI reference
     */
    addCollisionPenalty(ui) {
        this.collisions++;
        this.score = Math.max(0, this.score - 1000);
        ui.showNotification('error', '-1000 IMPACT PENALTY!');
        this.updateUI();
    }

    /**
     * @brief Refreshes score counters on dashboard panels.
     */
    updateUI() {
        const scoreVal = document.getElementById('hud-score');
        if (scoreVal) {
            scoreVal.textContent = String(this.score).padStart(6, '0');
        }
    }
}

window.ScoreManager = ScoreManager;
