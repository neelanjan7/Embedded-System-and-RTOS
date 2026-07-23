/**
 * @file daynight_manager.js
 * @brief Time-of-day progression, sky lighting, celestial bodies, god rays, clouds, and stars.
 *
 * Cycles hours 0.0–24.0 and produces data consumed by Renderer and EnvironmentFX for
 * volumetric sky rendering including cloud positions, star field, Milky Way, and sun halos.
 *
 * Author: Sagar Kumar
 * Date: 2026
 */

class DayNightManager {
    constructor() {
        this.time      = 12.0;   // Hours (12=noon, 0=midnight)
        this.timeSpeed = 0.15;   // Hours per real second

        this.colors = {
            morning: { top:'#1e1b4b', bottom:'#ea580c', ambient:'rgba(251,146,60,0.25)' },
            noon:    { top:'#020617', bottom:'#0891b2', ambient:'rgba(255,255,255,0.0)'  },
            evening: { top:'#2e1065', bottom:'#db2777', ambient:'rgba(244,63,94,0.22)'  },
            night:   { top:'#030712', bottom:'#0f172a', ambient:'rgba(15,23,42,0.72)'   }
        };

        // Cloud layer — 10 clouds generated once, animated in EnvironmentFX
        this.clouds = this._generateClouds();

        // Star field — 80 stars, stable positions
        this.stars = this._generateStars();
    }

    /**
     * @brief Resets progression time.
     */
    reset() { this.time = 12.0; }

    /**
     * @brief Increments clock ticks.
     * @param {number} dt Delta time in seconds
     */
    update(dt) {
        if (dt <= 0) return;
        this.time = (this.time + this.timeSpeed * dt) % 24.0;
    }

    /**
     * @brief Returns sky gradient colours and ambient tint for the current hour.
     * @returns {Object} { skyTop, skyBottom, ambient }
     */
    getSkyLighting() {
        const t = this.time;
        let skyTop, skyBottom, ambient;

        if      (t >= 5.0 && t < 8.0)  { const r=(t-5)/3;  skyTop=this._bl(this.colors.night.top,   this.colors.morning.top,   r); skyBottom=this._bl(this.colors.night.bottom,   this.colors.morning.bottom,   r); ambient=this._ba(this.colors.night.ambient,   this.colors.morning.ambient,   r); }
        else if (t >= 8.0 && t < 11.0) { const r=(t-8)/3;  skyTop=this._bl(this.colors.morning.top, this.colors.noon.top,      r); skyBottom=this._bl(this.colors.morning.bottom, this.colors.noon.bottom,      r); ambient=this._ba(this.colors.morning.ambient, this.colors.noon.ambient,      r); }
        else if (t >= 11.0 && t < 17.0){ skyTop=this.colors.noon.top;    skyBottom=this.colors.noon.bottom;    ambient=this.colors.noon.ambient; }
        else if (t >= 17.0 && t < 20.0){ const r=(t-17)/3; skyTop=this._bl(this.colors.noon.top,    this.colors.evening.top,   r); skyBottom=this._bl(this.colors.noon.bottom,    this.colors.evening.bottom,   r); ambient=this._ba(this.colors.noon.ambient,    this.colors.evening.ambient,   r); }
        else if (t >= 20.0 && t < 23.0){ const r=(t-20)/3; skyTop=this._bl(this.colors.evening.top, this.colors.night.top,     r); skyBottom=this._bl(this.colors.evening.bottom, this.colors.night.bottom,     r); ambient=this._ba(this.colors.evening.ambient, this.colors.night.ambient,     r); }
        else                            { skyTop=this.colors.night.top;   skyBottom=this.colors.night.bottom;   ambient=this.colors.night.ambient; }

        return { skyTop, skyBottom, ambient };
    }

    /**
     * @brief Returns sun or moon position, size, and colour.
     * @param {number} canvasW
     * @param {number} canvasH
     * @returns {Object} Celestial body descriptor
     */
    getCelestialBody(canvasW, canvasH) {
        const t = this.time;
        let isSun = true, angle = 0.0;

        if (t >= 5.0 && t < 19.0) {
            isSun = true;
            angle = ((t - 5.0) / 14.0) * Math.PI;
        } else {
            isSun = false;
            const mt = t >= 19.0 ? t - 19.0 : t + 5.0;
            angle = (mt / 10.0) * Math.PI;
        }

        const radius = canvasW * 0.4;
        const cx = canvasW / 2;
        const cy = canvasH * 0.45;
        const x  = cx - Math.cos(angle) * radius;
        const y  = cy - Math.sin(angle) * radius * 0.7;

        return {
            x, y,
            type: isSun ? 'sun' : 'moon',
            glow: isSun ? 'rgba(253,224,71,0.4)' : 'rgba(226,232,240,0.3)',
            fill: isSun ? '#fde047' : '#e2e8f0',
            size: isSun ? 32 : 18
        };
    }

    /**
     * @brief Returns god-ray (sun halo) intensity for morning / evening hours.
     * Returns 0 during full day or night.
     * @returns {number} Alpha value 0..1
     */
    getSunHaloIntensity() {
        const t = this.time;
        if (t >= 5.0  && t < 7.5)  return 0.45 * (1.0 - (t - 5.0) / 2.5);
        if (t >= 17.5 && t < 20.0) return 0.45 * ((t - 17.5) / 2.5);
        return 0.0;
    }

    /**
     * @brief Returns the current star-field visibility alpha.
     * @returns {number} 0..1
     */
    getStarAlpha() {
        const t = this.time;
        if (t >= 21.0 || t < 5.0)  return 1.0;
        if (t >= 20.0 && t < 21.0) return (t - 20.0);
        if (t >= 5.0  && t < 6.0)  return 1.0 - (t - 5.0);
        return 0.0;
    }

    /**
     * @brief Returns Milky Way band opacity (0 during day, 0..0.6 at night).
     * @returns {number}
     */
    getMilkyWayAlpha() {
        return this.getStarAlpha() * 0.55;
    }

    /**
     * @brief Returns cloud array for EnvironmentFX to render and animate.
     * @returns {Array}
     */
    getClouds() { return this.clouds; }

    /**
     * @brief Returns the fixed star position array.
     * @returns {Array}
     */
    getStars() { return this.stars; }

    // =========================================================================
    // PRIVATE
    // =========================================================================

    /** @private */
    _generateClouds() {
        const clouds = [];
        for (let i = 0; i < 10; i++) {
            clouds.push({
                x:     (i / 10) * 1.4 - 0.2,   // normalised [0..1] position
                y:     0.05 + (i % 4) * 0.055,  // height fraction of sky
                w:     0.08 + (i % 5) * 0.04,   // width fraction of canvas
                h:     0.025 + (i % 3) * 0.012,
                speed: 0.004 + (i % 3) * 0.003, // fraction per second
                alpha: 0.55 + (i % 4) * 0.1
            });
        }
        return clouds;
    }

    /** @private */
    _generateStars() {
        const stars = [];
        let seed = 42;
        const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        for (let i = 0; i < 80; i++) {
            stars.push({
                x:     rng(),             // normalised 0..1
                y:     rng() * 0.48,      // only in upper half of sky
                size:  0.5 + rng() * 1.5,
                twinkle: rng() * Math.PI * 2 // phase offset
            });
        }
        return stars;
    }

    /** @private */
    _bl(c1, c2, r) {
        const p = (c) => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
        const [r1,g1,b1]=p(c1), [r2,g2,b2]=p(c2);
        const rr=Math.round(r1+(r2-r1)*r), gg=Math.round(g1+(g2-g1)*r), bb=Math.round(b1+(b2-b1)*r);
        return `#${rr.toString(16).padStart(2,'0')}${gg.toString(16).padStart(2,'0')}${bb.toString(16).padStart(2,'0')}`;
    }

    /** @private */
    _ba(a1, a2, r) {
        const p = (s) => s.replace('rgba(','').replace(')','').split(',').map(Number);
        const [r1,g1,b1,a1v]=p(a1), [r2,g2,b2,a2v]=p(a2);
        return `rgba(${Math.round(r1+(r2-r1)*r)},${Math.round(g1+(g2-g1)*r)},${Math.round(b1+(b2-b1)*r)},${(a1v+(a2v-a1v)*r).toFixed(3)})`;
    }
}

window.DayNightManager = DayNightManager;
