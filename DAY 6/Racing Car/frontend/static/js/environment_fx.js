/**
 * @file environment_fx.js
 * @brief Dynamic atmospheric overlay system.
 *
 * Manages rain, leaves, birds, butterflies, pollen, dust motes, moving clouds,
 * star field, Milky Way, and animated grass strips. All particle arrays are
 * recycled in-place to prevent garbage collection pressure.
 *
 * Public API (unchanged): update(dt, weather, playerSpeed, canvasW, canvasH), draw(ctx), reset()
 *
 * Author: Sagar Kumar
 * Date: 2026
 */

class EnvironmentFX {
    constructor() {
        this.rainDrops  = [];
        this.leaves     = [];
        this.birds      = [];
        this.butterflies = [];
        this.pollenDots  = [];
        this.dustMotes   = [];
        this.fish        = [];
        this.deer        = [];
        this.mist        = [];

        this.wind        = 0.0;

        // Moving clouds (receive data from DayNightManager via draw())
        this._cloudTime  = 0.0;

        // Grass blades — fixed array of 30 blade positions
        this._grassBlades = [];
        for (let i = 0; i < 30; i++) {
            this._grassBlades.push({ x: i / 30.0, phase: Math.random() * Math.PI * 2 });
        }

        // Biome state (set externally by game.js via setter if needed; defaults to plains)
        this.currentBiome = 'plains';

        // Time reference for star twinkling
        this._time = 0.0;
    }

    /**
     * @brief Steps all particle systems forward.
     * @param {number} dt Delta time seconds
     * @param {WeatherManager} weather
     * @param {number} playerSpeed
     * @param {number} canvasW
     * @param {number} canvasH
     */
    update(dt, weather, playerSpeed, canvasW, canvasH) {
        if (dt <= 0) return;
        this._time += dt;
        this._cloudTime += dt;

        const biome = this.currentBiome || 'plains';

        // 1. Rain drops
        const targetRain = Math.floor(weather.rainIntensity * 160);
        if (this.rainDrops.length < targetRain) {
            const count = Math.min(10, targetRain - this.rainDrops.length);
            for (let i = 0; i < count; i++) {
                this.rainDrops.push({ x: Math.random()*canvasW, y: Math.random()*-100, speed: Math.random()*500+800, length: Math.random()*8+12 });
            }
        }
        for (let i = 0; i < this.rainDrops.length; i++) {
            const d = this.rainDrops[i];
            d.y += d.speed * dt;
            d.x += (-140 - playerSpeed * 0.08) * dt;
            if (d.y > canvasH || d.x < 0) { d.y = Math.random()*-50; d.x = Math.random()*canvasW; }
        }
        if (this.rainDrops.length > targetRain) this.rainDrops.length = targetRain;

        // 2. Wind-blown leaves (forest / village / farmland)
        const leafBiomes = ['forest', 'village', 'farmland', 'mountain'];
        if (leafBiomes.includes(biome) && this.leaves.length < 18 && Math.random() < 0.05) {
            this.leaves.push({ x: canvasW+50, y: canvasH*0.4+Math.random()*canvasH*0.4, vx: -Math.random()*200-150, vy: Math.random()*60-20, color: Math.random()<0.5?'#f59e0b':'#15803d', size: Math.random()*5+3, spin: Math.random()*Math.PI*2 });
        }
        for (let i = this.leaves.length - 1; i >= 0; i--) {
            const l = this.leaves[i];
            l.x += l.vx*dt; l.y += l.vy*dt; l.spin += 4*dt;
            if (l.x < -20 || l.y > canvasH) { l.x = canvasW+50; l.y = canvasH*0.4+Math.random()*canvasH*0.4; }
        }

        // 3. Bird flock (V-formation)
        if (this.birds.length < 8 && Math.random() < 0.004) {
            const leaderY = canvasH * 0.08 + Math.random() * canvasH * 0.18;
            for (let b = 0; b < 6; b++) {
                this.birds.push({
                    x: -60 - b * 14, y: leaderY + Math.abs(b - 3) * 10 * (Math.random() > 0.5 ? 1 : -1),
                    vx: Math.random()*70+55, vy: Math.random()*8-3,
                    wingState: Math.random()*Math.PI*2, dead: false
                });
            }
        }
        for (let i = this.birds.length - 1; i >= 0; i--) {
            const b = this.birds[i];
            b.x += b.vx * dt; b.y += b.vy * dt; b.wingState += 10 * dt;
            if (b.x > canvasW + 60) b.dead = true;
        }
        this.birds = this.birds.filter(b => !b.dead);

        // 4. Butterflies (forest / village / farmland)
        const bfBiomes = ['forest', 'village', 'farmland', 'lakeside'];
        if (bfBiomes.includes(biome) && this.butterflies.length < 6 && Math.random() < 0.006) {
            this.butterflies.push({ x: Math.random()*canvasW, y: canvasH*0.5+Math.random()*canvasH*0.35, vx: (Math.random()-0.5)*60, vy: (Math.random()-0.5)*30, wing: 0, color: Math.random()<0.5?'#fbbf24':'#f9a8d4', life: 6+Math.random()*6 });
        }
        for (let i = this.butterflies.length - 1; i >= 0; i--) {
            const bf = this.butterflies[i];
            bf.x += bf.vx*dt + Math.sin(this._time*2+i)*15*dt;
            bf.y += bf.vy*dt + Math.cos(this._time*1.5+i)*10*dt;
            bf.wing += 14*dt;
            bf.life -= dt;
            if (bf.life <= 0 || bf.x < 0 || bf.x > canvasW || bf.y > canvasH) this.butterflies.splice(i,1);
        }

        // 5. Pollen dust (plains / farmland / lakeside)
        const pollenBiomes = ['plains', 'farmland', 'lakeside', 'village'];
        if (pollenBiomes.includes(biome) && this.pollenDots.length < 22 && Math.random() < 0.08) {
            this.pollenDots.push({ x: Math.random()*canvasW, y: canvasH*0.3+Math.random()*canvasH*0.5, vx: (Math.random()-0.5)*25, vy: -Math.random()*15-5, life: 4+Math.random()*4, maxLife: 0 });
            this.pollenDots[this.pollenDots.length-1].maxLife = this.pollenDots[this.pollenDots.length-1].life;
        }
        for (let i = this.pollenDots.length - 1; i >= 0; i--) {
            const p = this.pollenDots[i];
            p.x += (p.vx + Math.sin(this._time+i*0.4)*8)*dt;
            p.y += p.vy*dt;
            p.life -= dt;
            if (p.life <= 0) this.pollenDots.splice(i,1);
        }

        // 6. Dust motes (desert / industrial)
        const dustBiomes = ['desert', 'industrial'];
        if (dustBiomes.includes(biome) && this.dustMotes.length < 20 && Math.random() < 0.1) {
            this.dustMotes.push({ x: canvasW+20, y: canvasH*0.45+Math.random()*canvasH*0.4, vx: -Math.random()*180-80, vy: (Math.random()-0.5)*20, life: 3+Math.random()*3 });
        }
        for (let i = this.dustMotes.length - 1; i >= 0; i--) {
            const m = this.dustMotes[i];
            m.x += (m.vx + this.wind)*dt; m.y += m.vy*dt; m.life -= dt;
            if (m.life <= 0 || m.x < -20 || m.x > canvasW+20) this.dustMotes.splice(i,1);
        }

        // 7. Fish jumping (lakeside / coastal)
        if ((biome === 'lakeside' || biome === 'coastal') && this.fish.length < 2 && Math.random() < 0.005) {
            const isCoastal = biome === 'coastal';
            const fx = isCoastal ? Math.random() * canvasW : canvasW * 0.15 + Math.random() * canvasW * 0.7;
            this.fish.push({ x: fx, y: canvasH * 0.5 + 20, vy: -Math.random()*40-60, vx: (Math.random()-0.5)*20, life: 2.0 });
        }
        for (let i = this.fish.length - 1; i >= 0; i--) {
            const f = this.fish[i];
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.vy += 150 * dt; // gravity
            f.life -= dt;
            if (f.y > canvasH * 0.5 + 30 || f.life <= 0) this.fish.splice(i,1);
        }

        // 8. Deer running in background (forest / mountain)
        if ((biome === 'forest' || biome === 'mountain') && this.deer.length < 1 && Math.random() < 0.002) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            this.deer.push({ x: dir > 0 ? -50 : canvasW + 50, y: canvasH * 0.48 - 5, vx: dir * (Math.random()*30 + 40), jump: 0 });
        }
        for (let i = this.deer.length - 1; i >= 0; i--) {
            const d = this.deer[i];
            d.x += d.vx * dt;
            d.jump += 8 * dt;
            if (d.x < -60 || d.x > canvasW + 60) this.deer.splice(i,1);
        }

        // 9. Mist / Low fog
        if (this.mist.length < 5 && Math.random() < 0.1) {
            this.mist.push({ x: Math.random()*canvasW, y: canvasH*0.48, vx: (Math.random()-0.5)*10, life: 5+Math.random()*5, maxLife: 0 });
            this.mist[this.mist.length-1].maxLife = this.mist[this.mist.length-1].life;
        }
        for (let i = this.mist.length - 1; i >= 0; i--) {
            const m = this.mist[i];
            m.x += (m.vx + this.wind)*dt;
            m.life -= dt;
            if (m.life <= 0) this.mist.splice(i,1);
        }

        // Wind variation
        this.wind = Math.sin(this._time * 0.2) * 50;
    }

    /**
     * @brief Paints all overlay particle layers.
     * Call order matters (back to front).
     * @param {CanvasRenderingContext2D} ctx
     * @param {DayNightManager} [daynight] Optional — needed for stars and clouds
     */
    draw(ctx, daynight) {
        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;

        // A. Stars + Milky Way (night only)
        if (daynight) {
            const starAlpha = daynight.getStarAlpha();
            if (starAlpha > 0.01) {
                this._drawStars(ctx, cw, ch, starAlpha, daynight.getStars());
                const mwAlpha = daynight.getMilkyWayAlpha();
                if (mwAlpha > 0.01) this._drawMilkyWay(ctx, cw, ch, mwAlpha);
            }

            // B. Moving clouds
            this._drawClouds(ctx, cw, ch, daynight.getClouds(), daynight.time);
        }

        // C. Birds (V-shapes)
        if (this.birds.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            this.birds.forEach(b => {
                const flap = Math.sin(b.wingState) * 4;
                ctx.beginPath();
                ctx.moveTo(b.x-7, b.y-flap); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x+7, b.y-flap);
                ctx.stroke();
            });
            ctx.restore();
        }

        // D. Butterflies (tiny wing shapes)
        if (this.butterflies.length > 0) {
            ctx.save();
            this.butterflies.forEach(bf => {
                const wf = Math.sin(bf.wing) * 5;
                ctx.fillStyle = bf.color;
                ctx.globalAlpha = Math.min(1, bf.life * 0.5);
                ctx.beginPath(); ctx.ellipse(bf.x-4, bf.y-wf, 4, 2.5, -0.3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(bf.x+4, bf.y-wf, 4, 2.5,  0.3, 0, Math.PI*2); ctx.fill();
            });
            ctx.restore();
        }

        // E. Pollen dots
        if (this.pollenDots.length > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(253,230,138,0.7)';
            this.pollenDots.forEach(p => {
                ctx.globalAlpha = (p.life / p.maxLife) * 0.7;
                ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI*2); ctx.fill();
            });
            ctx.restore();
        }

        // F. Dust motes
        if (this.dustMotes.length > 0) {
            ctx.save();
            this.dustMotes.forEach(m => {
                ctx.fillStyle = `rgba(180,140,80,${(m.life * 0.12).toFixed(3)})`;
                ctx.fillRect(m.x, m.y, 6, 1.5);
            });
            ctx.restore();
        }

        // G. Floating leaves
        if (this.leaves.length > 0) {
            ctx.save();
            this.leaves.forEach(l => {
                ctx.fillStyle = l.color;
                ctx.beginPath(); ctx.ellipse(l.x, l.y, l.size, l.size*0.5, l.spin, 0, Math.PI*2); ctx.closePath(); ctx.fill();
            });
            ctx.restore();
        }

        // Deer
        if (this.deer.length > 0) {
            ctx.save();
            ctx.fillStyle = '#1e293b'; // silhouette
            this.deer.forEach(d => {
                const jY = Math.abs(Math.sin(d.jump)) * 8;
                ctx.fillRect(d.x, d.y - jY, 12, 8); // simple body
                ctx.fillRect(d.x + (d.vx > 0 ? 8 : 0), d.y - jY - 6, 4, 6); // head
                ctx.fillRect(d.x + 2, d.y - jY + 8, 2, 6); // legs
                ctx.fillRect(d.x + 8, d.y - jY + 8, 2, 6);
            });
            ctx.restore();
        }

        // Mist
        if (this.mist.length > 0) {
            ctx.save();
            this.mist.forEach(m => {
                ctx.globalAlpha = (m.life / m.maxLife) * 0.15;
                const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 60);
                grad.addColorStop(0, 'rgba(255,255,255,1)');
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(m.x, m.y - 10, 80, 20, 0, 0, Math.PI*2);
                ctx.fill();
            });
            ctx.restore();
        }

        // H. Animated grass blades at bottom of screen
        this._drawGrass(ctx, cw, ch);

        // Fish
        if (this.fish.length > 0) {
            ctx.save();
            ctx.fillStyle = '#94a3b8';
            this.fish.forEach(f => {
                ctx.beginPath();
                ctx.ellipse(f.x, f.y, 4, 2, Math.atan2(f.vy, f.vx), 0, Math.PI*2);
                ctx.fill();
            });
            ctx.restore();
        }

        // I. Rain drops
        if (this.rainDrops.length > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.42)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            this.rainDrops.forEach(d => { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x-4 + this.wind*0.05, d.y+d.length); });
            ctx.stroke();
            ctx.restore();
        }
    }

    /**
     * @brief Resets all particle arrays.
     */
    reset() {
        this.rainDrops = []; this.leaves = []; this.birds = [];
        this.butterflies = []; this.pollenDots = []; this.dustMotes = [];
        this.fish = []; this.deer = []; this.mist = [];
        this._time = 0;
    }

    // =========================================================================
    // PRIVATE
    // =========================================================================

    /** @private */
    _drawStars(ctx, cw, ch, alpha, stars) {
        ctx.save();
        ctx.globalAlpha = alpha;
        stars.forEach(s => {
            const twinkle = 0.5 + 0.5 * Math.sin(this._time * 1.8 + s.twinkle);
            ctx.fillStyle = `rgba(255,255,255,${(twinkle * 0.9).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(s.x * cw, s.y * ch, s.size * twinkle, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.restore();
    }

    /** @private */
    _drawMilkyWay(ctx, cw, ch, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(0, 0, cw, ch * 0.4);
        grad.addColorStop(0,   'rgba(200,210,255,0)');
        grad.addColorStop(0.2, 'rgba(200,210,255,0.15)');
        grad.addColorStop(0.5, 'rgba(180,200,255,0.25)');
        grad.addColorStop(0.8, 'rgba(200,210,255,0.12)');
        grad.addColorStop(1,   'rgba(200,210,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch * 0.48);
        ctx.restore();
    }

    /** @private */
    _drawClouds(ctx, cw, ch, clouds, hour) {
        const isDay = hour >= 6.0 && hour <= 19.0;
        const cloudColor = isDay ? 'rgba(255,255,255,' : 'rgba(80,90,110,';

        ctx.save();
        clouds.forEach((cl, i) => {
            // Animate position (wrap around)
            const animX = ((cl.x - this._cloudTime * cl.speed) % 1.4 + 1.4) % 1.4 - 0.2;
            const sx = animX * cw;
            const sy = cl.y * ch;
            const sw = cl.w * cw;
            const sh = cl.h * ch;

            ctx.globalAlpha = cl.alpha * (isDay ? 0.75 : 0.35);

            // Cloud body — 3 overlapping ellipses
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sw*0.5);
            grad.addColorStop(0, cloudColor + '1)');
            grad.addColorStop(1, cloudColor + '0)');
            ctx.fillStyle = grad;

            ctx.beginPath(); ctx.ellipse(sx,       sy,       sw*0.5,  sh*0.9,  0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx-sw*0.3, sy+sh*0.2, sw*0.35, sh*0.7,  0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx+sw*0.32, sy+sh*0.15, sw*0.38, sh*0.75, 0, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
    }

    /** @private */
    _drawGrass(ctx, cw, ch) {
        ctx.save();
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.5;
        const baseY = ch - 8;
        const t = this._time;
        this._grassBlades.forEach((blade, i) => {
            const bx = blade.x * cw;
            const sway = Math.sin(t * 1.8 + blade.phase) * 4 + this.wind * 0.1;
            const h = 12 + Math.sin(blade.phase) * 4;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(bx, baseY);
            ctx.lineTo(bx + sway, baseY - h);
            ctx.stroke();
        });
        ctx.restore();
    }
}

window.EnvironmentFX = EnvironmentFX;
