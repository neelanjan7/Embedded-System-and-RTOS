/**
 * @file game.js
 * @brief Core Game Engine manager integrating physics, collisions, and weather environments.
 * 
 * Drives day-night hour cycles, weather transitions (sun, clouds, rain, fog), 
 * leaf/bird/rain particle physics, and synthesizes audio hums and weather patters.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Loop controls
        this.isRunning = false;
        this.animationFrameId = null;

        // Subsystems
        this.assets = null;
        this.camera = null;
        this.road = null;
        this.renderer = null;
        this.connection = null;
        this.ui = null;
        
        // Vehicle systems
        this.controls = null;
        this.player = null;
        this.vehicleRenderer = null;

        // AI Spawning & Obstacles
        this.trafficManager = null;
        this.obstacleManager = null;
        this.spawnManager = null;

        // Game State, Damage, Score, and Collisions
        this.gameStates = null;
        this.damageSystem = null;
        this.scoreManager = null;
        this.collisionManager = null;

        // Environmental weather subsystems
        this.daynightManager = null;
        this.weatherManager = null;
        this.environmentFx = null;
        this.ambientAudio = null;

        // Diagnostics
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdateTime = 0;
        this.lastFrameTime = 0;
        
        // Showcase additions
        this.replayBuffer = [];
        this.isReplaying = false;
        this.replayCursor = 0;
    }

    /**
     * @brief Boots loaders, generates roads, instantiates player/AI/controls, and loops.
     */
    init() {
        this.assets = new AssetLoader();
        
        this.assets.load(() => {
            this.road = new Road();
            this.road.generate();
            
            this.camera = new Camera();
            this.renderer = new Renderer(this.ctx);
            this.renderer.camera = this.camera; // Link for shake proxying
            
            this.controls = new Controls();
            this.player = new Player();
            this.vehicleRenderer = new VehicleRenderer(this.ctx);

            this.trafficManager = new TrafficManager();
            this.obstacleManager = new ObstacleManager();
            this.spawnManager = new SpawnManager(this.trafficManager, this.obstacleManager);

            this.gameStates = new GameStateManager();
            this.damageSystem = new DamageSystem();
            this.scoreManager = new ScoreManager();
            this.collisionManager = new CollisionManager();

            // Environment & weather subsystems
            this.daynightManager = new DayNightManager();
            this.weatherManager = new WeatherManager();
            this.environmentFx = new EnvironmentFX();
            this.ambientAudio = new AmbientAudio();
            this.soundManager = new SoundManager();
            
            this.connection = new ServerConnection();
            this.ui = new DashboardUI(this.connection);
            this.ui.init();
            
            // Wire global event interfaces
            window.onResumeRequested = () => {
                if (this.gameStates.isPaused()) {
                    this.gameStates.setState("PLAYING");
                }
            };

            window.onRestartRequested = () => {
                this.resetSimulation();
                this.gameStates.setState("PLAYING");
            };

            window.onPauseToggleRequested = () => {
                if (this.gameStates.currentState === "PLAYING") {
                    this.gameStates.setState("PAUSED");
                } else if (this.gameStates.isPaused()) {
                    this.gameStates.setState("PLAYING");
                }
            };
            
            window.onStartSimulation = () => {
                this.gameStates.setState("PLAYING");
                this.resetSimulation();
            };
            
            // Photo Mode / Screenshot
            window.onCaptureScreenshot = () => {
                const link = document.createElement('a');
                link.download = `velocity_ai_screenshot_${Date.now()}.png`;
                link.href = this.canvas.toDataURL('image/png');
                link.click();
                this.ui.showNotification('success', 'Screenshot saved!');
            };

            // Start behind menu, but paused or running? Let's run it as a live background!
            this.gameStates.setState("PLAYING");
            this.player.isAutopilot = true; // Temporary autopilot for live menu

            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            // Wire connection hooks
            window.onConnectionEstablished = () => {
                this.connection.startTelemetryStream(
                    (data) => this.handleTelemetry(data),
                    (connected) => this.handleConnectionStatus(connected)
                );
            };

            // Wire connection hooks
            window.onConnectionEstablished = () => {
                this.connection.startTelemetryStream(
                    (data) => this.handleTelemetry(data),
                    (connected) => this.handleConnectionStatus(connected)
                );
            };

            // Start loop ticks
            const now = performance.now();
            this.lastFrameTime = now;
            this.lastFpsUpdateTime = now;
            this.isRunning = true;
            this.loop(now);

            console.log("[Engine] Weather and environmental systems fully linked.");
        });
    }

    /**
     * @brief Resets simulation variables.
     */
    resetSimulation() {
        this.player.reset();
        this.camera.reset();
        this.spawnManager.reset();
        this.damageSystem.reset();
        this.scoreManager.reset();
        this.daynightManager.reset();
        this.weatherManager.reset();
        this.environmentFx.reset();
        this.ambientAudio.stop();
        this.renderer.particles = [];
        this.renderer.shakeIntensity = 0.0;
        this.replayBuffer = [];
        this.player.isAutopilot = false; // Disable menu autopilot
        console.log("[Engine] Simulation variables reset completed.");
    }

    /**
     * @brief Resizes drawing width to fit canvas container.
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width * 0.85;
        this.canvas.height = rect.height * 0.85;
    }

    /**
     * @brief Clock ticks rendering scenes and managing updates based on active state.
     * @param {number} timestamp Current performance timestamp
     */
    loop(timestamp) {
        if (!this.isRunning) return;

        let dt = (timestamp - this.lastFrameTime) / 1000.0;
        this.lastFrameTime = timestamp;

        if (dt > 0.1) dt = 0.1;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // CASE A: State is Paused or Game Over - Freeze physics updates but continue drawing sky/road parallax
        if (this.gameStates.isPaused() || this.gameStates.isGameOver()) {
            // Halt synthesized sound gain nodes
            this.ambientAudio.update(0, 0, 0, false);

            this.ctx.clearRect(0, 0, w, h);
            this.renderer.drawSky(w, h, this.daynightManager);
            this.renderer.drawScene(
                this.camera, 
                this.road, 
                this.assets, 
                this.trafficManager.vehicles, 
                this.obstacleManager.obstacles,
                this.damageSystem,
                this.daynightManager,
                this.weatherManager
            );
            this.vehicleRenderer.draw(this.player, this.controls, this.damageSystem, dt);
            this.environmentFx.draw(this.ctx);

            this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
            return;
        }

        // CASE B: State is Playing - Run full update loops
        // 1. Process inputs
        this.controls.update(this.ui.settings, this.connection.isMockMode);

        // 2. Update player physics
        this.player.update(dt, this.controls, this.damageSystem);

        // 3. Update environmental clocks
        this.daynightManager.update(dt);
        this.weatherManager.update(dt);
        this.environmentFx.update(dt, this.weatherManager, this.player.speed, w, h);

        // 4. Update Audio (Ambient & Sounds)
        if (this.ui.settings.enableAudio && !this.soundManager.isInitialized) {
            this.soundManager.init();
        }

        const curSeg = this.road.findSegment(this.player.z);
        const biome = curSeg ? curSeg.biome : 'plains';
        const isTunnel = biome === 'tunnel';

        this.ambientAudio.update(
            this.player.rpm,
            this.player.getSpeedKMH(),
            this.weatherManager.rainIntensity,
            this.ui.settings.enableAudio,
            biome,
            isTunnel,
            this.player.isOffRoad
        );

        // Check for gear shift
        if (!this._lastGear) this._lastGear = this.player.gear;
        if (this.player.gear !== this._lastGear) {
            if (this.ui.settings.enableAudio) this.soundManager.playGearShift();
            this._lastGear = this.player.gear;
        }

        // Check for exhaust/turbo release (lift off throttle or tap brake at high rpm)
        const isBraking = this.controls.brake > 0 || this.controls.handbrake;
        if (!this._lastBrake) this._lastBrake = false;
        if (isBraking && !this._lastBrake && this.player.rpm > 0.5) {
            if (this.ui.settings.enableAudio) {
                if (Math.random() > 0.5) this.soundManager.playBackfire();
                else this.soundManager.playWastegate();
            }
        }
        this._lastBrake = isBraking;

        // 5. Update dynamic AI traffic and obstacles
        this.trafficManager.update(dt);
        this.obstacleManager.update(dt);
        this.spawnManager.update(dt, this.player.z, this.camera.z);

        // 6. Audit collisions
        this.collisionManager.checkCollisions(
            this.player, 
            this.trafficManager, 
            this.obstacleManager, 
            this.damageSystem, 
            this.scoreManager, 
            this.gameStates, 
            this.ui, 
            this.renderer
        );

        if (!this._lastCollisions) this._lastCollisions = 0;
        if (this.scoreManager.collisions > this._lastCollisions) {
            if (this.ui.settings.enableAudio) this.soundManager.playCollision('metal', 1.0);
            this._lastCollisions = this.scoreManager.collisions;
        }

        if (!this._lastNearMisses) this._lastNearMisses = 0;
        if (this.scoreManager.nearMisses > this._lastNearMisses) {
            if (this.ui.settings.enableAudio) this.soundManager.playTrafficPassby(this.player.getSpeedKMH(), (Math.random() > 0.5 ? 0.8 : -0.8));
            this._lastNearMisses = this.scoreManager.nearMisses;
        }

        // 7. Update score based on distance
        this.scoreManager.update(this.player.z, this.ui);

        // 8. Update particle effects
        this.renderer.updateParticles(dt);

        // Periodically emit smoke/sparks if vehicle health drops
        const dmgEffects = this.damageSystem.getEffectFlags();
        if (dmgEffects.smoke && Math.random() < 0.15) {
            this.renderer.spawnDebris(this.player.x, this.player.z - 40.0, '#4b5563', 1);
        }
        if (dmgEffects.sparks && Math.random() < 0.12) {
            this.renderer.spawnDebris(this.player.x, this.player.z - 50.0, '#f97316', 2);
        }

        // --- Tire Particles: off-road dust/dirt and rain spray ---
        const speedKMH_p = this.player.getSpeedKMH();
        if (this.player.isOffRoad && speedKMH_p > 40) {
            // Grass and brown-dirt chunks kicked up behind rear tires
            if (Math.random() < 0.5) {
                this.renderer.spawnDebris(this.player.x - 0.05, this.player.z - 60.0, '#15803d', 3); // grass
                this.renderer.spawnDebris(this.player.x + 0.05, this.player.z - 60.0, '#78350f', 2); // dirt
            }
        }
        if (this.weatherManager.rainIntensity > 0.15 && speedKMH_p > 80) {
            // Water spray misted behind tyres at speed
            if (Math.random() < 0.35) {
                this.renderer.spawnDebris(this.player.x - 0.05, this.player.z - 55.0, 'rgba(148,230,255,0.8)', 2);
                this.renderer.spawnDebris(this.player.x + 0.05, this.player.z - 55.0, 'rgba(148,230,255,0.8)', 2);
            }
        }

        // --- Skid Mark Recording ---
        const isSkidding = (
            (this.controls.brake > 0.3 || this.controls.handbrake) && speedKMH_p > 50
        ) || (
            Math.abs(this.player.steerAngle) > 0.55 && speedKMH_p > 120
        );

        if (isSkidding) {
            const currentSegment = this.road.findSegment(this.player.z);
            if (currentSegment) {
                if (!currentSegment.skidMarks) currentSegment.skidMarks = [];
                // Normalised road X offsets for left and right rear tires
                const xLeft  = (this.player.x - 0.05);
                const xRight = (this.player.x + 0.05);
                // Cap total marks per segment to avoid over-darkening
                if (currentSegment.skidMarks.length < 4) {
                    currentSegment.skidMarks.push({ xLeft, xRight });
                }
            }
        }

        // Check if transitioning to Game Over
        if (this.gameStates.isGameOver()) {
            this.ui.showGameOverScreen(
                this.scoreManager.score, 
                this.scoreManager.nearMisses, 
                this.scoreManager.collisions
            );
        }

        // 9. Update camera targets
        this.camera.targetX = this.player.x + this.player.steerAngle * 0.12;
        this.camera.targetY = 1000.0 + this.player.bounce * 0.5 + this.player.suspensionY * 0.5;

        const speedRatio = this.player.speed / this.player.maxSpeed;
        
        // Acceleration / Braking Z-Offset
        const accelAmount = this.controls.accelerate ? 1.0 : 0.0;
        const brakeAmount = (this.controls.brake > 0 || this.controls.handbrake) ? 1.0 : 0.0;
        
        // Boost modifiers
        const isBoosting = this.player.isBoosting; // Assuming player has boost state or similar
        const boostFovMultiplier = isBoosting ? 1.15 : 1.0;

        // Eases backward on accel (-zOffset), forward on brake (+zOffset)
        this.camera.targetZOffset = (brakeAmount * 150.0) - (accelAmount * 80.0);
        
        // Roll lean into corners
        this.camera.targetRoll = this.player.steerAngle * speedRatio * 0.12;

        // FOV widening
        this.camera.targetFov = this.camera.baseFov * (1.0 + speedRatio * 0.15) * boostFovMultiplier;
        
        // Motion blur intensity
        this.camera.targetBlurIntensity = isBoosting ? 1.0 : Math.max(0, (speedRatio - 0.7) * 2.0);

        // Tunnel Eye Adaptation
        const curSegForTunnel = this.road.findSegment(this.player.z);
        if (curSegForTunnel && curSegForTunnel.biome === 'tunnel') {
            this.camera.targetExposure = 0.3; // darken entering tunnel
        } else {
            this.camera.targetExposure = 1.0;
        }

        // Idle engine vibration
        if (this.player.speed < 5.0 && this.player.rpm > 0.1) {
            this.camera.triggerShake(0.1); 
        }
        
        // If boost is active, add slight shake
        if (isBoosting) {
            this.camera.triggerShake(0.5);
        }

        // Apply camera updates
        this.camera.update(dt);
        this.camera.z = this.player.z - 200.0 + this.camera.zOffset;

        // Wrap Z coordinates to loop infinitely
        const roadLength = this.road.segments.length * this.road.segmentLength;
        if (this.player.z >= roadLength) {
            this.player.z -= roadLength;
            this.camera.z -= roadLength;
            this.trafficManager.vehicles.forEach(v => v.z -= roadLength);
            this.obstacleManager.obstacles.forEach(o => o.z -= roadLength);
            this.spawnManager.lastSpawnZ -= roadLength;
        }

        // 10. Render graphics frame
        this.ctx.clearRect(0, 0, w, h);
        this.renderer.drawSky(w, h, this.daynightManager);
        
        this.renderer.drawScene(
            this.camera, 
            this.road, 
            this.assets, 
            this.trafficManager.vehicles, 
            this.obstacleManager.obstacles,
            this.damageSystem,
            this.daynightManager,
            this.weatherManager
        );

        this.vehicleRenderer.draw(this.player, this.controls, this.damageSystem, dt, this.daynightManager, this.weatherManager);

        // Draw environmental particle sheets overlay (rain/leaves/birds)
        this.environmentFx.draw(this.ctx);

        // 11. Update HUD labels
        this._updateHUDDashboard();

        // Replay Buffer Record (last 30s at 60fps = 1800 frames)
        if (this.frameCount % 2 === 0) {
            this.replayBuffer.push({
                x: this.player.x, z: this.player.z,
                camX: this.camera.x, camZ: this.camera.z,
                camFov: this.camera.targetFov,
                time: this.daynightManager.time
            });
            if (this.replayBuffer.length > 900) this.replayBuffer.shift(); // 30s at 30 recorded fps
        }

        // 12. Recalculate frame rate counters
        this.frameCount++;
        const elapsed = timestamp - this.lastFpsUpdateTime;
        if (elapsed >= window.ClientConfig.FPS_REFRESH_INTERVAL_MS) {
            this.fps = (this.frameCount * 1000.0) / elapsed;
            this.frameCount = 0;
            this.lastFpsUpdateTime = timestamp;
            this.ui.updateFPS(this.fps);
            
            // Push dev overlay stats
            if(this.ui.screens && !this.ui.screens.perf.classList.contains('hidden')) {
                const memEst = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) : "N/A";
                this.ui.updatePerformancePanel({
                    fps: Math.round(this.fps),
                    frameTime: (1000/this.fps).toFixed(1),
                    cpuEst: Math.min(100, Math.round((1000/this.fps) / 16.6 * 50)), // heuristic
                    memEst: memEst,
                    drawCalls: 120 + this.renderer.particles.length + this.trafficManager.vehicles.length * 3, // heuristic
                    particles: this.renderer.particles.length + (this.environmentFx.rainParticles?.length || 0),
                    audioNodes: 8,
                    latency: this.connection.latency || 0,
                    packetLoss: (this.connection.packetLossRate * 100 || 0).toFixed(1)
                });
            }
        }

        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * @brief Syncs HUD dials with player telemetry and environmental values.
     * @private
     */
    _updateHUDDashboard() {
        const speedKMH = this.player.getSpeedKMH();
        const gear = this.player.gear;
        const rpm = this.player.rpm;

        // Update text labels
        document.getElementById('hud-speed').textContent = String(speedKMH).padStart(3, '0');
        document.getElementById('hud-gear').textContent = speedKMH === 0 ? "N" : gear;
        document.getElementById('hud-rpm-val').textContent = Math.round(rpm * 8000);

        this.ui.updateRPM(rpm);

        // Update Distance
        const hudDist = document.getElementById('hud-distance');
        if (hudDist) {
            hudDist.textContent = String(Math.round(this.player.z * 0.02)).padStart(4, '0');
        }

        // Draw active time & weather inside the sub-tag (displays when link is active)
        const hour = Math.floor(this.daynightManager.time);
        const mins = String(Math.floor((this.daynightManager.time % 1) * 60)).padStart(2, '0');
        const timeString = `${String(hour).padStart(2, '0')}:${mins}`;
        const weatherString = this.weatherManager.activeWeather;

        const simIndicator = document.getElementById('sim-mode-indicator');
        if (simIndicator) {
            if (this.connection.isMockMode) {
                simIndicator.textContent = "SIMULATION MODE ACTIVE";
                simIndicator.classList.remove('hidden');
            } else {
                simIndicator.textContent = `TIME: ${timeString} | WEATHER: ${weatherString}`;
                simIndicator.classList.remove('hidden'); // keep it visible to showcase environments!
            }
        }
    }

    /**
     * @brief Intercepts serial feeds and relays to control maps.
     */
    handleTelemetry(data) {
        this.controls.handleArduinoTelemetry(data);
        this.ui.updateHUDTelemetry(data);
    }

    /**
     * @brief Alters connection flags.
     */
    handleConnectionStatus(connected) {
        if (!connected) {
            this.controls.setArduinoInactive();
            this.ui.updateConnectionStatus('disconnected');
            this.player.reset();
            this.spawnManager.reset();
            this.damageSystem.reset();
            this.scoreManager.reset();
            this.daynightManager.reset();
            this.weatherManager.reset();
            this.environmentFx.reset();
            this.ambientAudio.stop();
            this.gameStates.setState("PLAYING");
        } else {
            const state = (this.connection.isMockMode) ? 'simulating' : 'connected';
            this.ui.updateConnectionStatus(state, this.connection.activePort);
        }
    }
}

// Bootstrap trigger on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    const engine = new GameEngine();
    window.gameEngine = engine;
    engine.init();
});
