/**
 * @file assets.js
 * @brief Procedural asset factory — 27 sprite generators covering vegetation,
 *        city structures, traffic, lighting, signage, and world objects.
 *
 * Every sprite is rendered once at startup on an offscreen <canvas> and stored
 * as HTMLImageElement. Zero per-frame allocation.
 *
 * Author: Sagar Kumar
 * Date: 2026
 */

class AssetLoader {
    constructor() {
        this.sprites = {};
        this.isLoaded = false;
        this._billboardBrands = ['VELOCITY AI','NEURAL DRIVE','CYBER FUEL','QUANTUM MOTORS','NANO BATTERY','AI RACING LEAGUE'];
        this._billboardIndex  = 0;
    }

    load(onComplete) {
        try {
            // --- Vegetation ---
            this.sprites.tree            = this._tree();
            this.sprites.pine_tall       = this._pineTall();
            this.sprites.dead_tree       = this._deadTree();
            this.sprites.bush            = this._bush();
            this.sprites.rock            = this._rock();

            // --- Traffic / Safety ---
            this.sprites.guardrail       = this._guardrail();
            this.sprites.crash_cushion   = this._crashCushion();

            // --- Lighting / Poles ---
            this.sprites.streetlight     = this._streetlight();
            this.sprites.utility_pole    = this._utilityPole();

            // --- Signage ---
            this.sprites.chevron         = this._chevron();
            this.sprites.road_sign_speed = this._speedSign();
            this.sprites.road_sign_turn  = this._turnSign();
            this.sprites.road_sign_exit  = this._exitSign();
            this.sprites.km_marker       = this._kmMarker();
            this.sprites.speed_camera    = this._speedCamera();
            this.sprites.traffic_light   = this._trafficLight();

            // --- Advertising ---
            this.sprites.billboard       = this._billboard();

            // --- Utility / Road ---
            this.sprites.emergency_phone = this._emergencyPhone();
            this.sprites.drain_cover     = this._drainCover();
            this.sprites.fence_panel     = this._fencePanel();

            // --- City Structures ---
            this.sprites.building        = this._building();
            this.sprites.glass_tower     = this._glassTower();
            this.sprites.warehouse       = this._warehouse();

            // --- World Objects ---
            this.sprites.wind_turbine    = this._windTurbine();
            this.sprites.barn            = this._barn();
            this.sprites.lighthouse      = this._lighthouse();
            this.sprites.parked_car      = this._parkedCar();

            // --- Sprint 2B Added Sprites ---
            this.sprites.broken_car      = this._brokenCar();
            this.sprites.road_worker     = this._roadWorker();
            this.sprites.tow_truck       = this._towTruck();
            this.sprites.police_car      = this._policeCar();
            this.sprites.construction_cone = this._constructionCone();
            this.sprites.reflective_stud = this._reflectiveStud();
            this.sprites.damaged_guardrail = this._damagedGuardrail();
            this.sprites.apartment       = this._apartment();
            this.sprites.bus_stop        = this._busStop();
            this.sprites.neon_sign       = this._neonSign();
            this.sprites.shop_front      = this._shopFront();
            this.sprites.pedestrian_bridge = this._pedestrianBridge();
            this.sprites.flower          = this._flower();
            this.sprites.fallen_log      = this._fallenLog();
            this.sprites.cliff_face      = this._cliffFace();
            this.sprites.waterfall       = this._waterfall();
            this.sprites.cave            = this._cave();

            this.isLoaded = true;
            console.log('[Assets] 27 procedural sprites cached.');
            if (onComplete) onComplete();
        } catch (e) {
            console.error('[Assets] Sprite generation error:', e);
            if (onComplete) onComplete();
        }
    }

    // =========================================================================
    // VEGETATION
    // =========================================================================
    _tree() {
        const c=this._c(120,200),x=c.getContext('2d');
        x.fillStyle='#5c3a1a'; x.fillRect(50,145,20,55);
        x.fillStyle='#3b2010'; x.fillRect(60,145,10,55);
        [{y:145,w:110,top:82,col:'#064e3b'},{y:100,w:90,top:36,col:'#065f46'},{y:52,w:68,top:2,col:'#047857'}].forEach(l=>{
            const lx=(120-l.w)/2; x.fillStyle=l.col; x.beginPath(); x.moveTo(lx,l.y); x.lineTo(lx+l.w,l.y); x.lineTo(60,l.top); x.closePath(); x.fill();
        }); return this._img(c);
    }
    _pineTall() {
        const c=this._c(80,260),x=c.getContext('2d');
        x.fillStyle='#3b2010'; x.fillRect(34,210,12,50);
        [{y:218,w:70,top:170,col:'#022c22'},{y:178,w:58,top:128,col:'#064e3b'},{y:138,w:46,top:88,col:'#065f46'},{y:96,w:32,top:18,col:'#047857'}].forEach(l=>{
            const lx=(80-l.w)/2; x.fillStyle=l.col; x.beginPath(); x.moveTo(lx,l.y); x.lineTo(lx+l.w,l.y); x.lineTo(40,l.top); x.closePath(); x.fill();
        }); return this._img(c);
    }
    _deadTree() {
        const c=this._c(100,200),x=c.getContext('2d');
        x.strokeStyle='#475569'; x.lineCap='round'; x.lineWidth=8; x.beginPath(); x.moveTo(50,200); x.lineTo(50,60); x.stroke();
        [{fx:50,fy:130,tx:18,ty:90,w:4},{fx:50,fy:110,tx:80,ty:70,w:3},{fx:50,fy:80,tx:22,ty:50,w:3},{fx:50,fy:70,tx:72,ty:32,w:2},{fx:18,fy:90,tx:5,ty:68,w:2},{fx:80,fy:70,tx:92,ty:48,w:2}].forEach(b=>{
            x.lineWidth=b.w; x.strokeStyle='#374151'; x.beginPath(); x.moveTo(b.fx,b.fy); x.lineTo(b.tx,b.ty); x.stroke();
        }); return this._img(c);
    }
    _bush() {
        const c=this._c(100,70),x=c.getContext('2d');
        [{cx:20,cy:55,r:22,col:'#14532d'},{cx:48,cy:48,r:28,col:'#166534'},{cx:78,cy:55,r:20,col:'#14532d'},{cx:35,cy:42,r:20,col:'#15803d'},{cx:65,cy:44,r:18,col:'#16a34a'}].forEach(cl=>{
            x.fillStyle=cl.col; x.beginPath(); x.arc(cl.cx,cl.cy,cl.r,0,Math.PI*2); x.fill();
        }); x.fillStyle='rgba(134,239,172,0.15)'; x.beginPath(); x.arc(48,44,14,0,Math.PI*2); x.fill(); return this._img(c);
    }
    _rock() {
        const c=this._c(90,60),x=c.getContext('2d');
        x.fillStyle='rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(45,58,38,8,0,0,Math.PI*2); x.fill();
        const g=x.createRadialGradient(35,22,4,45,32,38); g.addColorStop(0,'#94a3b8'); g.addColorStop(0.6,'#64748b'); g.addColorStop(1,'#334155');
        x.fillStyle=g; x.beginPath(); x.moveTo(10,52); x.lineTo(4,32); x.lineTo(18,12); x.lineTo(48,6); x.lineTo(76,14); x.lineTo(86,36); x.lineTo(80,54); x.closePath(); x.fill();
        x.fillStyle='rgba(203,213,225,0.4)'; x.beginPath(); x.moveTo(18,12); x.lineTo(48,6); x.lineTo(52,26); x.lineTo(22,28); x.closePath(); x.fill();
        return this._img(c);
    }

    // =========================================================================
    // TRAFFIC / SAFETY
    // =========================================================================
    _guardrail() {
        const c=this._c(48,120),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(18,28,12,92);
        const rg=x.createLinearGradient(0,0,48,0); rg.addColorStop(0,'#64748b'); rg.addColorStop(0.5,'#94a3b8'); rg.addColorStop(1,'#64748b');
        x.fillStyle=rg; x.fillRect(0,8,48,18); x.fillStyle='rgba(226,232,240,0.5)'; x.fillRect(0,8,48,3); x.fillStyle='#f97316'; x.fillRect(14,2,20,8); return this._img(c);
    }
    _crashCushion() {
        const c=this._c(60,90),x=c.getContext('2d');
        x.fillStyle='rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(30,88,26,6,0,0,Math.PI*2); x.fill();
        x.fillStyle='#fbbf24'; x.beginPath(); x.roundRect(6,10,48,76,8); x.closePath(); x.fill();
        x.fillStyle='#1e293b'; for(let i=0;i<5;i++){ if(i%2===0){ const sy=10+i*15; x.fillRect(6,sy,48,7); } }
        x.fillStyle='rgba(253,230,138,0.4)'; x.fillRect(6,10,12,76); return this._img(c);
    }

    // =========================================================================
    // LIGHTING / POLES
    // =========================================================================
    _streetlight() {
        const c=this._c(90,200),x=c.getContext('2d');
        x.fillStyle='#334155'; x.fillRect(10,190,22,10); x.fillStyle='#475569'; x.fillRect(16,28,10,164); x.fillStyle='rgba(148,163,184,0.3)'; x.fillRect(22,28,4,164);
        x.strokeStyle='#64748b'; x.lineWidth=6; x.lineCap='round'; x.beginPath(); x.moveTo(21,32); x.quadraticCurveTo(46,10,70,22); x.stroke();
        x.fillStyle='#1e293b'; x.beginPath(); x.roundRect(58,18,26,10,3); x.closePath(); x.fill();
        x.fillStyle='#fde68a'; x.beginPath(); x.ellipse(71,26,9,5,0,0,Math.PI*2); x.fill();
        const gl=x.createRadialGradient(71,26,2,71,26,14); gl.addColorStop(0,'rgba(253,230,138,0.5)'); gl.addColorStop(1,'rgba(253,230,138,0)');
        x.fillStyle=gl; x.beginPath(); x.arc(71,26,14,0,Math.PI*2); x.fill(); return this._img(c);
    }
    _utilityPole() {
        const c=this._c(100,210),x=c.getContext('2d');
        // Wooden pole
        x.fillStyle='#78350f'; x.fillRect(46,20,8,190);
        x.fillStyle='#92400e'; x.fillRect(46,20,3,190);
        // Cross arm top
        x.fillStyle='#78350f'; x.fillRect(16,36,68,8);
        // Cross arm mid
        x.fillStyle='#78350f'; x.fillRect(22,70,56,6);
        // Insulators (grey cylinders)
        [[16,32],[50,32],[84,32],[22,66],[56,66],[90,66]].forEach(([px,py])=>{
            x.fillStyle='#94a3b8'; x.beginPath(); x.ellipse(px,py,4,6,0,0,Math.PI*2); x.fill();
        });
        // Wires
        x.strokeStyle='#1e293b'; x.lineWidth=1.5;
        [[16,32,84,32],[22,66,90,66],[16,32,22,66],[84,32,90,66]].forEach(([x1,y1,x2,y2])=>{
            x.beginPath(); x.moveTo(x1,y1); x.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+5,x2,y2); x.stroke();
        }); return this._img(c);
    }

    // =========================================================================
    // SIGNAGE
    // =========================================================================
    _chevron() {
        const c=this._c(80,140),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(36,58,8,82); x.fillStyle='#eab308'; x.strokeStyle='#1e293b'; x.lineWidth=2;
        x.beginPath(); x.roundRect(8,8,64,52,4); x.closePath(); x.fill(); x.stroke();
        x.strokeStyle='#1e293b'; x.lineWidth=5; x.lineCap='round'; x.lineJoin='round';
        [[18],[36]].forEach(([ox])=>{ x.beginPath(); x.moveTo(ox,18); x.lineTo(ox+16,34); x.lineTo(ox,50); x.stroke(); }); return this._img(c);
    }
    _speedSign() {
        const c=this._c(80,150),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(36,68,8,82); x.fillStyle='#ffffff'; x.strokeStyle='#dc2626'; x.lineWidth=6;
        x.beginPath(); x.arc(40,38,32,0,Math.PI*2); x.fill(); x.stroke();
        x.fillStyle='#1e293b'; x.font="bold 22px Arial,sans-serif"; x.textAlign='center'; x.textBaseline='middle'; x.fillText('80',40,39); return this._img(c);
    }
    _turnSign() {
        const c=this._c(80,150),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(36,80,8,70); x.fillStyle='#eab308'; x.strokeStyle='#1e293b'; x.lineWidth=3;
        x.beginPath(); x.moveTo(40,4); x.lineTo(76,40); x.lineTo(40,76); x.lineTo(4,40); x.closePath(); x.fill(); x.stroke();
        x.strokeStyle='#1e293b'; x.lineWidth=4; x.lineCap='round'; x.lineJoin='round';
        x.beginPath(); x.moveTo(28,52); x.lineTo(28,28); x.lineTo(52,28); x.lineTo(52,40); x.stroke();
        x.beginPath(); x.moveTo(44,36); x.lineTo(52,52); x.lineTo(60,36); x.stroke(); return this._img(c);
    }
    _exitSign() {
        const c=this._c(200,120),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(34,78,10,42); x.fillRect(156,78,10,42);
        x.fillStyle='#166534'; x.strokeStyle='#15803d'; x.lineWidth=3;
        x.beginPath(); x.roundRect(10,8,180,70,6); x.closePath(); x.fill(); x.stroke();
        x.strokeStyle='#ffffff'; x.lineWidth=2; x.beginPath(); x.roundRect(16,14,168,58,4); x.closePath(); x.stroke();
        x.fillStyle='#ffffff'; x.beginPath(); x.moveTo(24,43); x.lineTo(46,30); x.lineTo(46,38); x.lineTo(62,38); x.lineTo(62,48); x.lineTo(46,48); x.lineTo(46,56); x.closePath(); x.fill();
        x.font="bold 20px Arial,sans-serif"; x.textAlign='left'; x.textBaseline='middle'; x.fillText('EXIT 12',72,43);
        x.font="12px Arial,sans-serif"; x.fillStyle='#86efac'; x.fillText('NEXT RIGHT',76,60); return this._img(c);
    }
    _kmMarker() {
        const c=this._c(44,130),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(18,70,8,60); x.fillStyle='#f8fafc'; x.strokeStyle='#94a3b8'; x.lineWidth=2;
        x.beginPath(); x.roundRect(4,8,36,64,3); x.closePath(); x.fill(); x.stroke();
        x.fillStyle='#1d4ed8'; x.beginPath(); x.roundRect(4,8,36,20,[3,3,0,0]); x.closePath(); x.fill();
        x.fillStyle='#ffffff'; x.font="bold 9px Arial,sans-serif"; x.textAlign='center'; x.fillText('KM',22,22);
        x.fillStyle='#1e293b'; x.font="bold 13px Arial,sans-serif"; x.fillText('142',22,48);
        x.font="8px Arial,sans-serif"; x.fillStyle='#64748b'; x.fillText('HWY-1',22,64); return this._img(c);
    }
    _speedCamera() {
        const c=this._c(50,170),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(22,90,6,80);
        // Arm
        x.fillStyle='#64748b'; x.fillRect(16,72,30,8);
        // Camera box
        x.fillStyle='#eab308'; x.strokeStyle='#1e293b'; x.lineWidth=2;
        x.beginPath(); x.roundRect(8,50,34,28,4); x.closePath(); x.fill(); x.stroke();
        x.fillStyle='#1e293b'; x.beginPath(); x.arc(25,64,7,0,Math.PI*2); x.fill();
        x.fillStyle='#0ea5e9'; x.beginPath(); x.arc(25,64,4,0,Math.PI*2); x.fill(); return this._img(c);
    }
    _trafficLight() {
        const c=this._c(36,120),x=c.getContext('2d');
        x.fillStyle='#1e293b'; x.fillRect(6,8,24,90); x.strokeStyle='#374151'; x.lineWidth=1.5; x.strokeRect(6,8,24,90);
        x.fillStyle='#1e293b'; x.fillRect(12,100,12,20);
        [[18,30,'#dc2626'],[18,55,'#fbbf24'],[18,80,'#22c55e']].forEach(([cx,cy,col])=>{
            x.fillStyle='rgba(0,0,0,0.5)'; x.beginPath(); x.arc(cx,cy,9,0,Math.PI*2); x.fill();
            x.fillStyle=cy===80?col:'rgba(0,0,0,0.8)'; // only green lit
            x.beginPath(); x.arc(cx,cy,7,0,Math.PI*2); x.fill();
        }); return this._img(c);
    }
    _billboard() {
        const brand=this._billboardBrands[this._billboardIndex++%this._billboardBrands.length];
        const tags={'VELOCITY AI':'Drive beyond the limit','NEURAL DRIVE':'Intelligence in motion','CYBER FUEL':'Power the future','QUANTUM MOTORS':'Engineering tomorrow','NANO BATTERY':'1000km on one charge','AI RACING LEAGUE':'Season 7 — Register now'};
        const c=this._c(280,170),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(52,90,14,80); x.fillRect(214,90,14,80); x.fillStyle='#334155'; x.fillRect(52,140,176,6);
        const bg=x.createLinearGradient(0,10,0,90); bg.addColorStop(0,'#0f172a'); bg.addColorStop(1,'#1e293b');
        x.fillStyle=bg; x.beginPath(); x.roundRect(10,10,260,82,8); x.closePath(); x.fill();
        x.strokeStyle='#06b6d4'; x.lineWidth=3; x.beginPath(); x.roundRect(10,10,260,82,8); x.closePath(); x.stroke();
        x.fillStyle='#ffffff'; x.font="bold 22px Arial,sans-serif"; x.textAlign='center'; x.textBaseline='alphabetic'; x.fillText(brand,140,52);
        x.fillStyle='#22d3ee'; x.font="11px Arial,sans-serif"; x.fillText(tags[brand]||'The future is now',140,74);
        x.fillStyle='#0e7490'; x.fillRect(10,82,260,10); return this._img(c);
    }

    // =========================================================================
    // UTILITY / ROAD
    // =========================================================================
    _emergencyPhone() {
        const c=this._c(50,130),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(21,78,8,52); x.fillStyle='#1d4ed8'; x.strokeStyle='#1e40af'; x.lineWidth=2;
        x.beginPath(); x.roundRect(6,12,38,68,4); x.closePath(); x.fill(); x.stroke();
        x.fillStyle='#dbeafe'; x.beginPath(); x.roundRect(12,18,26,42,3); x.closePath(); x.fill();
        x.fillStyle='#dc2626'; x.font="bold 9px Arial,sans-serif"; x.textAlign='center'; x.fillText('SOS',25,36);
        x.strokeStyle='#1e3a8a'; x.lineWidth=2; x.lineCap='round'; x.beginPath(); x.arc(25,50,5,Math.PI,0); x.stroke();
        x.fillStyle='#fbbf24'; x.fillRect(6,12,38,6); return this._img(c);
    }
    _drainCover() {
        const c=this._c(50,30),x=c.getContext('2d');
        x.fillStyle='#374151'; x.beginPath(); x.ellipse(25,15,22,12,0,0,Math.PI*2); x.fill();
        x.strokeStyle='#1f2937'; x.lineWidth=1;
        for(let g=0;g<4;g++){ x.beginPath(); x.moveTo(8+g*10,6); x.lineTo(8+g*10,24); x.stroke(); }
        for(let g=0;g<2;g++){ x.beginPath(); x.moveTo(4,9+g*12); x.lineTo(46,9+g*12); x.stroke(); }
        x.strokeStyle='#4b5563'; x.lineWidth=1.5; x.beginPath(); x.ellipse(25,15,22,12,0,0,Math.PI*2); x.stroke(); return this._img(c);
    }
    _fencePanel() {
        const c=this._c(120,60),x=c.getContext('2d');
        x.strokeStyle='#64748b'; x.lineWidth=1.5;
        // Horizontal rails
        x.beginPath(); x.moveTo(0,10); x.lineTo(120,10); x.stroke();
        x.beginPath(); x.moveTo(0,50); x.lineTo(120,50); x.stroke();
        // Vertical posts
        for(let p=0;p<=120;p+=20){ x.beginPath(); x.moveTo(p,0); x.lineTo(p,60); x.stroke(); }
        // X cross-links
        x.lineWidth=0.8; x.strokeStyle='#94a3b8';
        for(let p=0;p<6;p++){
            const bx=p*20;
            x.beginPath(); x.moveTo(bx,10); x.lineTo(bx+20,50); x.stroke();
            x.beginPath(); x.moveTo(bx+20,10); x.lineTo(bx,50); x.stroke();
        } return this._img(c);
    }

    // =========================================================================
    // CITY STRUCTURES
    // =========================================================================
    _building() {
        const c=this._c(120,240),x=c.getContext('2d');
        // Main body
        const bg=x.createLinearGradient(0,0,120,0); bg.addColorStop(0,'#1e293b'); bg.addColorStop(1,'#334155');
        x.fillStyle=bg; x.fillRect(8,20,104,220);
        // Window grid
        x.fillStyle='rgba(250,204,21,0.7)';
        for(let row=0;row<9;row++) for(let col=0;col<4;col++){
            if(Math.random()>0.25) x.fillRect(14+col*26,28+row*22,16,12);
        }
        // Facade dark panels
        x.fillStyle='rgba(0,0,0,0.2)'; x.fillRect(8,20,4,220); x.fillRect(108,20,4,220);
        // Entrance
        x.fillStyle='#1e40af'; x.fillRect(44,200,32,40);
        x.fillStyle='rgba(147,197,253,0.5)'; x.fillRect(48,204,10,32); x.fillRect(62,204,10,32);
        // Roof
        x.fillStyle='#0f172a'; x.fillRect(4,14,112,10); return this._img(c);
    }
    _glassTower() {
        const c=this._c(100,320),x=c.getContext('2d');
        // Reflective glass body
        const bg=x.createLinearGradient(0,0,100,0); bg.addColorStop(0,'#0c4a6e'); bg.addColorStop(0.4,'#0ea5e9'); bg.addColorStop(1,'#0c4a6e');
        x.fillStyle=bg; x.fillRect(12,30,76,290);
        // Window reflection bands
        x.fillStyle='rgba(186,230,253,0.2)';
        for(let row=0;row<14;row++) x.fillRect(12,30+row*20,76,8);
        // Vertical reflection stripe
        x.fillStyle='rgba(255,255,255,0.1)'; x.fillRect(30,30,12,290);
        // Spire
        x.fillStyle='#64748b'; x.beginPath(); x.moveTo(50,0); x.lineTo(40,34); x.lineTo(60,34); x.closePath(); x.fill();
        // Spire light
        x.fillStyle='#ef4444'; x.beginPath(); x.arc(50,4,3,0,Math.PI*2); x.fill();
        // Base
        x.fillStyle='#0f172a'; x.fillRect(6,318,88,2); return this._img(c);
    }
    _warehouse() {
        const c=this._c(200,120),x=c.getContext('2d');
        // Corrugated steel body
        x.fillStyle='#475569'; x.fillRect(0,20,200,100);
        // Corrugation lines
        x.strokeStyle='#334155'; x.lineWidth=2;
        for(let p=0;p<200;p+=8){ x.beginPath(); x.moveTo(p,20); x.lineTo(p,120); x.stroke(); }
        // Gambrel/shed roof
        x.fillStyle='#334155'; x.beginPath(); x.moveTo(0,22); x.lineTo(100,0); x.lineTo(200,22); x.closePath(); x.fill();
        // Loading doors
        x.fillStyle='#1e293b'; x.fillRect(20,60,50,60); x.fillRect(130,60,50,60);
        x.strokeStyle='#94a3b8'; x.lineWidth=1; x.strokeRect(20,60,50,60); x.strokeRect(130,60,50,60);
        // Door panels
        x.beginPath(); x.moveTo(45,60); x.lineTo(45,120); x.stroke();
        x.beginPath(); x.moveTo(155,60); x.lineTo(155,120); x.stroke(); return this._img(c);
    }

    // =========================================================================
    // WORLD OBJECTS
    // =========================================================================
    _windTurbine() {
        const c=this._c(60,300),x=c.getContext('2d');
        // Pole
        x.fillStyle='#f1f5f9';
        x.beginPath(); x.moveTo(24,300); x.lineTo(22,120); x.lineTo(38,120); x.lineTo(36,300); x.closePath(); x.fill();
        x.fillStyle='rgba(0,0,0,0.1)'; x.fillRect(30,120,6,180);
        // Hub
        x.fillStyle='#e2e8f0'; x.beginPath(); x.arc(30,120,8,0,Math.PI*2); x.fill();
        x.fillStyle='#94a3b8'; x.beginPath(); x.arc(30,120,4,0,Math.PI*2); x.fill();
        // 3 Blades (static, game animates via angle)
        [[0],[120],[240]].forEach(([deg])=>{
            const rad=deg*Math.PI/180;
            const bx=30+Math.cos(rad)*48; const by=120+Math.sin(rad)*48;
            x.strokeStyle='#cbd5e1'; x.lineWidth=5; x.lineCap='round';
            x.beginPath(); x.moveTo(30,120); x.lineTo(bx,by); x.stroke();
            // Blade tip
            x.fillStyle='#e2e8f0'; x.beginPath(); x.arc(bx,by,4,0,Math.PI*2); x.fill();
        }); return this._img(c);
    }
    _barn() {
        const c=this._c(160,120),x=c.getContext('2d');
        // Body
        x.fillStyle='#991b1b'; x.fillRect(0,40,160,80);
        // White trim
        x.strokeStyle='#f8fafc'; x.lineWidth=3; x.strokeRect(0,40,160,80);
        // Gambrel roof
        x.fillStyle='#7f1d1d';
        x.beginPath(); x.moveTo(-5,42); x.lineTo(80,4); x.lineTo(165,42); x.closePath(); x.fill();
        x.fillStyle='#991b1b';
        x.beginPath(); x.moveTo(20,42); x.lineTo(80,18); x.lineTo(140,42); x.closePath(); x.fill();
        // Loft door
        x.fillStyle='#1e293b'; x.fillRect(60,44,40,30);
        // Main door double
        x.fillStyle='#1e293b'; x.fillRect(20,80,40,40); x.fillRect(100,80,40,40);
        x.strokeStyle='#92400e'; x.lineWidth=2; x.strokeRect(20,80,40,40); x.strokeRect(100,80,40,40);
        // Door panels
        x.beginPath(); x.moveTo(40,80); x.lineTo(40,120); x.stroke();
        x.beginPath(); x.moveTo(120,80); x.lineTo(120,120); x.stroke(); return this._img(c);
    }
    _lighthouse() {
        const c=this._c(60,240),x=c.getContext('2d');
        // Base
        x.fillStyle='#475569'; x.fillRect(10,228,40,12);
        // Tower body — tapers upward
        x.fillStyle='#f8fafc';
        x.beginPath(); x.moveTo(8,230); x.lineTo(16,80); x.lineTo(44,80); x.lineTo(52,230); x.closePath(); x.fill();
        // Red stripes
        x.fillStyle='#dc2626';
        [[110,30],[160,30],[210,30]].forEach(([y,h])=>{ x.fillRect(16+(y-80)/7,y,44-(y-80)/3.5,h); });
        // Lantern room
        x.fillStyle='#1e293b'; x.fillRect(14,60,32,24);
        x.fillStyle='rgba(253,230,138,0.9)'; x.beginPath(); x.arc(30,70,10,0,Math.PI*2); x.fill();
        // Cap
        x.fillStyle='#334155'; x.beginPath(); x.moveTo(30,40); x.lineTo(12,62); x.lineTo(48,62); x.closePath(); x.fill(); return this._img(c);
    }
    _parkedCar() {
        const c=this._c(150,80),x=c.getContext('2d');
        x.fillStyle='rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(75,76,60,8,0,0,Math.PI*2); x.fill();
        // Tires
        x.fillStyle='#0f172a'; [[20,60],[120,60]].forEach(([tx,ty])=>{ x.beginPath(); x.ellipse(tx,ty,12,8,0,0,Math.PI*2); x.fill(); });
        // Body
        x.fillStyle='#334155'; x.beginPath(); x.roundRect(10,32,130,40,8); x.closePath(); x.fill();
        // Cabin
        x.fillStyle='#1e3a5f'; x.beginPath(); x.roundRect(40,18,70,26,6); x.closePath(); x.fill();
        x.fillStyle='rgba(186,230,253,0.6)'; x.fillRect(44,22,28,18); x.fillRect(78,22,28,18);
        // Tail lights
        x.fillStyle='#dc2626'; x.fillRect(10,40,12,8); x.fillStyle='#f97316'; x.fillRect(128,40,12,8); return this._img(c);
    }

    // =========================================================================
    // NEW PROCEDURAL GENERATORS (Sprint 2B)
    // =========================================================================
    _apartment() {
        const c=this._c(140,280),x=c.getContext('2d');
        const bg=x.createLinearGradient(0,0,140,0); bg.addColorStop(0,'#b45309'); bg.addColorStop(1,'#92400e');
        x.fillStyle=bg; x.fillRect(10,20,120,260);
        x.fillStyle='#78350f'; x.fillRect(10,20,4,260); x.fillRect(126,20,4,260);
        for(let row=0;row<10;row++){
            for(let col=0;col<3;col++){
                x.fillStyle='rgba(186,230,253,0.8)';
                if(Math.random()>0.4) x.fillStyle='rgba(250,204,21,0.9)'; // Lit
                x.fillRect(20+col*36,36+row*24,24,14);
                x.fillStyle='#1e293b'; x.fillRect(18+col*36,48+row*24,28,4); // Balcony
            }
        }
        x.fillStyle='#1e293b'; x.fillRect(54,250,32,30); // Door
        return this._img(c);
    }
    _busStop() {
        const c=this._c(120,90),x=c.getContext('2d');
        x.fillStyle='#cbd5e1'; x.fillRect(10,80,100,10);
        x.fillStyle='#94a3b8'; x.fillRect(16,20,6,60); x.fillRect(98,20,6,60);
        x.fillStyle='rgba(255,255,255,0.3)'; x.fillRect(22,30,76,50);
        x.fillStyle='#1e40af'; x.fillRect(10,10,100,14);
        x.fillStyle='#f8fafc'; x.font="bold 8px Arial"; x.fillText("BUS", 52, 20);
        x.fillStyle='#fbbf24'; x.fillRect(70,40,20,30);
        return this._img(c);
    }
    _neonSign() {
        const c=this._c(80,160),x=c.getContext('2d');
        x.fillStyle='#1e293b'; x.fillRect(36,20,8,140);
        x.fillStyle='#0f172a'; x.strokeStyle='#ec4899'; x.lineWidth=3;
        x.beginPath(); x.roundRect(10,40,60,90,5); x.closePath(); x.fill(); x.stroke();
        x.shadowColor='#ec4899'; x.shadowBlur=10;
        x.fillStyle='#fdf2f8'; x.font="bold 16px Arial"; x.textAlign='center';
        x.fillText("OPEN", 40, 70);
        x.shadowColor='#06b6d4'; x.fillStyle='#cffafe'; x.fillText("24/7", 40, 100);
        x.shadowBlur=0;
        return this._img(c);
    }
    _shopFront() {
        const c=this._c(140,100),x=c.getContext('2d');
        x.fillStyle='#f1f5f9'; x.fillRect(0,0,140,100);
        x.fillStyle='#b91c1c'; x.fillRect(0,0,140,30);
        x.fillStyle='#fef08a';
        for(let i=0;i<140;i+=20) x.fillRect(i,0,10,30);
        x.fillStyle='rgba(186,230,253,0.6)'; x.fillRect(10,40,50,50); x.fillRect(80,40,50,50);
        x.fillStyle='#1e293b'; x.fillRect(60,40,20,60);
        return this._img(c);
    }
    _pedestrianBridge() {
        const c=this._c(400,120),x=c.getContext('2d');
        x.fillStyle='#64748b'; x.fillRect(40,40,20,80); x.fillRect(340,40,20,80);
        x.fillStyle='#94a3b8'; x.fillRect(0,20,400,20);
        x.strokeStyle='#cbd5e1'; x.lineWidth=2;
        x.beginPath(); x.moveTo(0,6); x.lineTo(400,6); x.stroke();
        for(let i=0;i<=400;i+=10){ x.beginPath(); x.moveTo(i,6); x.lineTo(i,20); x.stroke(); }
        x.fillStyle='#166534'; x.fillRect(150,10,100,30);
        x.fillStyle='#fff'; x.font="bold 12px Arial"; x.textAlign="center"; x.fillText("CITY CENTER", 200, 30);
        return this._img(c);
    }
    _flower() {
        const c=this._c(30,30),x=c.getContext('2d');
        x.fillStyle='#15803d'; x.fillRect(14,14,2,16);
        const cols=['#ef4444','#eab308','#3b82f6','#d946ef'];
        const col=cols[Math.floor(Math.random()*cols.length)];
        x.fillStyle=col;
        for(let i=0;i<5;i++){
            const rad = (i*72)*Math.PI/180;
            x.beginPath(); x.arc(15+Math.cos(rad)*6, 10+Math.sin(rad)*6, 4, 0, Math.PI*2); x.fill();
        }
        x.fillStyle='#fef08a'; x.beginPath(); x.arc(15,10,3,0,Math.PI*2); x.fill();
        return this._img(c);
    }
    _fallenLog() {
        const c=this._c(100,40),x=c.getContext('2d');
        x.fillStyle='rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(50,30,45,6,0,0,Math.PI*2); x.fill();
        x.translate(50,20); x.rotate(15*Math.PI/180); x.translate(-50,-20);
        x.fillStyle='#5c3a1a'; x.fillRect(10,12,80,16);
        x.strokeStyle='#3b2010'; x.lineWidth=1.5;
        x.beginPath(); x.moveTo(10,16); x.lineTo(90,16); x.stroke();
        x.beginPath(); x.moveTo(10,24); x.lineTo(90,24); x.stroke();
        x.fillStyle='#166534'; x.beginPath(); x.arc(30,12,6,0,Math.PI*2); x.arc(45,14,5,0,Math.PI*2); x.fill();
        return this._img(c);
    }
    _cliffFace() {
        const c=this._c(200,300),x=c.getContext('2d');
        x.fillStyle='#44403c';
        x.beginPath(); x.moveTo(20,300); x.lineTo(40,100); x.lineTo(80,20); x.lineTo(160,50); x.lineTo(180,200); x.lineTo(160,300); x.closePath(); x.fill();
        x.fillStyle='rgba(0,0,0,0.2)';
        x.beginPath(); x.moveTo(40,100); x.lineTo(80,250); x.lineTo(20,300); x.fill();
        x.beginPath(); x.moveTo(160,50); x.lineTo(120,200); x.lineTo(160,300); x.fill();
        x.strokeStyle='#57534e'; x.lineWidth=4;
        for(let i=0;i<10;i++){
            x.beginPath(); x.moveTo(40+Math.random()*100, 50+Math.random()*200);
            x.lineTo(60+Math.random()*100, 60+Math.random()*200); x.stroke();
        }
        return this._img(c);
    }
    _waterfall() {
        const c=this._c(100,300),x=c.getContext('2d');
        x.fillStyle='#0ea5e9'; x.fillRect(30,0,40,280);
        x.fillStyle='rgba(255,255,255,0.6)';
        for(let i=0;i<20;i++){
            x.fillRect(30+Math.random()*30, Math.random()*280, 2+Math.random()*8, 20+Math.random()*40);
        }
        x.fillStyle='rgba(255,255,255,0.8)';
        x.beginPath(); x.ellipse(50,280,30,10,0,0,Math.PI*2); x.fill();
        return this._img(c);
    }
    _cave() {
        const c=this._c(160,120),x=c.getContext('2d');
        x.fillStyle='#44403c'; x.beginPath(); x.ellipse(80,60,70,50,0,Math.PI,0); x.fill();
        x.fillStyle='#0c0a09'; x.beginPath(); x.ellipse(80,65,50,40,0,Math.PI,0); x.fill();
        return this._img(c);
    }
    _brokenCar() {
        const c=this._c(150,80),x=c.getContext('2d');
        x.fillStyle='rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(75,76,60,8,0,0,Math.PI*2); x.fill();
        x.fillStyle='#0f172a'; [[20,60],[120,60]].forEach(([tx,ty])=>{ x.beginPath(); x.ellipse(tx,ty,12,8,0,0,Math.PI*2); x.fill(); });
        x.fillStyle='#7f1d1d'; x.beginPath(); x.roundRect(10,32,130,40,8); x.closePath(); x.fill();
        x.fillStyle='rgba(100,100,100,0.5)';
        x.beginPath(); x.arc(30,20,15,0,Math.PI*2); x.arc(45,10,20,0,Math.PI*2); x.fill();
        return this._img(c);
    }
    _roadWorker() {
        const c=this._c(30,60),x=c.getContext('2d');
        x.fillStyle='#1e40af'; x.fillRect(10,30,10,30);
        x.fillStyle='#fbbf24'; x.fillRect(8,15,14,15);
        x.fillStyle='#f97316'; x.fillRect(10,15,10,15);
        x.fillStyle='#fca5a5'; x.beginPath(); x.arc(15,10,6,0,Math.PI*2); x.fill();
        x.fillStyle='#eab308'; x.beginPath(); x.arc(15,8,7,0,Math.PI,true); x.fill();
        return this._img(c);
    }
    _towTruck() {
        const c=this._c(180,100),x=c.getContext('2d');
        x.fillStyle='#0f172a'; [[30,80],[140,80],[160,80]].forEach(([tx,ty])=>{ x.beginPath(); x.ellipse(tx,ty,16,10,0,0,Math.PI*2); x.fill(); });
        x.fillStyle='#f59e0b'; x.fillRect(10,40,60,40);
        x.fillStyle='#1e293b'; x.fillRect(70,60,100,10);
        x.strokeStyle='#475569'; x.lineWidth=6;
        x.beginPath(); x.moveTo(90,60); x.lineTo(150,20); x.stroke();
        x.strokeStyle='#0f172a'; x.lineWidth=2; x.beginPath(); x.moveTo(150,20); x.lineTo(150,70); x.stroke();
        x.fillStyle='#ef4444'; x.fillRect(30,30,10,10);
        return this._img(c);
    }
    _policeCar() {
        const c=this._c(150,80),x=c.getContext('2d');
        x.fillStyle='rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(75,76,60,8,0,0,Math.PI*2); x.fill();
        x.fillStyle='#0f172a'; [[20,60],[120,60]].forEach(([tx,ty])=>{ x.beginPath(); x.ellipse(tx,ty,12,8,0,0,Math.PI*2); x.fill(); });
        x.fillStyle='#ffffff'; x.beginPath(); x.roundRect(10,32,130,40,8); x.closePath(); x.fill();
        x.fillStyle='#1e293b'; x.fillRect(40,32,70,40);
        x.fillStyle='#1e3a5f'; x.beginPath(); x.roundRect(40,18,70,26,6); x.closePath(); x.fill();
        x.fillStyle='rgba(186,230,253,0.6)'; x.fillRect(44,22,28,18); x.fillRect(78,22,28,18);
        x.fillStyle='#ef4444'; x.fillRect(60,12,10,6);
        x.fillStyle='#3b82f6'; x.fillRect(80,12,10,6);
        return this._img(c);
    }
    _constructionCone() {
        const c=this._c(30,40),x=c.getContext('2d');
        x.fillStyle='#1e293b'; x.fillRect(2,36,26,4);
        x.fillStyle='#f97316'; x.beginPath(); x.moveTo(15,4); x.lineTo(6,36); x.lineTo(24,36); x.closePath(); x.fill();
        x.fillStyle='#ffffff'; x.beginPath(); x.moveTo(13,12); x.lineTo(9,24); x.lineTo(21,24); x.lineTo(17,12); x.closePath(); x.fill();
        return this._img(c);
    }
    _reflectiveStud() {
        const c=this._c(20,10),x=c.getContext('2d');
        x.fillStyle='#cbd5e1'; x.beginPath(); x.ellipse(10,5,8,4,0,0,Math.PI*2); x.fill();
        x.fillStyle='#fcd34d'; x.fillRect(7,3,6,4);
        return this._img(c);
    }
    _damagedGuardrail() {
        const c=this._c(48,120),x=c.getContext('2d');
        x.fillStyle='#475569'; x.fillRect(18,28,12,92);
        x.strokeStyle='#64748b'; x.lineWidth=18;
        x.beginPath(); x.moveTo(0,16); x.quadraticCurveTo(24,30,48,8); x.stroke();
        x.fillStyle='#f97316'; x.fillRect(14,20,20,8);
        return this._img(c);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================
    _c(w, h) { const cv=document.createElement('canvas'); cv.width=w; cv.height=h; return cv; }
    _img(canvas) { const img=new Image(); img.src=canvas.toDataURL(); return img; }
}

window.AssetLoader = AssetLoader;
