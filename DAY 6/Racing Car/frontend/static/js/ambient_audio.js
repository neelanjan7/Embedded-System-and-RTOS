/**
 * @file ambient_audio.js
 * @brief Offline Web Audio API engine rumble and environmental weather synthesizer.
 * 
 * Synthesizes a 5-layer engine, wind friction, rain patter, thunder, birds,
 * and procedural road surface noises dynamically mixed via GainNodes.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class AmbientAudio {
    constructor() {
        this.audioCtx = null;
        this.isInitialized = false;

        this.gains = {
            master: null,
            engine: null,
            rain: null,
            wind: null,
            road: null,
            env: null // birds, nature
        };

        // Engine layers
        this.engineOscs = [];
        this.engineGains = [];
        
        // Noise sources
        this.noiseSource = null;
        this.rainFilter = null;
        this.windFilter = null;
        this.roadFilter = null;
        
        // Env sources
        this.birdOsc = null;
        this.birdLfo = null;
    }

    init() {
        if (this.isInitialized) return;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtx();

            // 1. Create main gains
            this.gains.master = this.audioCtx.createGain();
            this.gains.master.gain.value = 0.8;
            
            this.gains.engine = this.audioCtx.createGain();
            this.gains.rain = this.audioCtx.createGain();
            this.gains.wind = this.audioCtx.createGain();
            this.gains.road = this.audioCtx.createGain();
            this.gains.env = this.audioCtx.createGain();

            // Connect gains to master
            const gains = [this.gains.engine, this.gains.rain, this.gains.wind, this.gains.road, this.gains.env];
            gains.forEach(g => {
                g.gain.value = 0.0;
                g.connect(this.gains.master);
            });
            this.gains.master.connect(this.audioCtx.destination);

            // 2. Build 5-Layer Engine Synthesizer
            // Layers: [0] Idle, [1] Low, [2] Mid, [3] High, [4] Redline
            const layerTypes = ['sine', 'triangle', 'sawtooth', 'square', 'sawtooth'];
            for (let i = 0; i < 5; i++) {
                const osc = this.audioCtx.createOscillator();
                osc.type = layerTypes[i];
                const gain = this.audioCtx.createGain();
                gain.gain.value = 0.0;
                
                const filter = this.audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 200 + i * 200; // open up higher layers

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.gains.engine);
                
                osc.start(0);
                this.engineOscs.push(osc);
                this.engineGains.push(gain);
            }

            // 3. Build Noise Synthesizers (Rain, Wind, Road)
            const bufferSize = 2.0 * this.audioCtx.sampleRate;
            const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2.0 - 1.0;
            }

            this.noiseSource = this.audioCtx.createBufferSource();
            this.noiseSource.buffer = noiseBuffer;
            this.noiseSource.loop = true;

            // Rain filter
            this.rainFilter = this.audioCtx.createBiquadFilter();
            this.rainFilter.type = 'bandpass';
            this.rainFilter.frequency.value = 1200;

            // Wind filter
            this.windFilter = this.audioCtx.createBiquadFilter();
            this.windFilter.type = 'lowpass';
            this.windFilter.frequency.value = 350;

            // Road surface filter
            this.roadFilter = this.audioCtx.createBiquadFilter();
            this.roadFilter.type = 'lowpass';
            this.roadFilter.frequency.value = 800;

            this.noiseSource.connect(this.rainFilter);
            this.rainFilter.connect(this.gains.rain);
            
            const windNoise = this.audioCtx.createBufferSource();
            windNoise.buffer = noiseBuffer;
            windNoise.loop = true;
            windNoise.connect(this.windFilter);
            this.windFilter.connect(this.gains.wind);
            
            const roadNoise = this.audioCtx.createBufferSource();
            roadNoise.buffer = noiseBuffer;
            roadNoise.loop = true;
            roadNoise.connect(this.roadFilter);
            this.roadFilter.connect(this.gains.road);

            this.noiseSource.start(0);
            windNoise.start(0);
            roadNoise.start(0);

            // 4. Procedural Bird/Nature Ambience
            this.birdOsc = this.audioCtx.createOscillator();
            this.birdOsc.type = 'sine';
            
            // LFO to chirp the bird pitch
            this.birdLfo = this.audioCtx.createOscillator();
            this.birdLfo.type = 'square';
            this.birdLfo.frequency.value = 2.5; // Chirps per second
            const lfoGain = this.audioCtx.createGain();
            lfoGain.gain.value = 1500;
            
            this.birdLfo.connect(lfoGain);
            lfoGain.connect(this.birdOsc.frequency);
            
            this.birdOsc.frequency.value = 2500; // Base high pitch
            
            const birdFilter = this.audioCtx.createBiquadFilter();
            birdFilter.type = 'highpass';
            birdFilter.frequency.value = 2000;
            
            this.birdOsc.connect(birdFilter);
            birdFilter.connect(this.gains.env);
            
            this.birdOsc.start(0);
            this.birdLfo.start(0);

            this.isInitialized = true;
            console.log("[Audio] Multi-layer Engine & Env Graphs Linked.");
        } catch (e) {
            console.error("[Audio] Web Audio API failed:", e);
        }
    }

    /**
     * @brief Modulates layer volumes based on RPM ratio
     */
    _updateEngineLayers(rpmRatio, now) {
        // Base pitch mapping: 30Hz idle to ~200Hz redline for fundamental
        const baseFreq = 30 + (rpmRatio * 170);
        
        // Harmoics mapped to layers
        this.engineOscs[0].frequency.setTargetAtTime(baseFreq * 1.0, now, 0.05); // Idle
        this.engineOscs[1].frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05); // Low
        this.engineOscs[2].frequency.setTargetAtTime(baseFreq * 2.0, now, 0.05); // Mid
        this.engineOscs[3].frequency.setTargetAtTime(baseFreq * 2.5, now, 0.05); // High
        this.engineOscs[4].frequency.setTargetAtTime(baseFreq * 3.0, now, 0.05); // Redline

        // Crossfade logic: determine which layer is active based on rpmRatio [0.0 - 1.0]
        const v0 = Math.max(0, 1 - (rpmRatio / 0.2));               // Peak at 0.0
        const v1 = Math.max(0, 1 - Math.abs(rpmRatio - 0.25) / 0.25); // Peak at 0.25
        const v2 = Math.max(0, 1 - Math.abs(rpmRatio - 0.50) / 0.25); // Peak at 0.50
        const v3 = Math.max(0, 1 - Math.abs(rpmRatio - 0.75) / 0.25); // Peak at 0.75
        const v4 = Math.max(0, (rpmRatio - 0.8) / 0.2);             // Peak at 1.0

        this.engineGains[0].gain.setTargetAtTime(v0 * 0.4, now, 0.1);
        this.engineGains[1].gain.setTargetAtTime(v1 * 0.5, now, 0.1);
        this.engineGains[2].gain.setTargetAtTime(v2 * 0.6, now, 0.1);
        this.engineGains[3].gain.setTargetAtTime(v3 * 0.7, now, 0.1);
        this.engineGains[4].gain.setTargetAtTime(v4 * 0.8, now, 0.1);
        
        // Master engine volume rises under load
        this.gains.engine.gain.setTargetAtTime(0.3 + rpmRatio * 0.5, now, 0.1);
    }

    /**
     * @brief Updates road noise based on biome
     */
    _updateRoadNoise(speedKMH, biome, isOffRoad, wetness, now) {
        if (speedKMH < 5) {
            this.gains.road.gain.setTargetAtTime(0.0, now, 0.1);
            return;
        }
        
        const speedRatio = Math.min(1.0, speedKMH / 200.0);
        let vol = speedRatio * 0.3;
        
        if (isOffRoad) {
            // Gravel/Dirt sound
            this.roadFilter.type = 'bandpass';
            this.roadFilter.frequency.setTargetAtTime(1500 + speedRatio * 1000, now, 0.1);
            vol *= 1.5;
        } else if (wetness > 0.2) {
            // Wet road hiss
            this.roadFilter.type = 'highpass';
            this.roadFilter.frequency.setTargetAtTime(2500 + speedRatio * 2000, now, 0.1);
            vol *= (1.0 + wetness);
        } else {
            // Standard asphalt rolling
            this.roadFilter.type = 'lowpass';
            this.roadFilter.frequency.setTargetAtTime(600 + speedRatio * 800, now, 0.1);
        }

        this.gains.road.gain.setTargetAtTime(vol, now, 0.2);
    }

    update(rpmRatio, speedKMH, rainIntensity, isAudioEnabled, biome = 'plains', isTunnel = false, isOffRoad = false) {
        if (!isAudioEnabled) {
            this.stop();
            return;
        }

        if (!this.isInitialized) {
            this.init();
            return;
        }

        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const speedRatio = Math.min(1.0, speedKMH / 220.0);

        // A. Multi-Layer Engine
        this._updateEngineLayers(rpmRatio, now);

        // B. Procedural Road Noise
        this._updateRoadNoise(speedKMH, biome, isOffRoad, rainIntensity, now);

        // C. Wind Friction Noise
        const targetWindVol = (speedRatio * speedRatio) * 0.3;
        this.gains.wind.gain.setTargetAtTime(targetWindVol, now, 0.1);
        const windFreq = 200.0 + (speedRatio * 500.0);
        this.windFilter.frequency.setTargetAtTime(windFreq, now, 0.15);

        // D. Rain Noise
        const targetRainVol = rainIntensity * 0.2;
        this.gains.rain.gain.setTargetAtTime(targetRainVol, now, 0.1);

        // E. Environmental / Bird Ambience
        // Duck birds if going fast or if it's raining or tunnel
        let envVol = (1.0 - speedRatio * 2.0); // fade out entirely by 50% max speed
        if (rainIntensity > 0.3 || isTunnel || biome === 'city') envVol = 0;
        this.gains.env.gain.setTargetAtTime(Math.max(0, envVol * 0.05), now, 0.5);

        // Tunnel mixing (Echo/Muffling)
        if (isTunnel) {
            // Muffle high end by dropping master gain slightly and low-passing engine
            this.gains.master.gain.setTargetAtTime(0.6, now, 0.2);
        } else {
            this.gains.master.gain.setTargetAtTime(0.8, now, 0.2);
        }
    }

    stop() {
        if (!this.isInitialized) return;
        const now = this.audioCtx.currentTime;
        this.gains.engine.gain.setTargetAtTime(0.0, now, 0.05);
        this.gains.rain.gain.setTargetAtTime(0.0, now, 0.1);
        this.gains.wind.gain.setTargetAtTime(0.0, now, 0.1);
        this.gains.road.gain.setTargetAtTime(0.0, now, 0.1);
        this.gains.env.gain.setTargetAtTime(0.0, now, 0.1);
    }
}

window.AmbientAudio = AmbientAudio;
