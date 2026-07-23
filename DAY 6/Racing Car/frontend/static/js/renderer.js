/**
 * @file renderer.js
 * @brief Optimized Pseudo-3D road rendering engine with particle pooling.
 * 
 * Employs object pools for particles to minimize garbage collection overhead,
 * supports camera shakes, 3D fog, wet road reflections, and spotlights.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class Renderer {
    /**
     * @brief Constructor for the perspective renderer.
     * @param {CanvasRenderingContext2D} ctx Drawing context
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.drawDistance = 300; // Number of segments to render ahead

        this.shakeIntensity = 0.0;
        this.particles = [];

        // Object Pool for particles (prevents memory allocation churn)
        this.particlePool = [];

        // Lighting manager coordinates
        this.lightingManager = new LightingManager();
    }

    /**
     * @brief Triggers screen-shake offsets (proxies to cinematic camera).
     */
    triggerCameraShake(intensity) {
        if (this.camera) this.camera.triggerShake(intensity);
    }

    /**
     * @brief Spawns debris/sparks recycling objects from the pool.
     */
    spawnDebris(xOffset, z, color, count) {
        for (let i = 0; i < count; i++) {
            // Recycle from pool or allocate new if empty
            const p = this.particlePool.pop() || {};
            
            p.x = xOffset + (Math.random() * 0.1 - 0.05);
            p.y = 5.0 + Math.random() * 100.0;
            p.z = z + (Math.random() * 80.0 - 40.0);
            p.vx = (Math.random() * 1.6 - 0.8);
            p.vy = (Math.random() * 400.0 + 200.0);
            p.vz = (Math.random() * 600.0 - 300.0);
            p.color = color || '#ff5e00';
            p.size = Math.random() * 8.0 + 4.0;
            p.life = Math.random() * 0.6 + 0.4;
            p.active = true;

            this.particles.push(p);
        }
    }

    /**
     * @brief Updates active particles, moving dead ones to the pool.
     */
    updateParticles(dt) {
        if (dt <= 0) return;

        const activeParticles = [];

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            p.x += p.vx * dt;
            p.z += p.vz * dt;
            p.y += p.vy * dt;
            p.vy -= 1100.0 * dt;

            if (p.y < 0.0) {
                p.y = 0.0;
                p.vy = -p.vy * 0.4;
                p.vx *= 0.6;
            }

            p.life -= dt;

            if (p.life > 0.0) {
                activeParticles.push(p);
            } else {
                p.active = false;
                // Return to pool to avoid GC sweeps
                if (this.particlePool.length < 500) {
                    this.particlePool.push(p);
                }
            }
        }

        this.particles = activeParticles;
    }

    /**
     * @brief Paints volumetric sky: gradient + sun halo rings + celestial disc + god rays.
     * @param {number} width Canvas width
     * @param {number} height Canvas height
     * @param {DayNightManager} daynight
     */
    drawSky(width, height, daynight) {
        const lighting = daynight.getSkyLighting();

        // Base sky gradient
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, height / 2);
        skyGrad.addColorStop(0, lighting.skyTop);
        skyGrad.addColorStop(1, lighting.skyBottom);
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, width, height / 2);

        // Stars & Milky Way
        let starAlpha = 0;
        if (daynight.time < 5.0 || daynight.time > 20.0) starAlpha = 1.0;
        else if (daynight.time >= 5.0 && daynight.time <= 7.0) starAlpha = 1.0 - (daynight.time - 5.0)/2.0;
        else if (daynight.time >= 18.0 && daynight.time <= 20.0) starAlpha = (daynight.time - 18.0)/2.0;
        
        if (starAlpha > 0) this._drawStars(width, height, starAlpha);

        // Celestial body (sun / moon)
        const body = daynight.getCelestialBody(width, height);
        this.ctx.save();

        // Sun halo rings (4 concentric) — morning / evening only
        const haloAlpha = daynight.getSunHaloIntensity();
        if (haloAlpha > 0.01) {
            const haloSizes = [body.size*5, body.size*3.5, body.size*2.5, body.size*1.9];
            const haloAlphas = [0.06, 0.10, 0.16, 0.22];
            haloSizes.forEach((sz, idx) => {
                const hg = this.ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, sz);
                hg.addColorStop(0, `rgba(253,186,116,${(haloAlphas[idx]*haloAlpha).toFixed(3)})`);
                hg.addColorStop(1, 'rgba(253,186,116,0)');
                this.ctx.fillStyle = hg;
                this.ctx.beginPath();
                this.ctx.arc(body.x, body.y, sz, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }

        // Outer glow disc
        this.ctx.fillStyle = body.glow;
        this.ctx.beginPath();
        this.ctx.arc(body.x, body.y, body.size * 2.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Core disc
        this.ctx.fillStyle = body.fill;
        this.ctx.beginPath();
        this.ctx.arc(body.x, body.y, body.size, 0, Math.PI * 2);
        this.ctx.fill();

        // Moon craters
        if (body.type === 'moon') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.12)';
            [[body.x-6, body.y-4, 3],[body.x+5, body.y+5, 2],[body.x+2, body.y-7, 2]].forEach(([cx,cy,r])=>{
                this.ctx.beginPath(); this.ctx.arc(cx,cy,r,0,Math.PI*2); this.ctx.fill();
            });
        }

        this.ctx.restore();

        // God rays — morning / evening
        if (haloAlpha > 0.05) {
            this._drawGodRays(width, height, body, haloAlpha);
        }

        // Volumetric clouds
        this._drawVolumetricClouds(width, height, daynight);
    }

    _drawStars(width, height, alpha) {
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Milky Way band
        const mwGrad = this.ctx.createLinearGradient(0, 0, width, height/2);
        mwGrad.addColorStop(0, 'rgba(0,0,0,0)');
        mwGrad.addColorStop(0.3, 'rgba(76,29,149,0.15)');
        mwGrad.addColorStop(0.7, 'rgba(30,58,138,0.1)');
        mwGrad.addColorStop(1, 'rgba(0,0,0,0)');
        this.ctx.fillStyle = mwGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(width*0.2, 0);
        this.ctx.lineTo(width*0.8, 0);
        this.ctx.lineTo(width*0.4, height/2);
        this.ctx.lineTo(0, height/2);
        this.ctx.fill();

        // Stars
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 200; i++) {
            const x = this._fastHash(i*17) * width;
            const y = this._fastHash(i*31) * (height / 2);
            const s = this._fastHash(i*53) * 1.5 + 0.5;
            const twinkle = Math.sin(Date.now()/500 + i) > 0.8 ? 0.5 : 1.0;
            this.ctx.globalAlpha = alpha * twinkle * (1 - y/(height/2));
            this.ctx.fillRect(x, y, s, s);
        }
        this.ctx.restore();
    }

    _drawVolumetricClouds(width, height, daynight) {
        this.ctx.save();
        const t = Date.now() / 50000;
        const isNight = daynight.time < 6.0 || daynight.time > 19.0;
        
        let cloudColor = 'rgba(255,255,255,0.7)';
        let shadowColor = 'rgba(200,210,220,0.8)';
        if (isNight) {
            cloudColor = 'rgba(40,50,70,0.6)';
            shadowColor = 'rgba(20,25,40,0.8)';
        } else if (daynight.time > 17.0 || daynight.time < 8.0) {
            cloudColor = 'rgba(253,186,116,0.7)';
            shadowColor = 'rgba(150,80,100,0.8)';
        }

        for (let layer = 0; layer < 3; layer++) {
            const scale = 1.0 + layer * 0.5;
            for (let c = 0; c < 10; c++) {
                const seed = layer * 100 + c;
                const baseX = (this._fastHash(seed) * width + (t * width * (3-layer))) % (width + 400) - 200;
                const baseY = this._fastHash(seed + 1) * (height/3) - 50;
                
                this.ctx.fillStyle = shadowColor;
                this.ctx.beginPath();
                this.ctx.ellipse(baseX, baseY + 15*scale, 80*scale, 25*scale, 0, 0, Math.PI*2);
                this.ctx.fill();

                this.ctx.fillStyle = cloudColor;
                this.ctx.beginPath();
                this.ctx.ellipse(baseX, baseY, 80*scale, 30*scale, 0, 0, Math.PI*2);
                this.ctx.fill();
                
                this.ctx.beginPath();
                this.ctx.ellipse(baseX - 30*scale, baseY - 15*scale, 40*scale, 25*scale, 0, 0, Math.PI*2);
                this.ctx.ellipse(baseX + 30*scale, baseY - 10*scale, 50*scale, 30*scale, 0, 0, Math.PI*2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }

    /**
     * @brief Projects 3D world points into 2D screenspace.
     */
    project(point, camera, loopOffset, width, height, roadWidth, curveOffset) {
        const transX = point.world.x - (camera.x * roadWidth) + curveOffset;
        const transY = point.world.y - camera.y;
        const transZ = (point.world.z + loopOffset) - camera.z;

        if (transZ <= 0) {
            point.screen.x = 0;
            point.screen.y = 0;
            point.screen.w = 0;
            return;
        }

        const scale = camera.depth / transZ;
        
        point.screen.x = Math.round((width / 2) + (scale * transX * width / 2));
        point.screen.y = Math.round((height / 2) - (scale * transY * height / 2));
        point.screen.w = Math.round(scale * roadWidth * width / 2);
        point.screen.scale = scale;
        point.screen.curveOffset = curveOffset;
        point.screen.transZ = transZ;
    }

    /**
     * @brief Draws sky gradients, road segment polygons, and depth-sorted overlays.
     */
    drawScene(camera, road, assets, traffic, obstacles, damageSystem, daynight, weather) {
        const canvas = this.ctx.canvas;
        const w = canvas.width;
        const h = canvas.height;

        const shakeX = camera.currentShakeX || 0;
        const shakeY = camera.currentShakeY || 0;

        this.ctx.save();
        this.ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
        this.ctx.rotate(camera.roll || 0);
        this.ctx.translate(-w / 2, -h / 2);

        const cameraSegment = road.findSegment(camera.z);
        const cameraPercent = (camera.z % road.segmentLength) / road.segmentLength;

        let maxy = h;
        let curveSum = 0.0;
        let lastCurveDiff = 0.0;

        const fogColor = weather.getFogColor(daynight.time);

        // 0a. Terrain background (mountains, forest silhouette, water)
        this._drawTerrainBackground(w, h, camera, road, daynight, weather);

        // 0b. City skyline (only in city / industrial regions)
        const curBiome = road.findSegment(camera.z).biome;
        if (curBiome === 'city' || curBiome === 'industrial') {
            this._drawCityscape(w, h, camera, daynight);
        }

        // 0c. Heat shimmer overlay (desert region)
        if (curBiome === 'desert') {
            this._drawHeatDistortion(w, h);
        }

        // 0d. Atmospheric vignette + distant haze
        this._drawAtmosphericVignette(w, h, weather, daynight);

        // 1. Draw Road segments from near to far
        for (let n = 0; n < this.drawDistance; n++) {
            const index = (cameraSegment.index + n) % road.segments.length;
            const segment = road.segments[index];
            const loopOffset = (index < cameraSegment.index) ? road.segments.length * road.segmentLength : 0;

            this.project(segment.p1, camera, loopOffset, w, h, road.roadWidth, curveSum - (lastCurveDiff * cameraPercent));
            
            curveSum += segment.curve;
            lastCurveDiff = segment.curve;
            
            this.project(segment.p2, camera, loopOffset, w, h, road.roadWidth, curveSum);

            if (segment.p1.screen.y <= 0 || segment.p1.screen.y >= maxy) {
                continue;
            }

            this._drawSegmentPolygons(w, h, road.lanes, segment.p1, segment.p2, segment.color, segment, daynight.time);

            // Bridge support pillars drawn below road plane
            if (segment.type === 'bridge') {
                this._drawBridgeDetails(w, h, segment.p1, segment.p2);
            }

            // Tunnel concrete walls drawn over road surface
            if (segment.type === 'tunnel') {
                this._drawTunnelOverlay(w, h, segment.p1, segment.p2, n, daynight.time);
            }

            this.lightingManager.drawWetRoadReflection(this.ctx, segment.p1, segment.p2, daynight, weather);
            this.lightingManager.drawPuddles(this.ctx, index, segment.p1, segment.p2, weather);

            if (weather.fogDensity > 0.05) {
                const zDist = segment.p1.screen.transZ || 1.0;
                const fogFactor = Math.min(1.0, (1.0 - Math.exp(-weather.fogDensity * zDist * 0.000075)));
                this.ctx.save();
                this.ctx.globalAlpha = fogFactor;
                this.ctx.fillStyle = fogColor;
                this._drawSegmentShape(w, segment.p1, segment.p2);
                this.ctx.restore();
            }

            maxy = segment.p1.screen.y;
        }

        // 2. Compile sprites draw queue
        const spriteQueue = [];

        // Static road landmarks and streetlights
        for (let n = 0; n < this.drawDistance; n++) {
            const index = (cameraSegment.index + n) % road.segments.length;
            const segment = road.segments[index];
            const loopOffset = (index < cameraSegment.index) ? road.segments.length * road.segmentLength : 0;

            if (segment.p1.screen.y > 0 && segment.p1.screen.y < h) {
                segment.sprites.forEach(s => {
                    spriteQueue.push({
                        type: 'static',
                        z: segment.p1.world.z + loopOffset,
                        xOffset: s.xOffset,
                        yOffset: 0.0,
                        spriteType: s.type
                    });
                });
            }
        }

        // Traffic vehicles
        for (let i = 0; i < traffic.length; i++) {
            const v = traffic[i];
            if (v.z > camera.z && v.z < camera.z + this.drawDistance * road.segmentLength) {
                spriteQueue.push({
                    type: 'traffic',
                    z: v.z,
                    xOffset: v.x,
                    yOffset: 0.0,
                    ref: v
                });
            }
        }

        // Obstacles
        for (let i = 0; i < obstacles.length; i++) {
            const o = obstacles[i];
            if (o.z > camera.z && o.z < camera.z + this.drawDistance * road.segmentLength) {
                spriteQueue.push({
                    type: 'obstacle',
                    z: o.z,
                    xOffset: o.x,
                    yOffset: 0.0,
                    ref: o
                });
            }
        }

        // Particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.z > camera.z && p.z < camera.z + this.drawDistance * road.segmentLength) {
                spriteQueue.push({
                    type: 'particle',
                    z: p.z,
                    xOffset: p.x,
                    yOffset: p.y,
                    ref: p
                });
            }
        }

        // 3. Sort Queue by distance descending (farthest first)
        spriteQueue.sort((a, b) => b.z - a.z);

        // 4. Render Queue elements
        for (let i = 0; i < spriteQueue.length; i++) {
            const item = spriteQueue[i];
            const seg = road.findSegment(item.z);
            const curveOffset = seg.p1.screen.curveOffset || 0.0;
            
            const point = { world: { x: item.xOffset * road.roadWidth, y: item.yOffset, z: item.z }, screen: {} };
            this.project(point, camera, 0, w, h, road.roadWidth, curveOffset);

            if (point.screen.y <= 0 || point.screen.y >= h) continue;

            if (item.type === 'static') {
                this._drawStaticSprite(item.spriteType, point, point.screen.scale, w, assets, daynight.time);
            } else if (item.type === 'traffic') {
                this._drawVectorTraffic(point.screen.x, point.screen.y, point.screen.scale, w, item.ref);
            } else if (item.type === 'obstacle') {
                this._drawVectorObstacle(point.screen.x, point.screen.y, point.screen.scale, w, item.ref);
            } else if (item.type === 'particle') {
                this._drawVectorParticle(point.screen.x, point.screen.y, point.screen.scale, w, item.ref);
            }
        }

        // 5. Apply ambient color overlay tint
        const skyLighting = daynight.getSkyLighting();
        if (skyLighting.ambient !== 'rgba(255, 255, 255, 0.0)') {
            this.ctx.fillStyle = skyLighting.ambient;
            this.ctx.fillRect(0, 0, w, h);
        }

        // 6. Cloud Shadows
        if (daynight.time > 6.0 && daynight.time < 19.0) {
            this.ctx.save();
            const shadowT = (Date.now() / 15000) % 1.0;
            const shadowGrad = this.ctx.createLinearGradient(0, h*0.5, 0, h);
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
            const shadowAlpha = 0.15 + Math.sin(shadowT * Math.PI * 2) * 0.1;
            shadowGrad.addColorStop(0.5, `rgba(0,0,0,${Math.max(0, shadowAlpha)})`);
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = shadowGrad;
            this.ctx.fillRect(0, h*0.5, w, h*0.5);
            this.ctx.restore();
        }

        // 7. Motion Blur / Speed lines
        if (camera.blurIntensity > 0.05) {
            this._drawSpeedLines(w, h, camera.blurIntensity);
        }

        // 8. Eye Adaptation (Tunnel Exposure)
        if (camera.exposure !== 1.0) {
            this.ctx.fillStyle = `rgba(0,0,0,${1.0 - camera.exposure})`;
            this.ctx.fillRect(0, 0, w, h);
        }
        
        // 9. Post Processing FX (Bloom & Lens Flare)
        this._drawPostFX(w, h, camera, daynight);

        this.ctx.restore();
    }

    _drawPostFX(w, h, camera, daynight) {
        // Lens flare on sun when looking towards it
        const sunBody = daynight.getCelestialBody(w, h);
        if (sunBody.type === 'sun' && daynight.getSunHaloIntensity() > 0.1) {
            const dx = (w / 2) - sunBody.x;
            const dy = (h / 2) - sunBody.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < w) {
                this.ctx.save();
                this.ctx.globalCompositeOperation = 'screen';
                const intensity = (1.0 - (dist / w)) * 0.4;
                
                // Draw flares
                const flares = [
                    { size: 100, pos: 1.2, color: 'rgba(255,200,100,INT)' },
                    { size: 40,  pos: 0.8, color: 'rgba(100,200,255,INT)' },
                    { size: 200, pos: 0.5, color: 'rgba(255,150,50,INT)' },
                    { size: 60,  pos: -0.2, color: 'rgba(100,255,100,INT)' },
                    { size: 150, pos: -0.5, color: 'rgba(200,100,255,INT)' }
                ];
                
                flares.forEach(f => {
                    const fx = (w/2) + dx * f.pos;
                    const fy = (h/2) + dy * f.pos;
                    this.ctx.beginPath();
                    this.ctx.arc(fx, fy, f.size, 0, Math.PI*2);
                    this.ctx.fillStyle = f.color.replace('INT', (intensity * 0.5).toFixed(3));
                    this.ctx.fill();
                });
                
                this.ctx.restore();
            }
        }
    }

    _drawSpeedLines(w, h, intensity) {
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.4})`;
        this.ctx.lineWidth = 1.0 + intensity * 2.0;
        this.ctx.beginPath();
        const centerX = w / 2;
        const centerY = h / 2;
        
        const t = Date.now() / 50;
        for (let i = 0; i < 40; i++) {
            const angle = this._fastHash(i * 13 + Math.floor(t)) * Math.PI * 2;
            const dist = 100 + this._fastHash(i * 17) * 200;
            const len = 50 + intensity * 300 * this._fastHash(i * 19);
            
            const startX = centerX + Math.cos(angle) * dist;
            const startY = centerY + Math.sin(angle) * dist;
            const endX = centerX + Math.cos(angle) * (dist + len);
            const endY = centerY + Math.sin(angle) * (dist + len);
            
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * @brief Draws layered road surface: grass, gravel shoulder, asphalt base,
     *        noise patches, oil stains, rumble strips, skid marks, and lane markings.
     * @private
     */
    _drawSegmentPolygons(width, height, lanesCount, p1, p2, color, segment, hour) {
        // 1. Wide grass band (full width background fill)
        this.ctx.fillStyle = color.grass;
        this.ctx.fillRect(0, p2.screen.y, width, p1.screen.y - p2.screen.y);

        // 2. Gravel shoulder — thin grey-brown strip just outside rumble
        const gravW1 = p1.screen.w * 0.10;
        const gravW2 = p2.screen.w * 0.10;
        const gravelColor = segment.biome === 'mountain' ? '#44403c' : '#57534e';
        this._drawPolygon(
            p1.screen.x - p1.screen.w - gravW1, p1.screen.y,
            p1.screen.x - p1.screen.w,           p1.screen.y,
            p2.screen.x - p2.screen.w,           p2.screen.y,
            p2.screen.x - p2.screen.w - gravW2, p2.screen.y,
            gravelColor
        );
        this._drawPolygon(
            p1.screen.x + p1.screen.w,           p1.screen.y,
            p1.screen.x + p1.screen.w + gravW1, p1.screen.y,
            p2.screen.x + p2.screen.w + gravW2, p2.screen.y,
            p2.screen.x + p2.screen.w,           p2.screen.y,
            gravelColor
        );

        // 3. Main asphalt body
        this._drawPolygon(
            p1.screen.x - p1.screen.w, p1.screen.y,
            p1.screen.x + p1.screen.w, p1.screen.y,
            p2.screen.x + p2.screen.w, p2.screen.y,
            p2.screen.x - p2.screen.w, p2.screen.y,
            color.road
        );

        // 4. Asphalt noise grain (thin horizontal stripe overlay)
        const segH = p1.screen.y - p2.screen.y;
        if (segH > 2) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.07;
            this.ctx.fillStyle = '#94a3b8';
            const stripeCount = Math.max(1, Math.round(segH / 4));
            for (let s = 0; s < stripeCount; s += 2) {
                const sy = p2.screen.y + (s / stripeCount) * segH;
                this.ctx.fillRect(p2.screen.x - p2.screen.w, sy, p2.screen.w * 2, 1);
            }
            this.ctx.restore();
        }

        // 5. Road patches (deterministic per-segment seeded positions)
        if (segH > 3) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.13;
            this.ctx.fillStyle = '#0f172a';
            const patchSeed = segment.index * 7919;
            const patchCount = 3;
            for (let p = 0; p < patchCount; p++) {
                const fx = this._fastHash(patchSeed + p * 31);
                const fy = this._fastHash(patchSeed + p * 17 + 3);
                const fw = this._fastHash(patchSeed + p * 53 + 7);
                const cx = p1.screen.x + (fx - 0.5) * p1.screen.w * 1.6;
                const cy = p2.screen.y + fy * segH;
                const rx = p1.screen.w * (0.05 + fw * 0.12);
                const ry = Math.max(1, segH * (0.08 + fx * 0.15));
                this.ctx.beginPath();
                this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // 6. Oil stains (iridescent dark ellipses, ~1 per segment)
        if (segH > 4 && segment.index % 7 === 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.18;
            const oilSeed = segment.index * 4231;
            const oilX = p1.screen.x + (this._fastHash(oilSeed) - 0.5) * p1.screen.w * 1.0;
            const oilY = p2.screen.y + this._fastHash(oilSeed + 1) * segH;
            const oilRad = p1.screen.w * 0.06;
            const oilGrad = this.ctx.createRadialGradient(oilX, oilY, 0, oilX, oilY, oilRad);
            oilGrad.addColorStop(0, '#4c1d95');
            oilGrad.addColorStop(0.5, '#2e1065');
            oilGrad.addColorStop(1, 'rgba(15,23,42,0)');
            this.ctx.fillStyle = oilGrad;
            this.ctx.beginPath();
            this.ctx.ellipse(oilX, oilY, oilRad, oilRad * 0.4, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // 7. Rumble strips
        const rumbleW1 = p1.screen.w * 0.06;
        const rumbleW2 = p2.screen.w * 0.06;
        this._drawPolygon(
            p1.screen.x - p1.screen.w - rumbleW1, p1.screen.y,
            p1.screen.x - p1.screen.w,             p1.screen.y,
            p2.screen.x - p2.screen.w,             p2.screen.y,
            p2.screen.x - p2.screen.w - rumbleW2, p2.screen.y,
            color.rumble
        );
        this._drawPolygon(
            p1.screen.x + p1.screen.w,             p1.screen.y,
            p1.screen.x + p1.screen.w + rumbleW1, p1.screen.y,
            p2.screen.x + p2.screen.w + rumbleW2, p2.screen.y,
            p2.screen.x + p2.screen.w,             p2.screen.y,
            color.rumble
        );

        // 8. Tire skid marks (from collision/braking system)
        if (segment.skidMarks) {
            for (let i = 0; i < segment.skidMarks.length; i++) {
                const sm = segment.skidMarks[i];
                const w1L = p1.screen.x + p1.screen.w * sm.xLeft;
                const w2L = p2.screen.x + p2.screen.w * sm.xLeft;
                const w1R = p1.screen.x + p1.screen.w * sm.xRight;
                const w2R = p2.screen.x + p2.screen.w * sm.xRight;
                const t1 = p1.screen.w * 0.05;
                const t2 = p2.screen.w * 0.05;
                this._drawPolygon(w1L-t1,p1.screen.y, w1L+t1,p1.screen.y, w2L+t2,p2.screen.y, w2L-t2,p2.screen.y, 'rgba(15,23,42,0.45)');
                this._drawPolygon(w1R-t1,p1.screen.y, w1R+t1,p1.screen.y, w2R+t2,p2.screen.y, w2R-t2,p2.screen.y, 'rgba(15,23,42,0.45)');
            }
        }

        // 9. Lane markings on top
        this._drawLaneMarkings(lanesCount, p1, p2, color, segment, hour);
    }

    /**
     * @brief Draws professional highway lane markings:
     *        solid edge lines, dashed centre stripes, cat-eye reflectors, night glow.
     * @private
     */
    _drawLaneMarkings(lanesCount, p1, p2, color, segment, hour) {
        if (!color.lane) return;

        const isNight = (hour !== undefined) && (hour < 6.0 || hour > 19.0);
        const nightAlpha = isNight ? 0.85 : 0.55;

        this.ctx.save();
        if (isNight) {
            this.ctx.shadowColor = '#e2e8f0';
            this.ctx.shadowBlur  = 4;
        }

        // A. Solid white edge lines (both sides, ~93% road width)
        const edgeW1 = p1.screen.w * 0.015;
        const edgeW2 = p2.screen.w * 0.015;
        const edgeOff1 = p1.screen.w * 0.93;
        const edgeOff2 = p2.screen.w * 0.93;
        this.ctx.globalAlpha = nightAlpha;
        this.ctx.fillStyle = '#f8fafc';
        // Left edge
        this._drawPolygon(
            p1.screen.x - edgeOff1 - edgeW1, p1.screen.y,
            p1.screen.x - edgeOff1 + edgeW1, p1.screen.y,
            p2.screen.x - edgeOff2 + edgeW2, p2.screen.y,
            p2.screen.x - edgeOff2 - edgeW2, p2.screen.y,
            '#f8fafc'
        );
        // Right edge
        this._drawPolygon(
            p1.screen.x + edgeOff1 - edgeW1, p1.screen.y,
            p1.screen.x + edgeOff1 + edgeW1, p1.screen.y,
            p2.screen.x + edgeOff2 + edgeW2, p2.screen.y,
            p2.screen.x + edgeOff2 - edgeW2, p2.screen.y,
            '#f8fafc'
        );

        // B. Dashed centre lane dividers (every 3 segments only)
        if (color.lane && segment.index % 3 !== 2) {
            const laneStripes = lanesCount - 1;
            const lineW1 = p1.screen.w * 0.012;
            const lineW2 = p2.screen.w * 0.012;
            this.ctx.globalAlpha = nightAlpha;

            for (let l = 1; l <= laneStripes; l++) {
                const pct = -1.0 + (2.0 * l) / lanesCount;
                const lx1 = p1.screen.x + p1.screen.w * pct;
                const lx2 = p2.screen.x + p2.screen.w * pct;

                this._drawPolygon(
                    lx1-lineW1, p1.screen.y,
                    lx1+lineW1, p1.screen.y,
                    lx2+lineW2, p2.screen.y,
                    lx2-lineW2, p2.screen.y,
                    color.lane
                );

                // C. Cat-eye reflectors (every 6 segments, small bright circles)
                if (segment.index % 6 === 0) {
                    const midX = (lx1 + lx2) / 2;
                    const midY = (p1.screen.y + p2.screen.y) / 2;
                    const dotR = Math.max(1.5, lineW1 * 1.8);
                    this.ctx.globalAlpha = isNight ? 1.0 : 0.6;
                    this.ctx.fillStyle = '#fde68a';
                    if (isNight) {
                        this.ctx.shadowColor = '#fde68a';
                        this.ctx.shadowBlur  = 6;
                    }
                    this.ctx.beginPath();
                    this.ctx.arc(midX, midY, dotR, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = isNight ? 4 : 0;
                }
            }
        }

        this.ctx.restore();
    }

    /**
     * @brief Paints layered distant terrain: mountains, forest silhouette, and
     *        atmospheric haze — drawn once per frame before the road segment loop.
     * @private
     */
    _drawTerrainBackground(w, h, camera, road, daynight, weather) {
        const lighting = daynight.getSkyLighting();
        const horizonY = h * 0.48; // approximate horizon screen Y
        const cameraX  = camera.x * 0.04; // subtle parallax

        this.ctx.save();

        // --- Mountain silhouettes (3 parallax layers, back to front) ---
        const mountainLayers = [
            { amp: 160, freq: 0.008, phase: 1.2,  color: '#1e293b', parallax: 0.01 },
            { amp: 110, freq: 0.014, phase: 2.8,  color: '#1a2535', parallax: 0.025 },
            { amp:  70, freq: 0.022, phase: 0.5,  color: '#162032', parallax: 0.05  }
        ];

        mountainLayers.forEach(layer => {
            const baseY = horizonY + (mountainLayers.indexOf(layer) * 14);
            this.ctx.fillStyle = layer.color;
            this.ctx.beginPath();
            this.ctx.moveTo(0, h);

            for (let x = 0; x <= w; x += 4) {
                const mx = x / w;
                const my = Math.sin(mx * w * layer.freq + layer.phase + cameraX * layer.parallax) * layer.amp;
                const sy = baseY - my;
                if (x === 0) this.ctx.moveTo(x, sy);
                else         this.ctx.lineTo(x, sy);
            }

            this.ctx.lineTo(w, h);
            this.ctx.closePath();
            this.ctx.fill();
        });

        // --- Forest tree-line silhouette (jagged treetop strip) ---
        const seg = road.findSegment(camera.z);
        if (seg.biome === 'forest' || seg.biome === 'mountain') {
            const treeBaseY = horizonY + 30;
            this.ctx.fillStyle = seg.biome === 'forest' ? '#0d3320' : '#1c2a1a';
            this.ctx.beginPath();
            this.ctx.moveTo(0, h);

            for (let x = 0; x <= w; x += 8) {
                const tx = x / w;
                const th = 20 + Math.sin(tx * 40 + cameraX) * 12 + Math.sin(tx * 17 + 1.4 + cameraX * 2) * 8;
                const sy = treeBaseY - th;
                if (x === 0) this.ctx.moveTo(x, sy);
                else         this.ctx.lineTo(x, sy);
            }
            this.ctx.lineTo(w, h);
            this.ctx.closePath();
            this.ctx.fill();
        }

        // --- Water body (Lakeside / Coastal) ---
        if (seg.biome === 'lakeside' || seg.biome === 'coastal') {
            const isCoastal = seg.biome === 'coastal';
            const waterY = horizonY + (isCoastal ? 10 : 20);
            const waterH = isCoastal ? 60 : 28;
            const waterGrad = this.ctx.createLinearGradient(0, waterY, 0, waterY + waterH);
            
            // Base colors
            if (isCoastal) {
                waterGrad.addColorStop(0, '#0f4c75');
                waterGrad.addColorStop(1, '#1b263b');
            } else {
                waterGrad.addColorStop(0, '#164e63');
                waterGrad.addColorStop(1, '#0c3040');
            }
            this.ctx.fillStyle = waterGrad;
            
            if (isCoastal) {
                this.ctx.fillRect(0, waterY, w, waterH); // Full width ocean
            } else {
                this.ctx.fillRect(w * 0.15, waterY, w * 0.7, waterH); // Partial lake
            }

            // Animated shimmer and ripples
            const shimmerT = (Date.now() / 900) % (Math.PI * 2);
            this.ctx.strokeStyle = isCoastal ? 'rgba(255,255,255,0.2)' : 'rgba(186,230,253,0.4)';
            this.ctx.lineWidth = 1.5;
            const linesCount = isCoastal ? 12 : 6;
            for (let s = 0; s < linesCount; s++) {
                const sx = isCoastal ? (w * 0.05 * s + Math.sin(shimmerT + s) * 15) : (w * (0.2 + s * 0.1) + Math.sin(shimmerT + s) * 12);
                const sw = (isCoastal ? 40 : 20) + Math.sin(shimmerT * 1.3 + s) * 15;
                const sy = waterY + 6 + (s * (isCoastal ? 4 : 2));
                this.ctx.beginPath();
                this.ctx.moveTo(sx, sy);
                this.ctx.lineTo(sx + sw, sy);
                this.ctx.stroke();
            }
        }

        // --- Atmospheric horizon haze band ---
        const hazeGrad = this.ctx.createLinearGradient(0, horizonY - 20, 0, horizonY + 40);
        hazeGrad.addColorStop(0, 'rgba(0,0,0,0)');
        hazeGrad.addColorStop(0.5, `rgba(${weather.fogDensity > 0.3 ? '200,220,230' : '15,23,42'},${0.08 + weather.fogDensity * 0.25})`);
        hazeGrad.addColorStop(1, 'rgba(0,0,0,0)');
        this.ctx.fillStyle = hazeGrad;
        this.ctx.fillRect(0, horizonY - 20, w, 60);

        this.ctx.restore();
    }

    /**
     * @brief Draws concrete tunnel walls and ceiling lamp strips for tunnel segments.
     * @private
     */
    _drawTunnelOverlay(width, height, p1, p2, segN, hour) {
        const wallW = p1.screen.w * 0.18;
        const wallW2 = p2.screen.w * 0.18;

        // Left concrete wall
        this._drawPolygon(
            p1.screen.x - p1.screen.w - wallW, p1.screen.y,
            p1.screen.x - p1.screen.w,          p1.screen.y,
            p2.screen.x - p2.screen.w,          p2.screen.y,
            p2.screen.x - p2.screen.w - wallW2, p2.screen.y,
            '#334155'
        );
        // Right concrete wall
        this._drawPolygon(
            p1.screen.x + p1.screen.w,           p1.screen.y,
            p1.screen.x + p1.screen.w + wallW,  p1.screen.y,
            p2.screen.x + p2.screen.w + wallW2, p2.screen.y,
            p2.screen.x + p2.screen.w,           p2.screen.y,
            '#334155'
        );

        // Ceiling band
        const ceilY1 = p1.screen.y - (p1.screen.y - p2.screen.y) * 0.5;
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(
            p1.screen.x - p1.screen.w - wallW,
            p2.screen.y,
            (p1.screen.w + wallW) * 2,
            Math.max(1, ceilY1 - p2.screen.y)
        );

        // Ceiling lamp circles (every 2 segments)
        if (segN % 2 === 0) {
            const lampX = (p1.screen.x + p2.screen.x) / 2;
            const lampY = p2.screen.y + 4;
            const lampR = Math.max(2, p2.screen.w * 0.04);
            const isNight = hour < 6.0 || hour > 19.0;

            this.ctx.save();
            this.ctx.fillStyle = isNight ? '#fef9c3' : '#fde68a';
            if (isNight) {
                this.ctx.shadowColor = '#fef9c3';
                this.ctx.shadowBlur  = 8;
            }
            this.ctx.beginPath();
            this.ctx.arc(lampX, lampY, lampR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    /**
     * @brief Draws bridge support pillars and river below for bridge segments.
     * @private
     */
    _drawBridgeDetails(width, height, p1, p2) {
        // River below — blue gradient band
        const riverY = p1.screen.y + 12;
        const riverH = Math.max(6, p1.screen.w * 0.15);
        const riverGrad = this.ctx.createLinearGradient(0, riverY, 0, riverY + riverH);
        riverGrad.addColorStop(0, '#1e4d6b');
        riverGrad.addColorStop(1, '#0c2d40');
        this.ctx.fillStyle = riverGrad;
        this.ctx.fillRect(p2.screen.x - p2.screen.w, riverY, p2.screen.w * 2, riverH);

        // Animated shimmer on river
        const t = (Date.now() / 1200) % (Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(125,211,252,0.35)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(p2.screen.x - p2.screen.w * 0.6 + Math.sin(t) * 8, riverY + 4);
        this.ctx.lineTo(p2.screen.x + p2.screen.w * 0.3 + Math.sin(t + 1) * 8, riverY + 4);
        this.ctx.stroke();

        // Bridge guardrail caps (thin bright strips on road edges)
        this.ctx.fillStyle = '#94a3b8';
        const capH = Math.max(1, (p1.screen.y - p2.screen.y) * 0.15);
        this.ctx.fillRect(p1.screen.x - p1.screen.w * 1.08, p2.screen.y, p1.screen.w * 0.05, capH);
        this.ctx.fillRect(p1.screen.x + p1.screen.w * 1.03, p2.screen.y, p1.screen.w * 0.05, capH);
    }

    /**
     * @brief Helper to fill a segment shape.
     * @private
     */
    _drawSegmentShape(width, p1, p2) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, p1.screen.y);
        this.ctx.lineTo(width, p1.screen.y);
        this.ctx.lineTo(width, p2.screen.y);
        this.ctx.lineTo(0, p2.screen.y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * @brief Draws a procedural city building skyline above the horizon.
     * Uses deterministic positions keyed by camera Z bucket so the skyline
     * scrolls believably with camera movement.
     * @private
     */
    _drawCityscape(w, h, camera, daynight) {
        const horizonY = h * 0.48;
        const isNight  = daynight.time < 6.0 || daynight.time > 19.0;
        const bucket   = Math.floor(camera.z / 8000); // changes every ~8 segments
        const seed     = bucket * 6271;

        this.ctx.save();

        // Draw 14 buildings across the horizon
        for (let b = 0; b < 14; b++) {
            const bh  = this._fastHash(seed + b * 31);
            const bw  = this._fastHash(seed + b * 17 + 1);
            const bx  = this._fastHash(seed + b * 53 + 2);
            const isGlass = this._fastHash(seed + b * 97 + 3) > 0.55;

            const buildH = 60 + bh * 140;
            const buildW = 28 + bw * 52;
            const buildX = bx * (w - buildW);
            const buildY = horizonY - buildH;

            // Body
            const bodyGrad = this.ctx.createLinearGradient(buildX, buildY, buildX + buildW, buildY);
            if (isGlass) {
                bodyGrad.addColorStop(0, '#0c3a5e');
                bodyGrad.addColorStop(0.5, '#0e5a8a');
                bodyGrad.addColorStop(1, '#0c3a5e');
            } else {
                bodyGrad.addColorStop(0, '#1e293b');
                bodyGrad.addColorStop(1, '#334155');
            }
            this.ctx.fillStyle = bodyGrad;
            this.ctx.fillRect(buildX, buildY, buildW, buildH);

            // Windows
            const winCols = Math.max(2, Math.floor(buildW / 14));
            const winRows = Math.max(3, Math.floor(buildH / 18));
            for (let row = 0; row < winRows; row++) {
                for (let col = 0; col < winCols; col++) {
                    const lit = isNight ? this._fastHash(seed+b*1000+row*100+col) > 0.35
                                       : this._fastHash(seed+b*1000+row*100+col) > 0.75;
                    if (lit) {
                        const winColor = isGlass ? 'rgba(147,210,253,0.8)' : 'rgba(253,224,71,0.85)';
                        this.ctx.fillStyle = winColor;
                        this.ctx.fillRect(
                            buildX + 4 + col * (buildW / winCols),
                            buildY + 6 + row * (buildH / winRows),
                            buildW / winCols - 4,
                            buildH / winRows - 5
                        );
                    }
                }
            }

            // Spire on tall glass towers
            if (isGlass && buildH > 150) {
                this.ctx.fillStyle = '#64748b';
                this.ctx.fillRect(buildX + buildW/2 - 2, buildY - 20, 4, 20);
                // Warning light
                if (isNight) {
                    this.ctx.fillStyle = 'rgba(239,68,68,0.9)';
                    this.ctx.beginPath();
                    this.ctx.arc(buildX + buildW/2, buildY - 18, 2.5, 0, Math.PI*2);
                    this.ctx.fill();
                }
            }
        }

        this.ctx.restore();
    }

    /**
     * @brief Draws 6 radial light shafts (god rays) emanating from the sun.
     * Only active during dawn and dusk.
     * @private
     */
    _drawGodRays(w, h, body, alpha) {
        this.ctx.save();
        const rayCount = 6;
        const spread   = Math.PI * 0.45;
        const baseAngle = Math.PI * 0.5; // downward direction

        for (let r = 0; r < rayCount; r++) {
            const angle  = baseAngle - spread/2 + (r / (rayCount-1)) * spread;
            const rayLen = h * 1.2;
            const rayW   = (0.04 + r % 2 * 0.02) * w;

            const endX = body.x + Math.cos(angle) * rayLen;
            const endY = body.y + Math.sin(angle) * rayLen;

            const grad = this.ctx.createLinearGradient(body.x, body.y, endX, endY);
            grad.addColorStop(0, `rgba(253,186,116,${(alpha * 0.22).toFixed(3)})`);
            grad.addColorStop(1, 'rgba(253,186,116,0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.moveTo(body.x - Math.cos(angle + Math.PI/2) * rayW * 0.1, body.y - Math.sin(angle + Math.PI/2) * rayW * 0.1);
            this.ctx.lineTo(body.x + Math.cos(angle + Math.PI/2) * rayW * 0.1, body.y + Math.sin(angle + Math.PI/2) * rayW * 0.1);
            this.ctx.lineTo(endX + Math.cos(angle + Math.PI/2) * rayW, endY + Math.sin(angle + Math.PI/2) * rayW);
            this.ctx.lineTo(endX - Math.cos(angle + Math.PI/2) * rayW, endY - Math.sin(angle + Math.PI/2) * rayW);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    /**
     * @brief Draws an animated heat-shimmer band just above the road horizon.
     * Only active in the desert region.
     * @private
     */
    _drawHeatDistortion(w, h) {
        const t = Date.now() / 600;
        const horizonY = h * 0.49;
        const bandH    = 28;

        this.ctx.save();
        for (let x = 0; x < w; x += 6) {
            const shimmerY = horizonY + Math.sin(t + x * 0.04) * 3.5;
            const alpha    = 0.04 + Math.sin(t * 0.7 + x * 0.02) * 0.03;
            this.ctx.fillStyle = `rgba(255,240,180,${alpha.toFixed(3)})`;
            this.ctx.fillRect(x, shimmerY, 6, bandH);
        }
        this.ctx.restore();
    }

    /**
     * @brief Draws a subtle edge vignette and a distance fog gradient to add
     * depth and atmosphere. The fog density scales with weather.fogDensity.
     * @private
     */
    _drawAtmosphericVignette(w, h, weather, daynight) {
        // Distance haze over the far horizon
        const hazeY = h * 0.42;
        const hazeH = h * 0.12;
        const fogOpacity = Math.min(0.55, weather.fogDensity * 0.8 + 0.05);
        const hazeGrad = this.ctx.createLinearGradient(0, hazeY, 0, hazeY + hazeH);
        hazeGrad.addColorStop(0, `rgba(15,23,42,0)`);
        hazeGrad.addColorStop(0.5, `rgba(15,23,42,${fogOpacity.toFixed(3)})`);
        hazeGrad.addColorStop(1, `rgba(15,23,42,0)`);
        this.ctx.fillStyle = hazeGrad;
        this.ctx.fillRect(0, hazeY, w, hazeH);

        // Edge vignette (darkens screen corners)
        const vigGrad = this.ctx.createRadialGradient(w/2, h/2, h*0.35, w/2, h/2, h*0.85);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
        this.ctx.fillStyle = vigGrad;
        this.ctx.fillRect(0, 0, w, h);
    }

    /**
     * @brief Deterministic hash-based noise — maps an integer seed to [0, 1).
     * Used for consistent road patch/oil stain placement without per-frame RNG.
     * @param {number} n Integer seed value
     * @returns {number} Value in [0, 1)
     * @private
     */
    _fastHash(n) {
        let h = n ^ (n >>> 16);
        h = Math.imul(h, 0x45d9f3b);
        h = h ^ (h >>> 16);
        return (h >>> 0) / 4294967296;
    }

    /**
     * @brief Paints a polygon on the canvas.
     * @private
     */
    _drawPolygon(x1, y1, x2, y2, x3, y3, x4, y4, fillStyle) {
        this.ctx.fillStyle = fillStyle;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineTo(x3, y3);
        this.ctx.lineTo(x4, y4);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * @brief Renders static vector image sprites, extended for all 15 sprite types.
     * @private
     */
    _drawStaticSprite(type, point, scale, canvasWidth, assets, hour) {
        const img = assets.sprites[type];
        if (!img) return;

        const destW = img.width  * scale * canvasWidth / 2;
        const destH = img.height * scale * canvasWidth / 2;
        const destX = point.screen.x - destW / 2;
        const destY = point.screen.y - destH;

        this.ctx.drawImage(img, destX, destY, destW, destH);

        // Street light spotlight cone
        if (type === 'streetlight') {
            const lx = destX + destW * 0.75;
            const ly = destY + destH * 0.14;
            this.lightingManager.drawStreetLightSpotlight(this.ctx, lx, ly, scale, hour);
        }
    }

    /**
     * @brief Renders traffic cars.
     * @private
     */
    _drawVectorTraffic(x, y, scale, canvasWidth, v) {
        const destW = v.width * scale * canvasWidth / 2;
        const destH = v.height * scale * canvasWidth / 2;

        this.ctx.save();
        this.ctx.translate(x, y);

        // 1. Shadow
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, destW * 0.45, destH * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        this.ctx.fill();

        // 2. Tires
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(-destW * 0.44, -destH * 0.25, destW * 0.15, destH * 0.3);
        this.ctx.fillRect(destW * 0.29, -destH * 0.25, destW * 0.15, destH * 0.3);

        // 3. Main Chassis body
        this.ctx.fillStyle = v.color;
        this.ctx.beginPath();
        this.ctx.roundRect(-destW * 0.45, -destH, destW * 0.9, destH * 0.9, destH * 0.15);
        this.ctx.closePath();
        this.ctx.fill();

        if (v.type === "Police Car") {
            const now = Date.now() / 200.0;
            const flashLeft = Math.sin(now) > 0;
            this.ctx.fillStyle = flashLeft ? '#3b82f6' : '#ef4444';
            this.ctx.fillRect(-destW * 0.15, -destH * 1.12, destW * 0.3, destH * 0.15);
        } else if (v.type === "Ambulance") {
            this.ctx.fillStyle = '#f8fafc';
            this.ctx.beginPath();
            this.ctx.roundRect(-destW * 0.45, -destH, destW * 0.9, destH * 0.9, destH * 0.1);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillRect(-destW * 0.04, -destH * 0.6, destW * 0.08, destH * 0.3);
            this.ctx.fillRect(-destW * 0.12, -destH * 0.49, destW * 0.24, destH * 0.08);
        } else if (v.type === "Truck" || v.type === "Bus") {
            this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-destW * 0.4, -destH * 0.9, destW * 0.8, destH * 0.8);
        }

        // 4. Rear window glass
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        this.ctx.beginPath();
        this.ctx.roundRect(-destW * 0.35, -destH * 0.85, destW * 0.7, destH * 0.4, destH * 0.08);
        this.ctx.closePath();
        this.ctx.fill();

        // 5. Taillights (Brakes glow red)
        if (v.isBraking) {
            this.ctx.shadowColor = 'var(--accent-red)';
            this.ctx.shadowBlur = 8;
            this.ctx.fillStyle = 'var(--accent-red)';
        } else {
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#991b1b';
        }
        
        this.ctx.fillRect(-destW * 0.42, -destH * 0.4, destW * 0.12, destH * 0.12);
        this.ctx.fillRect(destW * 0.3, -destH * 0.4, destW * 0.12, destH * 0.12);

        this.ctx.restore();
    }

    /**
     * @brief Renders roadside and road surface obstacles.
     * @private
     */
    _drawVectorObstacle(x, y, scale, canvasWidth, o) {
        const destW = o.width * scale * canvasWidth / 2;
        const destH = o.height * scale * canvasWidth / 2;

        this.ctx.save();
        this.ctx.translate(x, y);

        switch (o.type) {
            case "Traffic Cone":
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, destW * 0.5, destH * 0.12, 0, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                this.ctx.fill();

                this.ctx.fillStyle = '#0f172a';
                this.ctx.fillRect(-destW * 0.5, -destH * 0.1, destW, destH * 0.15);

                this.ctx.fillStyle = '#f97316';
                this.ctx.beginPath();
                this.ctx.moveTo(-destW * 0.3, -destH * 0.1);
                this.ctx.lineTo(destW * 0.3, -destH * 0.1);
                this.ctx.lineTo(destW * 0.05, -destH);
                this.ctx.lineTo(-destW * 0.05, -destH);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.moveTo(-destW * 0.18, -destH * 0.45);
                this.ctx.lineTo(destW * 0.18, -destH * 0.45);
                this.ctx.lineTo(destW * 0.12, -destH * 0.7);
                this.ctx.lineTo(-destW * 0.12, -destH * 0.7);
                this.ctx.closePath();
                this.ctx.fill();
                break;

            case "Barrel":
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, destW * 0.45, destH * 0.15, 0, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                this.ctx.fill();

                this.ctx.fillStyle = '#ea580c';
                this.ctx.beginPath();
                this.ctx.roundRect(-destW * 0.45, -destH, destW * 0.9, destH, destH * 0.08);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.fillStyle = '#1e293b';
                this.ctx.fillRect(-destW * 0.45, -destH * 0.65, destW * 0.9, destH * 0.12);
                this.ctx.fillRect(-destW * 0.45, -destH * 0.35, destW * 0.9, destH * 0.12);
                break;

            case "Construction Barrier":
                this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                this.ctx.fillRect(-destW * 0.5, -destH * 0.1, destW, destH * 0.2);

                this.ctx.fillStyle = '#475569';
                this.ctx.fillRect(-destW * 0.35, -destH, destW * 0.08, destH);
                this.ctx.fillRect(destW * 0.27, -destH, destW * 0.08, destH);

                this.ctx.fillStyle = '#e2e8f0';
                this.ctx.fillRect(-destW * 0.5, -destH * 0.9, destW, destH * 0.3);
                this.ctx.fillRect(-destW * 0.5, -destH * 0.45, destW, destH * 0.3);

                this.ctx.fillStyle = '#f97316';
                const stripeW = destW * 0.12;
                for (let sx = -destW * 0.5; sx < destW * 0.5; sx += stripeW * 2) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx, -destH * 0.9);
                    this.ctx.lineTo(sx + stripeW, -destH * 0.9);
                    this.ctx.lineTo(sx + stripeW + 10, -destH * 0.6);
                    this.ctx.lineTo(sx + 10, -destH * 0.6);
                    this.ctx.closePath();
                    this.ctx.fill();

                    this.ctx.beginPath();
                    this.ctx.moveTo(sx, -destH * 0.45);
                    this.ctx.lineTo(sx + stripeW, -destH * 0.45);
                    this.ctx.lineTo(sx + stripeW + 10, -destH * 0.15);
                    this.ctx.lineTo(sx + 10, -destH * 0.15);
                    this.ctx.closePath();
                    this.ctx.fill();
                }

                if (o.hazardLightOn) {
                    this.ctx.shadowColor = 'var(--accent-orange)';
                    this.ctx.shadowBlur = 8;
                    this.ctx.fillStyle = '#fb923c';
                } else {
                    this.ctx.shadowBlur = 0;
                    this.ctx.fillStyle = '#7c2d12';
                }
                this.ctx.beginPath();
                this.ctx.arc(-destW * 0.2, -destH * 1.05, destW * 0.06, 0, Math.PI * 2);
                this.ctx.arc(destW * 0.2, -destH * 1.05, destW * 0.06, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case "Oil Spill":
                this.ctx.save();
                this.ctx.rotate(o.rotation);
                
                const oilGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, destW * 0.5);
                oilGrad.addColorStop(0, '#581c87');
                oilGrad.addColorStop(0.6, '#2e0854');
                oilGrad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
                
                this.ctx.fillStyle = oilGrad;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, destW * 0.5, destH * 0.5, 0, 0, Math.PI * 2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
                break;

            case "Broken Vehicle":
                const bodyColor = '#475569';
                this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, destW * 0.45, destH * 0.15, 0, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = bodyColor;
                this.ctx.beginPath();
                this.ctx.roundRect(-destW * 0.45, -destH, destW * 0.9, destH * 0.9, destH * 0.1);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.fillStyle = '#0f172a';
                this.ctx.beginPath();
                this.ctx.roundRect(-destW * 0.35, -destH * 0.85, destW * 0.7, destH * 0.4, destH * 0.08);
                this.ctx.closePath();
                this.ctx.fill();

                const flash = (Math.floor(Date.now() / 300) % 2 === 0);
                this.ctx.fillStyle = flash ? '#eab308' : '#713f12';
                this.ctx.fillRect(-destW * 0.42, -destH * 0.4, destW * 0.1, destH * 0.1);
                this.ctx.fillRect(destW * 0.32, -destH * 0.4, destW * 0.1, destH * 0.1);

                const smokeTime = (Date.now() / 400) % 3;
                this.ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
                this.ctx.beginPath();
                this.ctx.arc(-destW * 0.2 + (smokeTime * 5), -destH * 1.1 - (smokeTime * 15), destW * 0.08 * (smokeTime + 0.5), 0, Math.PI * 2);
                this.ctx.fill();
                break;
        }

        this.ctx.restore();
    }

    /**
     * @brief Renders a single particle.
     * @private
     */
    _drawVectorParticle(x, y, scale, canvasWidth, p) {
        const screenY = y - (p.y * scale * canvasWidth / 2);
        const pSize = Math.max(1.0, p.size * scale * canvasWidth * 0.1);

        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(x, screenY, pSize / 2, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fill();
    }
}

window.Renderer = Renderer;
