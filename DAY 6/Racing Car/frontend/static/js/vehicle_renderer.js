/**
 * @file vehicle_renderer.js
 * @brief High-fidelity sports car renderer generating a detailed vector supercar.
 * 
 * Generates carbon-fiber accents, alloy sports rims, calipers, brake discs,
 * side mirrors, rear spoilers, diffusers, taillights, dynamic headlight projections,
 * skidding/acceleration smoke puffs, and modular structural damage overlays.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class VehicleRenderer {
    /**
     * @brief Constructor for the vehicle renderer.
     * @param {CanvasRenderingContext2D} ctx Drawing context
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.wheelSpinAngle = 0.0;
        
        // Exhaust smoke particle list (prevents garbage collection leaks)
        this.smokePuffs = [];
        this.maxSmokePuffs = 40;
    }

    /**
     * @brief Steps coordinates and paints the procedural sports car.
     * @param {Player} player Vehicle physics state model
     * @param {Controls} controls Active driver input maps
     * @param {DamageSystem} damageSystem Damage monitor
     * @param {number} dt Time step in seconds
     * @param {DayNightManager} daynight Environment daylight clock
     * @param {WeatherManager} weather Ambient weather system
     */
    draw(player, controls, damageSystem, dt, daynight, weather) {
        const canvas = this.ctx.canvas;
        const w = canvas.width;
        const h = canvas.height;

        // Default daynight fallback parameters if arguments are missing
        const hour = daynight ? daynight.time : 12.0;
        const fog = weather ? weather.fogDensity : 0.05;
        const rain = weather ? weather.rainIntensity : 0.0;

        // 1. Establish central anchor coordinates with steering lanes offset
        const screenX = (w / 2) + (player.steerAngle * 25.0);
        
        // Combine vertical oscillation (bounce) and suspension pitch Y (squat/dive)
        const screenY = h - 140 + player.bounce + player.suspensionY;

        this.wheelSpinAngle += player.speed * 0.12 * dt;

        // 2. Draw Dynamic Headlights Cones (cracks left beam when damaged)
        this._drawHeadlights(screenX, screenY, w, h, damageSystem, hour, fog, rain);

        // 3. Draw Ground Reflection (glossy road specular clone)
        this._drawGroundReflection(screenX, screenY, player, controls);

        // 4. Draw Drop Shadow
        this._drawShadow(screenX, screenY);

        // 5. Draw Front & Rear Tires (Front wheels turn; Rears straight)
        this._drawWheels(screenX, screenY, player.steerAngle, controls);

        // 6. Draw Motion Blur trail at high speed
        if (player.speed > 1800.0) {
            this._drawMotionBlurGhosts(screenX, screenY, player, controls);
        }

        // 7. Render Exhaust Smoke Particle system
        this._updateAndDrawSmoke(screenX, screenY, player, controls, dt);

        // 8. Draw Main Body panels with suspension roll tilt transformations
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(player.bodyRoll);

        this._drawChassisCoupe(damageSystem);
        this._drawTaillightsLED(controls, hour);
        this._drawExhaustFlamesBoost(controls);

        this.ctx.restore();
    }

    /**
     * @brief Projects headlight light cones forward, scaling intensity with ambient light.
     * @private
     */
    _drawHeadlights(x, y, canvasW, canvasH, damage, hour, fog, rain) {
        // Disabled at 0% health
        if (damage.health <= 0.0) return;

        this.ctx.save();

        // Calculate intensity based on time of day (stronger at night/evening/morning)
        let intensity = 0.12; // base day intensity
        if (hour < 6.0 || hour > 18.0) {
            intensity = 0.55; // full night glow
        } else if (hour < 8.0 || hour > 16.0) {
            intensity = 0.32; // dusk/dawn glow
        }

        // Fog/Rain boost headlight visibility due to beam scattering
        if (fog > 0.3) intensity = Math.min(0.7, intensity + fog * 0.3);
        if (rain > 0.3) intensity = Math.min(0.7, intensity + rain * 0.2);

        // Left headlight cracked check
        const drawLeft = !damage.isHeadlightBroken;
        const drawRight = true;

        const coneLength = 260.0;

        if (drawLeft) {
            const leftGrad = this.ctx.createLinearGradient(x - 30, y - 10, x - 130, y - coneLength);
            leftGrad.addColorStop(0, `rgba(254, 252, 232, ${intensity})`);
            leftGrad.addColorStop(1, 'rgba(254, 252, 232, 0.0)');

            this.ctx.fillStyle = leftGrad;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 36, y - 8);
            this.ctx.lineTo(x - 140, y - coneLength + 30);
            this.ctx.lineTo(x - 20, y - coneLength);
            this.ctx.closePath();
            this.ctx.fill();
        }

        if (drawRight) {
            const rightGrad = this.ctx.createLinearGradient(x + 30, y - 10, x + 130, y - coneLength);
            rightGrad.addColorStop(0, `rgba(254, 252, 232, ${intensity})`);
            rightGrad.addColorStop(1, 'rgba(254, 252, 232, 0.0)');

            this.ctx.fillStyle = rightGrad;
            this.ctx.beginPath();
            this.ctx.moveTo(x + 36, y - 8);
            this.ctx.lineTo(x + 20, y - coneLength);
            this.ctx.lineTo(x + 140, y - coneLength + 30);
            this.ctx.closePath();
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    /**
     * @brief Paints a faint mirrored body silhouette on the tarmac.
     * @private
     */
    _drawGroundReflection(x, y, player, controls) {
        const speedRatio = player.speed / player.maxSpeed;
        if (speedRatio < 0.05) return;

        this.ctx.save();
        
        // Mirror vertical scale and make transparent
        this.ctx.translate(x, y + 42);
        this.ctx.scale(1, -0.22);
        this.ctx.translate(-x, -(y + 42));

        // Soft blurred red gloss
        this.ctx.fillStyle = 'rgba(220, 38, 38, 0.07)';
        this.ctx.beginPath();
        this.ctx.roundRect(x - 46, y - 10, 92, 45, 12);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * @brief Paints a soft drop shadow beneath the tires.
     * @private
     */
    _drawShadow(x, y) {
        this.ctx.save();
        
        // Center shadow
        const shadowGrad = this.ctx.createRadialGradient(x, y + 36, 10, x, y + 36, 75);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
        shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        this.ctx.fillStyle = shadowGrad;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 36, 72, 14, 0, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * @brief Draws tires with inner brake calipers, discs, and alloy spokes.
     * @private
     */
    _drawWheels(x, y, steerAngle, controls) {
        const wheelW = 14;
        const wheelH = 32;

        const isBraking = controls.brake > 0.05 || controls.handbrake;

        // 1. Rear Tires (straight)
        this._paintWheel(x - 53, y + 16, wheelW, wheelH, 0.0, this.wheelSpinAngle, isBraking);
        this._paintWheel(x + 53, y + 16, wheelW, wheelH, 0.0, this.wheelSpinAngle, isBraking);

        // 2. Front Tires (steer angle rot)
        const frontSteer = steerAngle * 0.38;
        this._paintWheel(x - 51, y - 20, wheelW, wheelH, frontSteer, this.wheelSpinAngle, isBraking);
        this._paintWheel(x + 51, y - 20, wheelW, wheelH, frontSteer, this.wheelSpinAngle, isBraking);
    }

    /**
     * @brief Helper to paint tires with sports rims and caliper glow.
     * @private
     */
    _paintWheel(wx, wy, w, h, steer, spin, isBraking) {
        this.ctx.save();
        this.ctx.translate(wx, wy);
        this.ctx.rotate(steer);

        // Black tyre rubber
        this.ctx.fillStyle = '#090d16';
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(-w / 2, -h / 2, w, h, 6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Sidewall treads lines
        this.ctx.strokeStyle = '#111827';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-w / 2, -h / 4);
        this.ctx.lineTo(w / 2, -h / 4);
        this.ctx.moveTo(-w / 2, h / 4);
        this.ctx.lineTo(w / 2, h / 4);
        this.ctx.stroke();

        // 2. Sports alloy Rims center hub
        const rimR = w / 2 - 1.5;
        this.ctx.fillStyle = '#334155'; // dark alloy body
        this.ctx.beginPath();
        this.ctx.arc(0, 0, rimR, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. Brake Disc (Steel plate inside rim)
        this.ctx.fillStyle = '#64748b';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, rimR - 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // 4. Brake Caliper (Neon Orange/Red, glowing when braking)
        this.ctx.fillStyle = isBraking ? '#ff3d6e' : '#ea580c';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, rimR - 1.5, -Math.PI / 4, Math.PI / 6);
        this.ctx.lineTo(0, 0);
        this.ctx.closePath();
        this.ctx.fill();

        // 5. Spokes spin lines (blur spokes if speed is high)
        this.ctx.strokeStyle = '#cbd5e1'; // Silver spokes
        this.ctx.lineWidth = 1.5;
        
        const spokesCount = 5;
        for (let i = 0; i < spokesCount; i++) {
            const angle = spin + (i * Math.PI * 2 / spokesCount);
            const sx = Math.cos(angle) * rimR;
            const sy = Math.sin(angle) * rimR;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(sx, sy);
            this.ctx.stroke();
        }

        // Center nut highlight
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * @brief Renders ghosting overlays trailing behind.
     * @private
     */
    _drawMotionBlurGhosts(x, y, player, controls) {
        this.ctx.save();
        const ghostCount = 2;
        const speedRatio = player.speed / player.maxSpeed;

        for (let i = 1; i <= ghostCount; i++) {
            // Displace Z backwards on the canvas
            const offset = -i * speedRatio * 18.0;
            this.ctx.save();
            this.ctx.translate(x, y + offset);
            this.ctx.rotate(player.bodyRoll);
            
            // Faint red translucent silhouette
            this.ctx.fillStyle = `rgba(220, 38, 38, ${0.15 / i})`;
            this.ctx.beginPath();
            this.ctx.roundRect(-46, -14, 92, 45, 12);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        }
        this.ctx.restore();
    }

    /**
     * @brief Spawns and paints grey smoke particle circles.
     * @private
     */
    _updateAndDrawSmoke(x, y, player, controls, dt) {
        // Spawn smoke if speed is not too high
        if (player.speed < 1700.0) {
            let spawnChance = 0.05; // base idle
            if (controls.throttle > 0) spawnChance = 0.22; // heavy accel
            if (player.isOffRoad) spawnChance = 0.45;     // off-road dust kicking

            if (Math.random() < spawnChance) {
                const color = player.isOffRoad ? '#78350f' : '#cbd5e1'; // brown dirt or white exhaust smoke
                const opacity = player.isOffRoad ? 0.35 : 0.45;

                // Left exhaust
                this._spawnSmokePuff(x - 26, y + 26, color, opacity);
                // Right exhaust
                this._spawnSmokePuff(x + 26, y + 26, color, opacity);
            }
        }

        // Update and draw particles list
        const activePuffs = [];
        this.ctx.save();

        for (let i = 0; i < this.smokePuffs.length; i++) {
            const p = this.smokePuffs[i];
            
            // Move backwards relative to screenY
            p.y += p.vy * dt;
            p.x += p.vx * dt;
            p.size += 24.0 * dt; // expand
            p.alpha -= 1.1 * dt; // fade

            if (p.alpha > 0) {
                activePuffs.push(p);

                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.alpha;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.restore();
        this.smokePuffs = activePuffs;
    }

    /**
     * @private
     */
    _spawnSmokePuff(ex, ey, color, opacity) {
        if (this.smokePuffs.length >= this.maxSmokePuffs) {
            this.smokePuffs.shift();
        }
        this.smokePuffs.push({
            x: ex + (Math.random() * 4.0 - 2.0),
            y: ey + (Math.random() * 2.0 - 1.0),
            vx: Math.random() * 25.0 - 12.5,
            vy: Math.random() * 20.0 + 35.0, // floats downwards in screen coordinates
            size: Math.random() * 3.0 + 3.0,
            alpha: opacity,
            color: color
        });
    }

    /**
     * @brief Renders the sports coupe body shapes, windows, deck, and damage scars.
     * @private
     */
    _drawChassisCoupe(damage) {
        const hp = damage.health;
        const isCrooked = hp <= 0.0;

        // 1. Carbon Splitter Front lip (sides extending)
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(-51, -120, 102, 6);

        // 2. Wide sports carbon diffuser (bottom tail)
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(-46, 26, 92, 8);
        
        // Diffuser fin segments
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-30, 26, 3, 10);
        this.ctx.fillRect(-15, 26, 3, 10);
        this.ctx.fillRect(12, 26, 3, 10);
        this.ctx.fillRect(27, 26, 3, 10);

        // 3. Exhaust Pipes
        this.ctx.fillStyle = '#64748b';
        this.ctx.beginPath();
        this.ctx.arc(-26, 26, 4, 0, Math.PI * 2);
        this.ctx.arc(26, 26, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // 4. Main body color panel (coupe shape)
        // Neon red/orange metallic paint gradients
        const bodyGrad = this.ctx.createLinearGradient(-48, 0, 48, 0);
        bodyGrad.addColorStop(0, '#7f1d1d');   // dark shadow border
        bodyGrad.addColorStop(0.2, '#dc2626'); // red specular
        bodyGrad.addColorStop(0.5, '#ef4444'); // mid panel reflection
        bodyGrad.addColorStop(0.8, '#dc2626');
        bodyGrad.addColorStop(1, '#7f1d1d');

        this.ctx.fillStyle = bodyGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(-48, -114); // front hood tip
        this.ctx.lineTo(48, -114);
        this.ctx.lineTo(51, -24);   // rear flare arch
        this.ctx.lineTo(46, 24);    // bumper corners
        this.ctx.lineTo(-46, 24);
        this.ctx.lineTo(-51, -24);
        this.ctx.closePath();
        this.ctx.fill();

        // Visual panel highlights (metallic lines)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(-44, -110);
        this.ctx.lineTo(-47, -24);
        this.ctx.moveTo(44, -110);
        this.ctx.lineTo(47, -24);
        this.ctx.stroke();

        // 5. Door outlines (panel shapes highlights)
        this.ctx.strokeStyle = '#991b1b';
        this.ctx.beginPath();
        this.ctx.moveTo(-45, -70);
        this.ctx.lineTo(-48, -26);
        this.ctx.moveTo(45, -70);
        this.ctx.lineTo(48, -26);
        this.ctx.stroke();

        // 6. Air Intake scoops (deck vents & hood vents)
        this.ctx.fillStyle = '#111827';
        // Hood scoops
        this.ctx.fillRect(-22, -100, 8, 12);
        this.ctx.fillRect(14, -100, 8, 12);
        // Louvers/cooling grilles on engine deck
        this.ctx.fillRect(-28, 2, 56, 3);
        this.ctx.fillRect(-24, 8, 48, 3);

        // 7. Roof & Side window glass columns
        this.ctx.fillStyle = '#111827';
        this.ctx.beginPath();
        this.ctx.moveTo(-32, -80);
        this.ctx.lineTo(32, -80);
        this.ctx.lineTo(36, -26);
        this.ctx.lineTo(-36, -26);
        this.ctx.closePath();
        this.ctx.fill();

        // Side windows
        const windowGrad = this.ctx.createLinearGradient(-35, 0, 35, 0);
        windowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.65)'); // light blue glass
        windowGrad.addColorStop(0.2, 'rgba(15, 23, 42, 0.9)');
        windowGrad.addColorStop(0.8, 'rgba(15, 23, 42, 0.9)');
        windowGrad.addColorStop(1, 'rgba(56, 189, 248, 0.65)');
        this.ctx.fillStyle = windowGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(-31, -78);
        this.ctx.lineTo(31, -78);
        this.ctx.lineTo(35, -28);
        this.ctx.lineTo(-35, -28);
        this.ctx.closePath();
        this.ctx.fill();

        // 8. Glossy Windshield & rear glass (with reflections slash)
        const rearWindshieldGrad = this.ctx.createLinearGradient(0, -56, 0, -28);
        rearWindshieldGrad.addColorStop(0, '#0f172a');
        rearWindshieldGrad.addColorStop(1, '#1e293b');

        this.ctx.fillStyle = rearWindshieldGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(-28, -56);
        this.ctx.lineTo(28, -56);
        this.ctx.lineTo(32, -28);
        this.ctx.lineTo(-28, -28);
        this.ctx.closePath();
        this.ctx.fill();

        // Glass sunlight reflections line slash
        const glareX = (Date.now() / 1500) % 20 - 10; // animated reflection
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        this.ctx.beginPath();
        this.ctx.moveTo(-16 + glareX, -56);
        this.ctx.lineTo(-4 + glareX, -56);
        this.ctx.lineTo(6 + glareX, -28);
        this.ctx.lineTo(-6 + glareX, -28);
        this.ctx.closePath();
        this.ctx.fill();

        // 9. Side mirrors
        this.ctx.fillStyle = '#0f172a'; // Carbon housings
        this.ctx.fillRect(-45, -74, 8, 4);
        this.ctx.fillRect(37, -74, 8, 4);

        // 10. License plate ("VEL-AI" tag)
        this.ctx.fillStyle = '#facc15'; // yellow plate
        this.ctx.fillRect(-14, 12, 28, 8);
        this.ctx.fillStyle = '#000000';
        this.ctx.font = "bold 6px 'Orbitron', sans-serif";
        this.ctx.textAlign = 'center';
        this.ctx.fillText("VEL-AI", 0, 18);

        // 11. Rear Spoiler / Wing (Tilted spoiler wing on damage checks)
        this.ctx.save();
        if (hp <= 25.0) {
            // Left end tilted down
            this.ctx.rotate(0.08); 
        }

        // Struts supports
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(-35, 12, 4, 10);
        this.ctx.fillRect(31, 12, 4, 10);

        // Carbon Main spoiler blade
        this.ctx.fillStyle = '#090d16'; // carbon dark black
        this.ctx.beginPath();
        this.ctx.roundRect(-54, 20, 108, 6, 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Spoiler endplates
        this.ctx.fillStyle = '#ea580c';
        this.ctx.fillRect(-56, 17, 3, 10);
        this.ctx.fillRect(53, 17, 3, 10);
        this.ctx.restore();

        // 12. Visual Damage scars overlays
        this._drawDamageScars(hp);
    }

    /**
     * @brief Draws LED taillights bar loops.
     * @private
     */
    _drawTaillightsLED(controls, hour) {
        const isBraking = controls.brake > 0.05 || controls.handbrake;
        
        this.ctx.save();

        let baseAlpha = 0.45;
        if (hour < 6.0 || hour > 19.0) baseAlpha = 0.85; // night taillight illumination

        if (isBraking) {
            this.ctx.shadowColor = 'var(--accent-red)';
            this.ctx.shadowBlur = 18;
            this.ctx.fillStyle = 'var(--accent-red)';
            this.ctx.globalAlpha = 1.0;
        } else {
            this.ctx.shadowColor = '#991b1b';
            this.ctx.shadowBlur = 3;
            this.ctx.fillStyle = '#dc2626';
            this.ctx.globalAlpha = baseAlpha;
        }

        // Left brake loop
        this.ctx.fillRect(-45, -4, 18, 4);
        // Right brake loop
        this.ctx.fillRect(27, -4, 18, 4);

        this.ctx.restore();
    }

    /**
     * @brief Projects dual exhaust turbo flames (boost active only).
     * @private
     */
    _drawExhaustFlamesBoost(controls) {
        if (!controls.boost) return;

        this.ctx.save();

        // Random height flicker
        const flameLen = 18 + Math.random() * 24;

        this.ctx.shadowColor = 'var(--accent-cyan)';
        this.ctx.shadowBlur = 14;

        // Outer cyan flame
        this.ctx.fillStyle = 'var(--accent-cyan)';
        this.ctx.beginPath();
        this.ctx.moveTo(-28, 26);
        this.ctx.lineTo(-24, 26);
        this.ctx.lineTo(-26, 26 + flameLen);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(24, 26);
        this.ctx.lineTo(28, 26);
        this.ctx.lineTo(26, 26 + flameLen);
        this.ctx.closePath();
        this.ctx.fill();

        // Inner white hot core
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(-27, 26);
        this.ctx.lineTo(-25, 26);
        this.ctx.lineTo(-26, 26 + flameLen * 0.55);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(25, 26);
        this.ctx.lineTo(27, 26);
        this.ctx.lineTo(26, 26 + flameLen * 0.55);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * @brief Draws paint scratches and glass cracks under damage checks.
     * @private
     */
    _drawDamageScars(hp) {
        this.ctx.save();

        // Paint scratches at < 75%
        if (hp <= 75.0) {
            this.ctx.strokeStyle = '#4b5563';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            
            // Rear bumper left scratch
            this.ctx.moveTo(-42, 6);
            this.ctx.lineTo(-34, 12);
            
            // Side scoop right scratch
            this.ctx.moveTo(42, -18);
            this.ctx.lineTo(36, -12);
            this.ctx.lineTo(40, -8);
            this.ctx.stroke();
        }

        // Rear glass crack lines at < 50%
        if (hp <= 50.0) {
            this.ctx.strokeStyle = '#cbd5e1';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            
            // Impact point
            const cx = -12;
            const cy = -42;
            this.ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            
            // Ray cracks
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx - 10, cy - 8);
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + 8, cy - 10);
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + 12, cy + 8);
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx - 8, cy + 12);
            
            this.ctx.stroke();
        }

        // Crooked paneling at 0%
        if (hp <= 0.0) {
            this.ctx.fillStyle = '#0f172a';
            this.ctx.beginPath();
            // hanging rear trim corner
            this.ctx.roundRect(-42, 22, 12, 10, 2);
            this.ctx.closePath();
            this.ctx.fill();
        }

        this.ctx.restore();
    }
}

window.VehicleRenderer = VehicleRenderer;
