/**
 * @file spawn_manager.js
 * @brief Handles difficulty scaling, spawn loops, lane occupancies, and despawns.
 * 
 * Spawns traffic vehicles and obstacles ahead of the player view, 
 * validates spacing limits, and despawns units behind the camera viewport.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class SpawnManager {
    /**
     * @brief Constructor for the Spawn Manager.
     * @param {TrafficManager} trafficMgr Coordinator for traffic cars
     * @param {ObstacleManager} obstacleMgr Coordinator for road obstacles
     */
    constructor(trafficMgr, obstacleMgr) {
        this.traffic = trafficMgr;
        this.obstacles = obstacleMgr;

        this.difficulty = 1.0;
        this.spawnTimer = 0.0;
        this.spawnInterval = 2.8;   // Base spawn interval in seconds
        this.lastSpawnZ = 0.0;
        this.minSpawnSpacingZ = 1600; // Min Z distance spacing between spawns
        
        // Colors palette for traffic paints
        this.carColors = [
            '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', 
            '#0d9488', '#ea580c', '#db2777', '#4b5563', '#ffffff'
        ];
    }

    /**
     * @brief Resets spawn tracking metrics.
     */
    reset() {
        this.difficulty = 1.0;
        this.spawnTimer = 0.0;
        this.lastSpawnZ = 0.0;
        this.traffic.clear();
        this.obstacles.clear();
    }

    /**
     * @brief Steps difficulty sweeps, counts spawn timers, and runs despawn checks.
     * @param {number} dt Time step in seconds
     * @param {number} playerZ Current player longitudinal Z coordinate
     * @param {number} cameraZ Current camera longitudinal Z coordinate
     */
    update(dt, playerZ, cameraZ) {
        if (dt <= 0) return;

        // 1. Difficulty scaling: increases based on distance traveled (caps at 3.0)
        this.difficulty = Math.min(3.0, 1.0 + (playerZ / 60000.0));

        // 2. Spawn timer counts
        this.spawnTimer -= dt;
        
        const deltaZSinceLastSpawn = playerZ - this.lastSpawnZ;
        const adjustedInterval = this.spawnInterval / this.difficulty;

        if (this.spawnTimer <= 0 && deltaZSinceLastSpawn >= this.minSpawnSpacingZ) {
            this.spawnTimer = adjustedInterval;
            
            // Set spawn target 18,000 units ahead (safely out of rendering view)
            const spawnZ = playerZ + 18000;
            this.lastSpawnZ = playerZ;

            // Roll spawn type: 70% Traffic car, 30% Obstacle block
            if (Math.random() < 0.70) {
                this._spawnTrafficVehicle(spawnZ);
            } else {
                this._spawnObstacle(spawnZ);
            }
        }

        // 3. Automatic Despawning: recycle elements behind or excessively ahead of camera
        this._despawnStaleElements(cameraZ);
    }

    /**
     * @brief Safe lane occupancy checks before spawning cars.
     * @private
     */
    _spawnTrafficVehicle(z) {
        const lanes = [-0.6, 0.0, 0.6];
        const targetLane = lanes[Math.floor(Math.random() * lanes.length)];

        // Validate spacing: check if any vehicle lies within the safety window in this lane
        const isLaneOccupied = this.traffic.vehicles.some(v => {
            return Math.abs(v.x - targetLane) < 0.25 && Math.abs(v.z - z) < 1800;
        });

        if (isLaneOccupied) return; // Skip spawn if unsafe

        // Choose random vehicle types
        const types = ["Sedan", "SUV", "Sports Car", "Truck", "Bus", "Police Car", "Ambulance"];
        const vehicleType = types[Math.floor(Math.random() * types.length)];

        // Speeds increase with difficulty
        const speed = 700.0 + (Math.random() * 400.0) + (this.difficulty * 80.0);
        const color = this.carColors[Math.floor(Math.random() * this.carColors.length)];

        this.traffic.spawn(targetLane, z, vehicleType, speed, color);
    }

    /**
     * @brief Spawns obstacles on road surfaces or margins.
     * @private
     */
    _spawnObstacle(z) {
        const types = ["Traffic Cone", "Barrel", "Construction Barrier", "Oil Spill", "Broken Vehicle"];
        const obsType = types[Math.floor(Math.random() * types.length)];

        // Spawn inside lanes or on borders
        let targetX = 0.0;
        const roll = Math.random();

        if (roll < 0.75) {
            // Spawn inside one of the three driving lanes
            const lanes = [-0.6, 0.0, 0.6];
            targetX = lanes[Math.floor(Math.random() * lanes.length)];
            
            // Adjust offset slightly to look natural
            targetX += (Math.random() * 0.15 - 0.075);
        } else {
            // Spawn on left/right outer dirt shoulders
            targetX = Math.random() < 0.5 ? -1.25 : 1.25;
        }

        // Verify no lead car is overlapping this point
        const isSpaceOccupied = this.traffic.vehicles.some(v => {
            return Math.abs(v.x - targetX) < 0.3 && Math.abs(v.z - z) < 1200;
        });

        if (isSpaceOccupied) return;

        this.obstacles.spawn(targetX, z, obsType);
    }

    /**
     * @brief Clears entities that are no longer visible.
     * @private
     */
    _despawnStaleElements(cameraZ) {
        const maxBehind = 1400;  // segment units behind
        const maxAhead = 25000;  // segment units ahead

        // Despawn traffic
        this.traffic.vehicles = this.traffic.vehicles.filter(v => {
            return (v.z > cameraZ - maxBehind) && (v.z < cameraZ + maxAhead);
        });

        // Despawn obstacles
        this.obstacles.obstacles = this.obstacles.obstacles.filter(o => {
            return (o.z > cameraZ - maxBehind) && (o.z < cameraZ + maxAhead);
        });
    }
}

window.SpawnManager = SpawnManager;
