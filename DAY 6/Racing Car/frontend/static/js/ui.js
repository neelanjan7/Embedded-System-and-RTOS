/**
 * @file ui.js
 * @brief User Interface controller managing dialog displays, forms, and notification loops.
 * 
 * Sets up listeners for the Connection, Calibration, and Settings cards,
 * runs the custom notification system, and formats telemetry variables.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class DashboardUI {
    /**
     * @brief Constructor for the Dashboard UI management.
     * @param {ServerConnection} connection Instance of ServerConnection
     */
    constructor(connection) {
        this.connection = connection;
        
        // Cache DOM dialog overlays
        this.dialogs = {
            connection: document.getElementById('dialog-connection'),
            calibration: document.getElementById('dialog-calibration'),
            settings: document.getElementById('dialog-settings'),
            pause: document.getElementById('dialog-pause'),
            gameover: document.getElementById('dialog-game-over'),
            stats: document.getElementById('dialog-stats')
        };

        this.screens = {
            splash: document.getElementById('splash-screen'),
            menu: document.getElementById('main-menu'),
            photo: document.getElementById('photo-mode-ui'),
            replay: document.getElementById('replay-ui'),
            perf: document.getElementById('performance-panel')
        };

        // Cache Toolbar Buttons
        this.toolbar = {
            connection: document.getElementById('btn-toggle-connection'),
            calibration: document.getElementById('btn-toggle-calibration'),
            settings: document.getElementById('btn-toggle-settings')
        };

        // Notification stack container
        this.notifContainer = document.getElementById('notification-container');

        // Form elements
        this.portSelector = document.getElementById('select-port');
        this.baudSelector = document.getElementById('select-baud');
        this.simModeCheckbox = document.getElementById('check-sim-mode');
        this.btnScan = document.getElementById('btn-port-scan');
        this.btnConnect = document.getElementById('btn-port-connect');
        this.btnRunCalibration = document.getElementById('btn-run-calibration');

        // Settings Elements
        this.deadzoneSlider = document.getElementById('range-deadzone');
        this.deadzoneVal = document.getElementById('val-deadzone');
        this.pitchSlider = document.getElementById('range-pitch-limit');
        this.pitchVal = document.getElementById('val-pitch-limit');
        this.audioCheckbox = document.getElementById('check-enable-audio');
        this.btnSaveSettings = document.getElementById('btn-save-settings');

        // HUD indicators
        this.hudSpeed = document.getElementById('hud-speed');
        this.hudGear = document.getElementById('hud-gear');
        this.hudRpmVal = document.getElementById('hud-rpm-val');
        this.hudRpmBar = document.getElementById('hud-rpm-bar');
        this.hudGesture = document.getElementById('hud-gesture');
        this.hudProximityVal = document.getElementById('hud-proximity-val');
        this.hudProximityBar = document.getElementById('hud-proximity-bar');
        this.colorPreview = document.getElementById('color-preview');
        this.colorR = document.getElementById('color-r');
        this.colorG = document.getElementById('color-g');
        this.colorB = document.getElementById('color-b');
        this.statusDot = document.getElementById('status-dot');
        this.statusLabel = document.getElementById('status-label');
        this.simModeIndicator = document.getElementById('sim-mode-indicator');
        this.hudFps = document.getElementById('hud-fps');
        this.hudLoss = document.getElementById('hud-loss');

        // Calibration Elements
        this.calRoll = document.getElementById('cal-roll');
        this.calPitch = document.getElementById('cal-pitch');
        this.calProgressContainer = document.getElementById('calibration-progress-container');
        this.calProgressBar = document.getElementById('calibration-progress-bar');

        // Active simulator settings state
        this.settings = {
            steerDeadzone: window.ClientConfig.DEFAULTS.steerDeadzone,
            pitchLimit: window.ClientConfig.DEFAULTS.pitchLimit,
            enableAudio: window.ClientConfig.DEFAULTS.enableAudio
        };
        this.loadSavedSettings();
    }

    _playClick() {
        if (window.gameEngine && window.gameEngine.soundManager && this.settings.enableAudio) {
            window.gameEngine.soundManager.playUIClick();
        }
    }

    _playConfirm() {
        if (window.gameEngine && window.gameEngine.soundManager && this.settings.enableAudio) {
            window.gameEngine.soundManager.playUIConfirm();
        }
    }

    /**
     * @brief Hooks event listeners and initializes UI state dropdowns.
     */
    init() {
        // Redesigned loading screen steps animation
        const progressBar = document.getElementById('loader-progress-bar');
        const progressStatus = document.querySelector('.loader-status');
        const loader = document.getElementById('loader');
        
        const steps = [
            { id: "loader-step-1", percent: 15 },
            { id: "loader-step-2", percent: 35 },
            { id: "loader-step-3", percent: 55 },
            { id: "loader-step-4", percent: 75 },
            { id: "loader-step-5", percent: 90 },
            { id: "loader-step-6", percent: 100 }
        ];
        
        let stepIdx = 0;
        const progressInterval = setInterval(() => {
            if (stepIdx < steps.length) {
                const step = steps[stepIdx];
                if (progressBar) progressBar.style.width = `${step.percent}%`;
                const stepEl = document.getElementById(step.id);
                if (stepEl) {
                    stepEl.classList.add('active');
                    if (stepIdx > 0) document.getElementById(steps[stepIdx-1].id).classList.replace('active', 'done');
                }
                stepIdx++;
            } else {
                clearInterval(progressInterval);
                const ready = document.getElementById('loader-step-ready');
                if(ready) ready.classList.add('active');
                setTimeout(() => {
                    if (loader) loader.classList.add('fade-out');
                    setTimeout(() => {
                        if (loader) loader.classList.add('hidden');
                        if (this.screens.splash) this.screens.splash.classList.remove('hidden');
                    }, 500);
                }, 800);
            }
        }, 300);

        // Splash to Menu
        if (this.screens.splash) {
            window.addEventListener('keydown', (e) => {
                if (!this.screens.splash.classList.contains('hidden')) {
                    this._playClick();
                    this.screens.splash.classList.add('hidden');
                    this.screens.menu.classList.remove('hidden');
                }
            });
        }

        // Main Menu Bindings
        document.getElementById('btn-menu-start')?.addEventListener('click', async () => {
            this._playConfirm();
            this.screens.menu.classList.add('hidden');
            
            if (!this.connection.isConnected) {
                const portVal = this.portSelector ? this.portSelector.value : "";
                const baudVal = this.baudSelector ? parseInt(this.baudSelector.value, 10) : 115200;
                const simVal = this.simModeCheckbox ? this.simModeCheckbox.checked : false;
                const success = await this.connection.connectSerial(portVal, baudVal, simVal);
                if (success && window.onConnectionEstablished) {
                    window.onConnectionEstablished();
                }
            }

            if (window.onStartSimulation) window.onStartSimulation();
        });
        document.getElementById('btn-menu-sim')?.addEventListener('click', () => {
            this._playClick();
            this.toggleDialog('connection', true);
        });
        document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
            this._playClick();
            this.toggleDialog('settings', true);
        });
        
        // Settings Tabs Bindings
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this._playClick();
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.settings-pane').forEach(p => p.classList.add('hidden'));
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-tab');
                document.getElementById(targetId).classList.remove('hidden');
            });
        });

        // Accessibility Checkboxes
        document.getElementById('check-colorblind')?.addEventListener('change', (e) => {
            if(e.target.checked) document.body.classList.add('color-blind');
            else document.body.classList.remove('color-blind');
        });
        document.getElementById('check-large-text')?.addEventListener('change', (e) => {
            if(e.target.checked) document.body.classList.add('large-text');
            else document.body.classList.remove('large-text');
        });
        document.getElementById('check-reduce-motion')?.addEventListener('change', (e) => {
            if(e.target.checked) document.body.classList.add('reduce-motion');
            else document.body.classList.remove('reduce-motion');
        });

        // Wizard Bindings
        let wizardStep = 1;
        document.getElementById('btn-wizard-next')?.addEventListener('click', () => {
            this._playClick();
            if (wizardStep === 1) {
                // handle calibration logic start here internally
                document.getElementById(`wizard-step-${wizardStep}`).classList.add('hidden');
                wizardStep++;
                document.getElementById(`wizard-step-${wizardStep}`).classList.remove('hidden');
                document.getElementById('btn-wizard-next').textContent = "Next";
            } else if (wizardStep < 5) {
                document.getElementById(`wizard-step-${wizardStep}`).classList.add('hidden');
                wizardStep++;
                document.getElementById(`wizard-step-${wizardStep}`).classList.remove('hidden');
                if(wizardStep === 5) {
                    document.getElementById('btn-wizard-next').textContent = "Finish";
                    this.handleCalibration(); // Actually run it or pretend
                }
            } else {
                this.toggleDialog('calibration', false);
                wizardStep = 1;
                // reset visually
                document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
                document.getElementById('wizard-step-1').classList.remove('hidden');
                document.getElementById('btn-wizard-next').textContent = "Start";
            }
        });

        // Photo Mode bindings
        document.getElementById('btn-capture-shot')?.addEventListener('click', () => {
            this._playClick();
            if(window.onCaptureScreenshot) window.onCaptureScreenshot();
        });
        document.getElementById('btn-exit-photo')?.addEventListener('click', () => {
            this._playClick();
            if(this.screens.photo) this.screens.photo.classList.add('hidden');
            if(window.onResumeRequested) window.onResumeRequested();
        });
        
        // Developer overlay toggles on grave accent ` key
        window.addEventListener('keydown', (e) => {
            if(e.key === '`' || e.key === '~') {
                this.togglePerfPanel();
            }
        });

        // Bind Toolbar events
        this.toolbar.connection.addEventListener('click', () => { this._playClick(); this.toggleDialog('connection', true); });
        this.toolbar.calibration.addEventListener('click', () => { this._playClick(); this.toggleDialog('calibration', true); });
        this.toolbar.settings.addEventListener('click', () => { this._playClick(); this.toggleDialog('settings', true); });

        // Bind close buttons
        document.querySelectorAll('.btn-close-dialog').forEach(btn => {
            btn.addEventListener('click', () => {
                this._playClick();
                const target = btn.getAttribute('data-target').replace('dialog-', '');
                this.toggleDialog(target, false);
            });
        });

        // Scan ports on initialization
        this.scanPorts();

        // Scan button action
        this.btnScan?.addEventListener('click', () => { this._playClick(); this.scanPorts(); });

        // Connect button action
        this.btnConnect?.addEventListener('click', () => { this._playClick(); this.handleConnect(); });

        // Calibration action
        this.btnRunCalibration?.addEventListener('click', () => { this._playConfirm(); this.handleCalibration(); });

        // Range Sliders display bindings
        this.deadzoneSlider?.addEventListener('input', (e) => {
            if (this.deadzoneVal) this.deadzoneVal.textContent = e.target.value;
        });

        this.pitchSlider?.addEventListener('input', (e) => {
            if (this.pitchVal) this.pitchVal.textContent = e.target.value;
        });

        // Save Settings action
        this.btnSaveSettings?.addEventListener('click', () => { this._playConfirm(); this.saveSettings(); });

        // Resume button action
        document.getElementById('btn-resume')?.addEventListener('click', () => {
            this._playClick();
            if (window.onResumeRequested) window.onResumeRequested();
        });

        // Restart buttons action
        document.getElementById('btn-restart-paused')?.addEventListener('click', () => {
            this._playConfirm();
            if (window.onRestartRequested) window.onRestartRequested();
        });
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this._playConfirm();
            if (window.onRestartRequested) window.onRestartRequested();
        });

        // ESC key binding to toggle pause state
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (window.onPauseToggleRequested) window.onPauseToggleRequested();
                e.preventDefault();
            }
        });
    }

    /**
     * @brief Shows or hides dialog card overlays.
     */
    toggleDialog(name, show) {
        const overlay = this.dialogs[name];
        if (!overlay) return;
        
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    /**
     * @brief Scans and populates dropdown ports selector.
     */
    async scanPorts() {
        this.portSelector.innerHTML = '<option value="">Scanning...</option>';
        const ports = await this.connection.getAvailablePorts();
        
        this.portSelector.innerHTML = '';
        ports.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.port;
            opt.textContent = p.description || p.port;
            this.portSelector.appendChild(opt);
        });
        this.showNotification('info', `Port scan completed. Detected ${ports.length} interfaces.`);
    }

    /**
     * @brief Initiates serial link connectivity.
     */
    async handleConnect() {
        const port = this.portSelector.value;
        const baud = parseInt(this.baudSelector.value, 10);
        const isSim = this.simModeCheckbox.checked;

        if (!port && !isSim) {
            this.showNotification('error', 'Select a serial port or enable Simulation Mode.');
            return;
        }

        this.btnConnect.disabled = true;
        this.btnConnect.textContent = "Connecting...";

        const success = await this.connection.connectSerial(port, baud, isSim);
        
        this.btnConnect.disabled = false;
        this.btnConnect.textContent = "Establish Link";

        if (success) {
            const label = isSim ? "Simulation Mode" : `Connected (${port})`;
            const type = isSim ? 'simulating' : 'connected';
            this.updateConnectionHUD(type, label);
            this.toggleDialog('connection', false);
            this.showNotification('success', `Established link: ${label}`);
            
            // Dispatch start trigger callback
            if (window.onConnectionEstablished) {
                window.onConnectionEstablished();
            }
        } else {
            this.showNotification('error', `Failed to open connection to ${port}`);
        }
    }

    /**
     * @brief Disconnects serial link.
     */
    async handleDisconnect() {
        const success = await this.connection.disconnectSerial();
        if (success) {
            this.updateConnectionHUD('disconnected', 'DISCONNECTED');
            this.showNotification('info', 'Serial connection closed.');
        }
    }

    /**
     * @brief Runs offset calibrations using visual progress bars.
     */
    async handleCalibration() {
        if (!this.connection.isConnected) {
            this.showNotification('warning', 'Connect the controller before executing calibration.');
            return;
        }

        this.btnRunCalibration.disabled = true;
        this.calProgressContainer.classList.remove('hidden');
        this.calProgressBar.style.width = '0%';

        // Animate progress bar to 100% (Simulating hardware settle duration)
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            this.calProgressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                this._completeCalibration();
            }
        }, 150);
    }

    /**
     * @private
     */
    async _completeCalibration() {
        try {
            const offsets = await this.connection.triggerCalibration();
            this.showNotification('success', `Calibration complete! Offsets locked.`);
            this.toggleDialog('calibration', false);
        } catch (e) {
            this.showNotification('error', `Calibration failed: ${e.message}`);
        } finally {
            this.btnRunCalibration.disabled = false;
            this.calProgressContainer.classList.add('hidden');
            this.calProgressBar.style.width = '0%';
        }
    }

    /**
     * @brief Commits modified configurations to local storage.
     */
    saveSettings() {
        this.settings.steerDeadzone = parseFloat(this.deadzoneSlider.value);
        this.settings.pitchLimit = parseFloat(this.pitchSlider.value);
        this.settings.enableAudio = this.audioCheckbox.checked;

        try {
            localStorage.setItem('velocity_ai_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn("[UI] Error saving configuration: ", e);
        }

        this.showNotification('success', 'Simulator configurations saved and persisted.');
        this.toggleDialog('settings', false);
    }

    /**
     * @brief Loads and restores persisted configurations from local storage.
     */
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('velocity_ai_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.steerDeadzone !== undefined) this.settings.steerDeadzone = parsed.steerDeadzone;
                if (parsed.pitchLimit !== undefined) this.settings.pitchLimit = parsed.pitchLimit;
                if (parsed.enableAudio !== undefined) this.settings.enableAudio = parsed.enableAudio;

                // Sync UI elements values directly
                window.addEventListener('DOMContentLoaded', () => {
                    if (this.deadzoneSlider) {
                        this.deadzoneSlider.value = this.settings.steerDeadzone;
                        this.deadzoneVal.textContent = this.settings.steerDeadzone.toFixed(1);
                    }
                    if (this.pitchSlider) {
                        this.pitchSlider.value = this.settings.pitchLimit;
                        this.pitchVal.textContent = this.settings.pitchLimit;
                    }
                    if (this.audioCheckbox) {
                        this.audioCheckbox.checked = this.settings.enableAudio;
                    }
                });
            }
        } catch (e) {
            console.warn("[UI] Error loading configurations: ", e);
        }
    }

    /**
     * @brief Creates and slides in a notification element.
     * @param {string} type Notification type ('success', 'error', 'warning', 'info')
     * @param {string} message Log string content
     */
    showNotification(type, message) {
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        
        const header = document.createElement('span');
        header.className = 'notif-header';
        header.textContent = type;
        
        const body = document.createElement('p');
        body.className = 'notif-message';
        body.textContent = message;

        notif.appendChild(header);
        notif.appendChild(body);
        
        this.notifContainer.appendChild(notif);

        // Slide out and remove element after 3 seconds
        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => {
                notif.remove();
            }, 300);
        }, 3000);
    }

    /**
     * @brief Updates color classes and text on connection status panels.
     */
    updateConnectionHUD(type, label) {
        this.statusDot.className = 'dot';
        this.simModeIndicator.classList.add('hidden');

        if (type === 'connected') {
            this.statusDot.classList.add('connected');
            this.statusLabel.textContent = label;
        } else if (type === 'simulating') {
            this.statusDot.classList.add('simulating');
            this.statusLabel.textContent = "SIMULATOR";
            this.simModeIndicator.classList.remove('hidden');
        } else {
            this.statusDot.classList.add('disconnected');
            this.statusLabel.textContent = "DISCONNECTED";
        }
    }

    /**
     * @brief Updates numerical HUD values from serial telemetry.
     */
    updateHUDTelemetry(data) {
        // 1. Update text telemetry values inside calibration screen
        if (this.calRoll && this.calPitch) {
            this.calRoll.textContent = `${data.roll.toFixed(1)}°`;
            this.calPitch.textContent = `${data.pitch.toFixed(1)}°`;
        }
        
        const cR1 = document.getElementById('cal-roll-1');
        const cP1 = document.getElementById('cal-pitch-1');
        const cR2 = document.getElementById('cal-roll-2');
        const cR3 = document.getElementById('cal-roll-3');
        const cP4 = document.getElementById('cal-pitch-4');
        if (cR1) cR1.textContent = `${data.roll.toFixed(1)}°`;
        if (cP1) cP1.textContent = `${data.pitch.toFixed(1)}°`;
        if (cR2) cR2.textContent = `${data.roll.toFixed(1)}°`;
        if (cR3) cR3.textContent = `${data.roll.toFixed(1)}°`;
        if (cP4) cP4.textContent = `${data.pitch.toFixed(1)}°`;

        // 2. Proximity updates
        this.hudProximityVal.textContent = data.proximity;
        const proxPercent = Math.min(100, (data.proximity / 255.0) * 100);
        this.hudProximityBar.style.width = `${proxPercent}%`;

        // 3. Color sensor updates
        const colorObj = data.color || { r: 0, g: 0, b: 0, c: 0 };
        this.colorR.textContent = colorObj.r;
        this.colorG.textContent = colorObj.g;
        this.colorB.textContent = colorObj.b;
        
        // Dynamic preview box coloring (convert raw 16-bit or 0-255 channels to CSS RGB)
        // Check if values exceed 255 (e.g. 16-bit from hardware), normalize if so
        const maxVal = Math.max(colorObj.r, colorObj.g, colorObj.b, 255);
        const rNorm = Math.floor((colorObj.r / maxVal) * 255);
        const gNorm = Math.floor((colorObj.g / maxVal) * 255);
        const bNorm = Math.floor((colorObj.b / maxVal) * 255);
        
        this.colorPreview.style.backgroundColor = `rgb(${rNorm}, ${gNorm}, ${bNorm})`;
        this.colorPreview.style.boxShadow = `0 0 10px rgb(${rNorm}, ${gNorm}, ${bNorm})`;

        // 4. Gesture text update
        this.hudGesture.textContent = data.interpreted_gesture || "NONE";
        
        // Color alert tags
        this.hudGesture.className = 'hud-value-alert';
        if (data.interpreted_gesture === "Boost") {
            this.hudGesture.style.color = 'var(--accent-cyan)';
        } else if (data.interpreted_gesture === "Handbrake") {
            this.hudGesture.style.color = 'var(--accent-red)';
        } else if (data.interpreted_gesture && data.interpreted_gesture.includes("Drift")) {
            this.hudGesture.style.color = 'var(--accent-purple)';
        } else {
            this.hudGesture.style.color = 'var(--text-primary)';
        }

        // 5. Diagnostics
        if (data.packet_loss_rate !== undefined) {
            this.hudLoss.textContent = `${(data.packet_loss_rate * 100).toFixed(1)}%`;
        }
    }

    /**
     * @brief Updates FPS count panel.
     */
    updateFPS(fps) {
        this.hudFps.textContent = Math.round(fps);
    }

    /**
     * @brief Animates RPM gauge bar with redline color markers.
     */
    updateRPM(rpmRatio) {
        if (this.hudRpmBar) {
            this.hudRpmBar.style.width = `${rpmRatio * 100.0}%`;
            if (rpmRatio > 0.85) {
                this.hudRpmBar.style.backgroundColor = 'var(--accent-red)';
            } else if (rpmRatio > 0.6) {
                this.hudRpmBar.style.backgroundColor = 'var(--accent-orange)';
            } else {
                this.hudRpmBar.style.backgroundColor = 'var(--accent-cyan)';
            }
        }
    }

    /**
     * @brief Displays final scores on Game Over screen cards.
     */
    showGameOverScreen(score, nearMiss, collisions) {
        const outScore = document.getElementById('game-over-score');
        const outNearMiss = document.getElementById('game-over-near-miss');
        const outCollisions = document.getElementById('game-over-collisions');

        if (outScore) outScore.textContent = String(score).padStart(6, '0');
        if (outNearMiss) outNearMiss.textContent = nearMiss;
        if (outCollisions) outCollisions.textContent = collisions;
        
        this.toggleDialog('gameover', true);
    }
    
    /**
     * @brief Updates Dev Overlay with performance metrics
     */
    updatePerformancePanel(metrics) {
        if (!this.screens.perf || this.screens.perf.classList.contains('hidden')) return;
        
        document.getElementById('perf-fps').textContent = metrics.fps;
        document.getElementById('perf-frametime').textContent = metrics.frameTime + "ms";
        document.getElementById('perf-cpu').textContent = metrics.cpuEst + "%";
        document.getElementById('perf-mem').textContent = metrics.memEst + "MB";
        document.getElementById('perf-draws').textContent = metrics.drawCalls;
        document.getElementById('perf-particles').textContent = metrics.particles;
        document.getElementById('perf-audio').textContent = metrics.audioNodes;
        document.getElementById('perf-lat').textContent = metrics.latency + "ms";
        document.getElementById('perf-pkt').textContent = metrics.packetLoss + "%";
    }
    
    togglePerfPanel() {
        if(this.screens.perf) {
            this.screens.perf.classList.toggle('hidden');
        }
    }
}

window.DashboardUI = DashboardUI;
