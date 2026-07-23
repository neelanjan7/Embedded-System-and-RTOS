/**
 * @file lighting_manager.js
 * @brief Dynamic street light spotlights, headlight gloss, and road puddle overlays.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class LightingManager {
    constructor() {
        this.puddlePositions = [];
        this._initPuddlesSeed();
    }

    /**
     * @brief Generates static lateral offsets for puddles.
     * @private
     */
    _initPuddlesSeed() {
        // Pre-generate static offsets for 100 road segment intervals
        for (let i = 0; i < 150; i++) {
            this.puddlePositions.push({
                xOffset: (Math.random() * 1.2 - 0.6), // inside lanes
                size: Math.random() * 30.0 + 20.0
            });
        }
    }

    /**
     * @brief Overlay glossy sky reflecting gradients onto wet tarmac segment strips.
     */
    drawWetRoadReflection(ctx, p1, p2, daynight, weather) {
        const intensity = weather.rainIntensity;
        if (intensity < 0.15) return;

        ctx.save();

        // 1. Glossy sky reflection (Linear vertical gradient over segment tarmac)
        const reflectGrad = ctx.createLinearGradient(0, p2.screen.y, 0, p1.screen.y);
        const skyColors = daynight.getSkyLighting();
        
        // Soft blue sky specular reflection
        reflectGrad.addColorStop(0, `rgba(14, 116, 144, ${intensity * 0.15})`);
        reflectGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = reflectGrad;
        
        ctx.beginPath();
        ctx.moveTo(p1.screen.x - p1.screen.w, p1.screen.y);
        ctx.lineTo(p1.screen.x + p1.screen.w, p1.screen.y);
        ctx.lineTo(p2.screen.x + p2.screen.w, p2.screen.y);
        ctx.lineTo(p2.screen.x - p2.screen.w, p2.screen.y);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * @brief Paints dark reflective puddle ellipses onto the asphalt.
     */
    drawPuddles(ctx, index, p1, p2, weather) {
        const intensity = weather.rainIntensity;
        if (intensity < 0.3) return;

        // Draw puddles only at specific segments
        if (index % 12 !== 0) return;

        const seedIdx = (index / 12) % this.puddlePositions.length;
        const seed = this.puddlePositions[seedIdx];

        ctx.save();

        const scale = p1.screen.scale;
        const roadW = p1.screen.w;
        
        // Puddle screen coordinate anchors
        const px = p1.screen.x + (roadW * seed.xOffset);
        const py = p1.screen.y;

        const w = seed.size * scale * ctx.canvas.width * 0.3;
        const h = w * 0.18; // flat aspect ratio

        // Dark oily sheen circle
        const puddleGrad = ctx.createRadialGradient(px, py, 0, px, py, w);
        puddleGrad.addColorStop(0, `rgba(15, 23, 42, ${intensity * 0.6})`); // dark body
        puddleGrad.addColorStop(0.7, `rgba(56, 189, 248, ${intensity * 0.25})`); // cyan glossy edge
        puddleGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = puddleGrad;
        ctx.beginPath();
        ctx.ellipse(px, py, w, h, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * @brief Projects warm yellow spotlights on tarmac from street light headers.
     */
    drawStreetLightSpotlight(ctx, sx, sy, scale, hour) {
        // Active during night hours
        const isDark = hour < 5.0 || hour > 19.5;
        if (!isDark) return;

        ctx.save();

        const canvasW = ctx.canvas.width;
        const spotW = 120.0 * scale * canvasW / 2;
        const spotH = spotW * 0.25;

        // Draw spotlight cone from light bulb header (sy) down to ground plane (sy + height)
        // Since street light is beside the road, we project cone downwards
        const groundY = sy + (180.0 * scale * canvasW / 2);

        const spotlightGrad = ctx.createLinearGradient(sx, sy, sx, groundY);
        spotlightGrad.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
        spotlightGrad.addColorStop(0.7, 'rgba(253, 224, 71, 0.12)');
        spotlightGrad.addColorStop(1, 'rgba(253, 224, 71, 0.0)');

        ctx.fillStyle = spotlightGrad;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy);
        ctx.lineTo(sx + 4, sy);
        this.ctx = ctx; // capture for safety (not needed)
        ctx.lineTo(sx + spotW / 2, groundY);
        ctx.lineTo(sx - spotW / 2, groundY);
        ctx.closePath();
        ctx.fill();

        // Draw circular light beam on the asphalt surface
        ctx.fillStyle = 'rgba(253, 224, 71, 0.08)';
        ctx.beginPath();
        ctx.ellipse(sx, groundY, spotW / 2, spotH / 2, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

window.LightingManager = LightingManager;
