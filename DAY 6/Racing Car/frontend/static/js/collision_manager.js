/**
 * @file collision_manager.js
 * @brief Bounding box collision checker and event response manager.
 * 
 * Implements broad-phase Z sorting, bounds overlap triggers, near-miss bonuses,
 * speed drop penalties, camera shake triggers, and launches obstacles off-road.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class CollisionManager {
    constructor() {
        this.broadPhaseLimitZ = 1200; // Z distance bounds for check filters
    }

    /**
     * @brief Audits overlaps against active traffic cars and obstacles.
     * @param {Player} player Player physics model
     * @param {TrafficManager} traffic AI traffic lists
     * @param {ObstacleManager} obstacles Active obstacles lists
     * @param {DamageSystem} damage Damage model
     * @param {ScoreManager} score Score tracker
     * @param {GameStateManager} gameStates Transitions coordinator
     * @param {DashboardUI} ui UI dashboard notification alerts
     * @param {Renderer} renderer Active screen viewport painter
     */
    checkCollisions(player, traffic, obstacles, damage, score, gameStates, ui, renderer) {
        // Skip check if player has active crash/immunity frames
        if (player.collisionImmunityTimer > 0) return;

        const roadW = 2000.0;
        const playerWRelative = 110.0 / roadW; // player width scaling
        const playerLenZ = 220.0;            // player segment length

        // 1. Audit Collisions with AI Traffic
        traffic.vehicles.forEach(v => {
            const deltaZ = Math.abs(player.z - v.z);
            
            // Broad-phase Z filtering
            if (deltaZ > this.broadPhaseLimitZ) return;

            const vWRelative = v.width / roadW;
            const collisionOverlapX = (playerWRelative + vWRelative) / 2.0;
            const deltaX = Math.abs(player.x - v.x);

            // Check overlap
            if (deltaZ < playerLenZ) {
                if (deltaX < collisionOverlapX) {
                    // A. Impact Collision!
                    this._handleTrafficCollision(player, v, damage, score, gameStates, ui, renderer);
                } else if (deltaX < collisionOverlapX * 1.5 && !v.nearMissTriggered) {
                    // B. Near Miss Bonus (close pass laterally)
                    v.nearMissTriggered = true;
                    score.nearMiss(ui); // wait, score_manager has `addNearMiss`
                    score.addNearMiss(ui);
                    renderer.spawnDebris(v.x, v.z, '#38bdf8', 12); // cyan near-miss rings
                }
            }
        });

        // 2. Audit Collisions with Obstacles
        obstacles.obstacles.forEach(o => {
            const deltaZ = Math.abs(player.z - o.z);
            if (deltaZ > this.broadPhaseLimitZ) return;

            const oWRelative = o.width / roadW;
            const collisionOverlapX = (playerWRelative + oWRelative) / 2.0;
            const deltaX = Math.abs(player.x - o.x);

            const obsLenZ = o.type === "Oil Spill" ? 80.0 : 150.0;

            if (deltaZ < obsLenZ && deltaX < collisionOverlapX) {
                this._handleObstacleCollision(player, o, damage, score, gameStates, ui, renderer);
            }
        });
    }

    /**
     * @brief Applies speed drops, sparks, damage, and flags game overs.
     * @private
     */
    _handleTrafficCollision(player, v, damage, score, gameStates, ui, renderer) {
        // Inflict damage points
        const dmgAmount = v.type === "Truck" || v.type === "Bus" ? 35.0 : 20.0;
        damage.applyDamage(dmgAmount);

        // Deduct points
        score.addCollisionPenalty(ui);

        // Slow player down
        player.speed = player.speed * 0.15;
        
        // Trigger camera shake frames
        renderer.triggerCameraShake(22.0);

        // Spawn vector spark particles
        renderer.spawnDebris(player.x, player.z, '#f97316', 20); // Orange metal sparks

        // Slow traffic car down and slide sideways
        v.speed = v.speed * 0.5;
        v.x += v.x > player.x ? 0.3 : -0.3;

        // Apply player immunity frames (1.2 seconds) to prevent double checks
        player.collisionImmunityTimer = 1.2;

        // Check if shield depleted
        if (damage.health <= 0.0) {
            gameStates.setState("GAME_OVER");
        }
    }

    /**
     * @brief Processes spills, cones, and concrete boundaries.
     * @private
     */
    _handleObstacleCollision(player, o, damage, score, gameStates, ui, renderer) {
        if (o.type === "Oil Spill") {
            // Spin out player steering (adds lateral drift)
            player.steerAngle += (Math.random() < 0.5 ? -1.3 : 1.3);
            player.speed = player.speed * 0.85; // slight slide brake
            
            renderer.spawnDebris(player.x, player.z, '#a855f7', 15); // purple oil droplets
            
            // Oil does not inflict damage points directly, but triggers temporary visual slides
            return;
        }

        // Standard obstacle impacts (cones/barrels/barriers/wrecked vehicles)
        let dmg = 10.0;
        let particlesColor = '#f97316'; // default orange

        switch (o.type) {
            case "Broken Vehicle":
                dmg = 30.0;
                particlesColor = '#64748b';
                break;
            case "Construction Barrier":
                dmg = 20.0;
                particlesColor = '#e2e8f0';
                break;
            case "Traffic Cone":
                dmg = 5.0;
                particlesColor = '#ff5e00';
                break;
            case "Barrel":
                dmg = 12.0;
                particlesColor = '#ea580c';
                break;
        }

        damage.applyDamage(dmg);
        score.addCollisionPenalty(ui);
        
        // Decelerate speed
        player.speed = player.speed * 0.35;
        
        // Camera shake
        renderer.triggerCameraShake(14.0);

        // Spawn debris particles
        renderer.spawnDebris(player.x, player.z, particlesColor, 12);

        // Launches hit obstacles off-road horizontally to represent impact force
        o.x = o.x > player.x ? 1.6 : -1.6;
        o.z += 300; // Shift forward

        player.collisionImmunityTimer = 0.8;

        if (damage.health <= 0.0) {
            gameStates.setState("GAME_OVER");
        }
    }
}

window.CollisionManager = CollisionManager;
