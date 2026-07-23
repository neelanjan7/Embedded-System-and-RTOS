/**
 * @file road.js
 * @brief Procedural 12-region highway generator — 1200 segments, biome colours,
 *        bridges, tunnels, sine-eased curves, multi-profile hills, and deterministic
 *        region-specific sprite placement.
 *
 * Regions (100 segments each):
 *   0  Mountain Highway  |  6  Lakeside Highway
 *   1  Dense Forest      |  7  Desert Road
 *   2  Small Village     |  8  Snow Mountain
 *   3  Modern City       |  9  Airport Highway
 *   4  Industrial Zone   | 10  Farmland
 *   5  Wind Farm         | 11  Coastal Highway
 *
 * Author: Sagar Kumar
 * Date: 2026
 */

class Road {
    constructor() {
        this.segments      = [];
        this.segmentLength = 200;
        this.roadWidth     = 2000;
        this.lanes         = 3;

        // Colour palettes for each region (light/dark alternating stripes)
        this.regionColors = {
            mountain:   { light:{road:'#1c2536',grass:'#374151',rumble:'#dc2626',lane:'#4b5563'}, dark:{road:'#0d1520',grass:'#1f2937',rumble:'#f8fafc',lane:'#0d1520'} },
            forest:     { light:{road:'#1a2838',grass:'#14532d',rumble:'#dc2626',lane:'#374151'}, dark:{road:'#0e1a22',grass:'#0d3320',rumble:'#f8fafc',lane:'#0e1a22'} },
            village:    { light:{road:'#1e2a3a',grass:'#1a4a2e',rumble:'#dc2626',lane:'#475569'}, dark:{road:'#0f1a26',grass:'#0d3320',rumble:'#f8fafc',lane:'#0f1a26'} },
            city:       { light:{road:'#1e2030',grass:'#1e2030',rumble:'#3b82f6',lane:'#475569'}, dark:{road:'#12141e',grass:'#12141e',rumble:'#f8fafc',lane:'#12141e'} },
            industrial: { light:{road:'#1c1c22',grass:'#27272a',rumble:'#f97316',lane:'#3f3f46'}, dark:{road:'#0d0d10',grass:'#18181b',rumble:'#fbbf24',lane:'#0d0d10'} },
            windfarm:   { light:{road:'#1e2a3a',grass:'#1a4a2e',rumble:'#dc2626',lane:'#475569'}, dark:{road:'#0f1a26',grass:'#0d3320',rumble:'#f8fafc',lane:'#0f1a26'} },
            lakeside:   { light:{road:'#1e2d3d',grass:'#164e63',rumble:'#dc2626',lane:'#1e3a5f'}, dark:{road:'#0f1d2b',grass:'#0c3040',rumble:'#f8fafc',lane:'#0f1d2b'} },
            desert:     { light:{road:'#2d2318',grass:'#854d0e',rumble:'#eab308',lane:'#a16207'}, dark:{road:'#1c1610',grass:'#713f12',rumble:'#f8fafc',lane:'#1c1610'} },
            snow:       { light:{road:'#2a3548',grass:'#cbd5e1',rumble:'#3b82f6',lane:'#94a3b8'}, dark:{road:'#1a2536',grass:'#e2e8f0',rumble:'#1d4ed8',lane:'#1a2536'} },
            airport:    { light:{road:'#1e2030',grass:'#1e2030',rumble:'#eab308',lane:'#fbbf24'}, dark:{road:'#12141e',grass:'#12141e',rumble:'#f8fafc',lane:'#12141e'} },
            farmland:   { light:{road:'#1e2a3a',grass:'#15803d',rumble:'#dc2626',lane:'#475569'}, dark:{road:'#0f1a26',grass:'#14532d',rumble:'#f8fafc',lane:'#0f1a26'} },
            coastal:    { light:{road:'#1e2d3d',grass:'#0f4c75',rumble:'#dc2626',lane:'#1e3a5f'}, dark:{road:'#0f1d2b',grass:'#0c3252',rumble:'#f8fafc',lane:'#0f1d2b'} }
        };

        // Region name list in order
        this._regionNames = ['mountain','forest','village','city','industrial','windfarm','lakeside','desert','snow','airport','farmland','coastal'];
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    generate() {
        this.segments = [];
        const total   = 1200;

        for (let i = 0; i < total; i++) {
            const biome   = this._getRegion(i);
            const type    = this._getSegmentType(i);
            const isLight = Math.floor(i / 3) % 2 === 0;
            const colors  = this.regionColors[biome][isLight ? 'light' : 'dark'];

            const curve  = this._getCurve(i);
            const hillY  = this._getHillHeight(i);
            const hillY0 = this._getHillHeight(i - 1);

            const seg = {
                index:     i,
                biome:     biome,
                type:      type,
                curve:     curve,
                color:     colors,
                skidMarks: null,
                p1: { world:{ x:0, y:hillY0, z:(i-1)*this.segmentLength }, screen:{ x:0, y:0, w:0 } },
                p2: { world:{ x:0, y:hillY,  z: i   *this.segmentLength }, screen:{ x:0, y:0, w:0 } },
                sprites: []
            };

            this._placeSprites(seg);
            this.segments.push(seg);
        }

        console.log(`[Road] ${this.segments.length} segments across 12 world regions.`);
    }

    findSegment(z) {
        const len = this.segments.length;
        const idx = Math.floor(z / this.segmentLength) % len;
        return this.segments[idx >= 0 ? idx : 0];
    }

    // =========================================================================
    // REGION MAPPING
    // =========================================================================

    _getRegion(i) {
        const zone = Math.floor(i / 100) % this._regionNames.length;
        return this._regionNames[zone];
    }

    _getSegmentType(i) {
        // Bridge zones: mountain cliff (220-250), coastal (1150-1180)
        if ((i>=220&&i<252) || (i>=1150&&i<1182)) return 'bridge';
        // Tunnel zones: mountain pass (80-110), industrial underpass (430-460)
        if ((i>=80&&i<112)  || (i>=430&&i<462))   return 'tunnel';
        return 'normal';
    }

    // =========================================================================
    // CURVES (sine-eased zones)
    // =========================================================================

    _getCurve(i) {
        // Mountain pass sweeper
        if (i>=30  && i<80)  return  2.2 * Math.sin(((i-30)/50)  * Math.PI);
        // Forest chicane L
        if (i>=130 && i<170) return -2.8 * Math.sin(((i-130)/40) * Math.PI);
        // Village S-curve
        if (i>=185 && i<210) return  1.6 * Math.sin(((i-185)/25) * Math.PI);
        if (i>=210 && i<235) return -1.6 * Math.sin(((i-210)/25) * Math.PI);
        // City straight (no curve)
        // Industrial long right
        if (i>=380 && i<460) return  1.4 * Math.sin(((i-380)/80) * Math.PI);
        // Wind farm sweeper
        if (i>=510 && i<590) return -1.8 * Math.sin(((i-510)/80) * Math.PI);
        // Lakeside gentle
        if (i>=620 && i<700) return  1.2 * Math.sin(((i-620)/80) * Math.PI);
        // Desert straight (no curve)
        // Snow mountain hairpin
        if (i>=830 && i<880) return -3.5 * Math.sin(((i-830)/50) * Math.PI);
        // Farmland long sweeper
        if (i>=1050&& i<1130)return  1.6 * Math.sin(((i-1050)/80)* Math.PI);
        // Coastal tight bend
        if (i>=1160&& i<1200)return -2.4 * Math.sin(((i-1160)/40)* Math.PI);
        return 0.0;
    }

    // =========================================================================
    // HILLS
    // =========================================================================

    _getHillHeight(i) {
        if (i < 0) return 0.0;
        // Mountain highway — two rolling peaks
        if (i>=0   && i<200)  return Math.sin(((i)/200)*Math.PI) * 1600;
        // Village — gentle rolling
        if (i>=200 && i<300)  return Math.sin(((i-200)/100)*Math.PI*2) * 400;
        // Industrial — flat
        if (i>=300 && i<500)  return 0.0;
        // Lakeside — slight dip toward water
        if (i>=600 && i<700)  return -Math.sin(((i-600)/100)*Math.PI) * 300;
        // Desert — dead flat
        if (i>=700 && i<800)  return 0.0;
        // Snow mountain — big climb
        if (i>=800 && i<950)  return Math.sin(((i-800)/150)*Math.PI) * 2200;
        // Airport — runway flat
        if (i>=900 && i<1000) return 0.0;
        // Coastal cliff — drops away
        if (i>=1100&& i<1200) return -Math.sin(((i-1100)/100)*Math.PI*0.5)*600;
        return 0.0;
    }

    // =========================================================================
    // SPRITE PLACEMENT
    // =========================================================================

    _placeSprites(seg) {
        const i    = seg.index;
        const rng  = this._rng(i);
        const biome = seg.biome;

        // --- Universal: km markers, emergency phones ---
        if (i % 10 === 0) seg.sprites.push({ type:'km_marker', xOffset:1.28 });
        if (i % 50 === 0 && i > 0) seg.sprites.push({ type:'emergency_phone', xOffset:-1.28 });

        // --- Universal: speed cameras, drain covers ---
        if (i % 38 === 0) seg.sprites.push({ type:'speed_camera', xOffset: rng()>0.5?-1.35:1.35 });
        if (i % 12 === 0) seg.sprites.push({ type:'drain_cover',  xOffset: (rng()-0.5)*0.8 });

        // --- Universal: street lights (alternating sides) ---
        if (i % 16 === 0) {
            const side = (Math.floor(i/16) % 2 === 0) ? -1.38 : 1.38;
            seg.sprites.push({ type:'streetlight', xOffset:side });
        }

        // --- Universal: billboards ---
        if (i % 40 === 0) seg.sprites.push({ type:'billboard', xOffset:-(2.0+rng()*0.3) });

        // --- Universal: guardrails on curves and bridges ---
        const inCurve = Math.abs(seg.curve) > 0.8;
        const isBridge = seg.type === 'bridge';
        if ((inCurve || isBridge) && i % 2 === 0) {
            let guardrailType = (rng() > 0.95) ? 'damaged_guardrail' : 'guardrail';
            seg.sprites.push({ type:guardrailType, xOffset: seg.curve>0?-1.22:1.22 });
        }

        // --- Universal: reflective studs (lane dividers) ---
        if (i % 4 === 0) {
            seg.sprites.push({ type:'reflective_stud', xOffset: -0.33 });
            seg.sprites.push({ type:'reflective_stud', xOffset: 0.33 });
        }

        // --- Crash cushions at tunnel/bridge ends ---
        if (i===78||i===112||i===218||i===252||i===428||i===462||i===1148||i===1182) {
            seg.sprites.push({ type:'crash_cushion', xOffset:-1.1 });
            seg.sprites.push({ type:'crash_cushion', xOffset: 1.1 });
        }

        // --- REGION-SPECIFIC ---
        switch (biome) {
            case 'mountain':
                if (i%5===0) { seg.sprites.push({ type:'pine_tall', xOffset:-(1.5+rng()*0.5) }); seg.sprites.push({ type:'pine_tall', xOffset:(1.5+rng()*0.5) }); }
                if (i%9===0) { seg.sprites.push({ type:'rock',      xOffset:-(1.4+rng()*0.5) }); }
                if (rng()>0.94) seg.sprites.push({ type:'dead_tree', xOffset:(1.6+rng()*0.3)*(rng()>0.5?1:-1) });
                if (i%15===0) seg.sprites.push({ type:'cliff_face', xOffset:-(2.0+rng()*0.5) });
                if (i%20===0) seg.sprites.push({ type:'waterfall', xOffset:(2.5+rng()*0.5) });
                if (i%25===0) seg.sprites.push({ type:'cave', xOffset:-(2.5+rng()*0.5) });
                break;

            case 'forest':
                if (i%3===0) { seg.sprites.push({ type:'pine_tall', xOffset:-(1.5+rng()*0.4) }); seg.sprites.push({ type:'pine_tall', xOffset:(1.5+rng()*0.4) }); }
                if (i%5===0) { seg.sprites.push({ type:'pine_tall', xOffset:-(2.0+rng()*0.3) }); seg.sprites.push({ type:'pine_tall', xOffset:(2.0+rng()*0.3) }); }
                if (i%8===0)   seg.sprites.push({ type:'bush',       xOffset:(rng()>0.5?-1:1)*(1.35+rng()*0.3) });
                if (rng()>0.95) seg.sprites.push({ type:'rock',      xOffset:(rng()>0.5?-1:1)*(1.5+rng()*0.4) });
                if (i%4===0)   seg.sprites.push({ type:'flower',     xOffset:(rng()>0.5?-1:1)*(1.4+rng()*0.2) });
                if (i%12===0)  seg.sprites.push({ type:'fallen_log', xOffset:-(1.6+rng()*0.4) });
                break;

            case 'village':
                if (i%7===0) { seg.sprites.push({ type:'tree',       xOffset:-(1.6+rng()*0.4) }); seg.sprites.push({ type:'tree', xOffset:(1.6+rng()*0.4) }); }
                if (i%8===0)   seg.sprites.push({ type:'bush',        xOffset:(rng()>0.5?-1:1)*(1.3+rng()*0.3) });
                if (i%20===0)  seg.sprites.push({ type:'parked_car',  xOffset: 1.3 });
                if (i%14===0)  seg.sprites.push({ type:'traffic_light', xOffset:-(1.5+rng()*0.2) });
                if (i%15===0)  seg.sprites.push({ type:'utility_pole',  xOffset: 1.4 });
                if (i%60===5)  seg.sprites.push({ type:'road_sign_turn', xOffset:-(1.5+rng()*0.2) });
                if (i%12===0)  seg.sprites.push({ type:'shop_front', xOffset:-(2.0+rng()*0.3) });
                if (i%18===0)  seg.sprites.push({ type:'bus_stop', xOffset: 1.4 });
                break;

            case 'city':
                if (i%4===0)  { seg.sprites.push({ type:'building',    xOffset:-(2.2+rng()*0.5) }); seg.sprites.push({ type:'building',    xOffset:(2.2+rng()*0.5) }); }
                if (i%8===0)    seg.sprites.push({ type:'glass_tower',  xOffset:-(2.8+rng()*0.4) });
                if (i%6===0)    seg.sprites.push({ type:'traffic_light', xOffset:-(1.45+rng()*0.2) });
                if (i%5===0)    seg.sprites.push({ type:'utility_pole',  xOffset: 1.4+rng()*0.2 });
                if (i%10===0)   seg.sprites.push({ type:'parked_car',    xOffset: rng()>0.5?1.2:-1.2 });
                if (i%12===0)   seg.sprites.push({ type:'fence_panel',   xOffset:-(1.8+rng()*0.3) });
                if (i%5===0)    seg.sprites.push({ type:'apartment',   xOffset:(2.0+rng()*0.4) });
                if (i%15===0)   seg.sprites.push({ type:'neon_sign',   xOffset:-(1.8+rng()*0.2) });
                if (i%30===0)   seg.sprites.push({ type:'pedestrian_bridge', xOffset:0 });
                if (i%40===0)   seg.sprites.push({ type:'police_car', xOffset: 1.3 });
                break;

            case 'industrial':
                if (i%6===0)  { seg.sprites.push({ type:'warehouse',   xOffset:-(2.5+rng()*0.5) }); }
                if (i%8===0)    seg.sprites.push({ type:'utility_pole', xOffset: 1.4 });
                if (i%10===0)   seg.sprites.push({ type:'fence_panel',  xOffset:-(1.7+rng()*0.3) });
                if (i%12===0)   seg.sprites.push({ type:'fence_panel',  xOffset: 1.7+rng()*0.3 });
                if (i%18===0)   seg.sprites.push({ type:'parked_car',   xOffset: 1.3 });
                if (rng()>0.94) seg.sprites.push({ type:'rock',         xOffset:-(1.5+rng()*0.3) });
                if (i%25===0)   seg.sprites.push({ type:'broken_car',   xOffset: -1.3 });
                if (i%35===0)   seg.sprites.push({ type:'tow_truck',   xOffset: 1.3 });
                if (i%10===0)   seg.sprites.push({ type:'construction_cone', xOffset: (rng()>0.5?-1:1)*1.2 });
                if (i%15===0)   seg.sprites.push({ type:'road_worker', xOffset: (rng()>0.5?-1:1)*1.4 });
                break;

            case 'windfarm':
                if (i%20===0) { seg.sprites.push({ type:'wind_turbine', xOffset:-(2.5+rng()*0.8) }); seg.sprites.push({ type:'wind_turbine', xOffset:(2.5+rng()*0.8) }); }
                if (i%7===0)    seg.sprites.push({ type:'bush',          xOffset:(rng()>0.5?-1:1)*(1.4+rng()*0.4) });
                if (i%10===0)   seg.sprites.push({ type:'tree',          xOffset: rng()>0.5?-(1.6+rng()*0.5):(1.6+rng()*0.5) });
                break;

            case 'lakeside':
                if (i%8===0)    seg.sprites.push({ type:'tree',     xOffset:-(1.6+rng()*0.5) });
                if (i%8===4)    seg.sprites.push({ type:'bush',     xOffset: 1.4+rng()*0.4 });
                if (i%12===0)   seg.sprites.push({ type:'rock',     xOffset:-(1.5+rng()*0.3) });
                break;

            case 'desert':
                if (i%10===0)   seg.sprites.push({ type:'rock',     xOffset:-(1.5+rng()*0.8) });
                if (i%10===5)   seg.sprites.push({ type:'rock',     xOffset: 1.5+rng()*0.8 });
                if (i%20===0)   seg.sprites.push({ type:'dead_tree', xOffset:(rng()>0.5?-1:1)*(1.8+rng()*0.5) });
                if (i===750||i===760) seg.sprites.push({ type:'road_sign_speed', xOffset:-(1.5+rng()*0.2) });
                break;

            case 'snow':
                if (i%5===0) { seg.sprites.push({ type:'pine_tall', xOffset:-(1.5+rng()*0.5) }); seg.sprites.push({ type:'pine_tall', xOffset:(1.5+rng()*0.5) }); }
                if (i%7===0)   seg.sprites.push({ type:'rock',      xOffset:-(1.4+rng()*0.4) });
                if (rng()>0.92) seg.sprites.push({ type:'dead_tree', xOffset:(rng()>0.5?-1:1)*(1.7+rng()*0.4) });
                break;

            case 'airport':
                if (i%8===0)   seg.sprites.push({ type:'fence_panel', xOffset:-(2.0+rng()*0.3) });
                if (i%8===4)   seg.sprites.push({ type:'fence_panel', xOffset: 2.0+rng()*0.3 });
                if (i%14===0)  seg.sprites.push({ type:'utility_pole', xOffset: 1.5 });
                if (i%20===0)  seg.sprites.push({ type:'speed_camera', xOffset:-(1.4+rng()*0.2) });
                break;

            case 'farmland':
                if (i%8===0) { seg.sprites.push({ type:'tree',     xOffset:-(1.6+rng()*0.5) }); seg.sprites.push({ type:'tree', xOffset:(1.6+rng()*0.5) }); }
                if (i%30===0)  seg.sprites.push({ type:'barn',     xOffset:-(2.8+rng()*0.5) });
                if (i%25===0)  seg.sprites.push({ type:'parked_car', xOffset:-(1.5+rng()*0.4) });
                if (i%6===0)   seg.sprites.push({ type:'bush',     xOffset:(rng()>0.5?-1:1)*(1.35+rng()*0.3) });
                break;

            case 'coastal':
                if (i%6===0) { seg.sprites.push({ type:'tree',       xOffset:-(1.6+rng()*0.5) }); }
                if (i%14===0)  seg.sprites.push({ type:'rock',        xOffset: 1.5+rng()*0.5 });
                if (i===1120)  seg.sprites.push({ type:'lighthouse',  xOffset: 2.5 });
                if (i%10===0)  seg.sprites.push({ type:'guardrail',   xOffset: 1.22 }); // cliff-edge rail
                break;
        }

        // --- Universal curve + speed signs at biome entries ---
        const regionStart = (Math.floor(i/100)*100);
        if (i === regionStart+2)  seg.sprites.push({ type:'road_sign_speed', xOffset:-1.5 });
        if (i === regionStart+56) seg.sprites.push({ type:'chevron',         xOffset: 1.4 });
    }

    /**
     * @brief Deterministic LCG seeded by segment index.
     * @private
     */
    _rng(seed) {
        let s = seed * 9301 + 49297;
        return () => { s = (s*9301+49297) % 233280; return s/233280; };
    }
}

window.Road = Road;
