/**
 * @file sound.js
 * @brief Procedural Web Audio API sound effect synthesizer.
 * 
 * Generates one-shot sounds for collisions, UI interactions, gear shifts,
 * exhaust backfires, turbo flutter, and traffic horns without external assets.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.isInitialized = false;
        this.masterGain = null;
    }

    init() {
        if (this.isInitialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtx();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.8;
            this.masterGain.connect(this.audioCtx.destination);
            this.isInitialized = true;
            console.log("[Audio] SoundManager initialized.");
        } catch (e) {
            console.error("[Audio] SoundManager failed to initialize.", e);
        }
    }

    _resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    /**
     * @brief Creates a noise buffer
     */
    _createNoiseBuffer(duration = 1.0) {
        if (!this.audioCtx) return null;
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * @brief Plays a UI click sound
     */
    playUIClick() {
        if (!this.isInitialized) return;
        this._resume();
        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(t);
        osc.stop(t + 0.1);
    }

    /**
     * @brief Plays a UI confirmation chime
     */
    playUIConfirm() {
        if (!this.isInitialized) return;
        this._resume();
        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(880, t + 0.1);
        
        gain.gain.setValueAtTime(0.0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
        gain.gain.setValueAtTime(0.3, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(t);
        osc.stop(t + 0.3);
    }

    /**
     * @brief Procedural gear shift click and transition
     */
    playGearShift() {
        if (!this.isInitialized) return;
        this._resume();
        const t = this.audioCtx.currentTime;
        
        // Mechanical click
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);
        
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.05);
        
        // Quick noise burst for air/hydraulics
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = this._createNoiseBuffer(0.1);
        const noiseFilter = this.audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 3000;
        const noiseGain = this.audioCtx.createGain();
        
        noiseGain.gain.setValueAtTime(0.4, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noiseSource.start(t);
    }

    /**
     * @brief Exhaust backfire pop
     */
    playBackfire() {
        if (!this.isInitialized) return;
        this._resume();
        const t = this.audioCtx.currentTime;
        
        // Low freq thump
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
        
        // Noise crackle
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = this._createNoiseBuffer(0.3);
        const noiseFilter = this.audioCtx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 2000;
        const noiseGain = this.audioCtx.createGain();
        
        noiseGain.gain.setValueAtTime(0.6, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noiseSource.start(t);
    }

    /**
     * @brief Turbo wastegate release (hiss/flutter)
     */
    playWastegate() {
        if (!this.isInitialized) return;
        this._resume();
        const t = this.audioCtx.currentTime;
        
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = this._createNoiseBuffer(0.5);
        
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        
        // Modulate gain for flutter effect
        const lfo = this.audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 15;
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 0.5;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start(t);
        lfo.stop(t + 0.4);
        
        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noiseSource.start(t);
    }

    /**
     * @brief Collision sound synthesis
     * @param {string} type 'metal', 'cone', 'barrier', 'glass', 'scrape'
     * @param {number} intensity 0.0 to 1.0
     * @param {number} panX -1.0 to 1.0
     */
    playCollision(type, intensity, panX = 0) {
        if (!this.isInitialized) return;
        this._resume();
        const t = this.audioCtx.currentTime;
        
        const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : this.audioCtx.createGain();
        if (panner.pan) {
            panner.pan.value = Math.max(-1, Math.min(1, panX));
        }
        
        const gain = this.audioCtx.createGain();
        const vol = Math.max(0.1, Math.min(1.0, intensity));
        
        panner.connect(this.masterGain);
        gain.connect(panner);

        if (type === 'metal' || type === 'barrier') {
            // FM Synthesis for metallic clang
            const carrier = this.audioCtx.createOscillator();
            const modulator = this.audioCtx.createOscillator();
            const modGain = this.audioCtx.createGain();
            
            carrier.type = 'sine';
            modulator.type = 'square';
            
            const baseFreq = type === 'barrier' ? 100 : 300;
            carrier.frequency.setValueAtTime(baseFreq, t);
            carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.3);
            
            modulator.frequency.value = baseFreq * 1.414;
            modGain.gain.setValueAtTime(500 * vol, t);
            modGain.gain.exponentialRampToValueAtTime(1, t + 0.3);
            
            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            
            carrier.connect(gain);
            carrier.start(t);
            modulator.start(t);
            carrier.stop(t + 0.4);
            modulator.stop(t + 0.4);
            
            // Add noise crunch
            const noise = this.audioCtx.createBufferSource();
            noise.buffer = this._createNoiseBuffer(0.2);
            const noiseFilter = this.audioCtx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 1000;
            const noiseGain = this.audioCtx.createGain();
            noiseGain.gain.setValueAtTime(vol * 0.5, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(panner);
            noise.start(t);
            
        } else if (type === 'cone') {
            // Dull thump
            const osc = this.audioCtx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(20, t + 0.15);
            
            gain.gain.setValueAtTime(vol * 0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            
            osc.connect(gain);
            osc.start(t);
            osc.stop(t + 0.15);
            
        } else if (type === 'scrape') {
            // Highpass noise
            const noise = this.audioCtx.createBufferSource();
            noise.buffer = this._createNoiseBuffer(0.5);
            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 4000;
            
            gain.gain.setValueAtTime(vol * 0.6, t);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.5);
            
            noise.connect(filter);
            filter.connect(gain);
            noise.start(t);
        }
    }

    /**
     * @brief Traffic passby sound (Doppler)
     */
    playTrafficPassby(speedKMH, panX) {
        if (!this.isInitialized) return;
        this._resume();
        const t = this.audioCtx.currentTime;
        
        const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : this.audioCtx.createGain();
        if (panner.pan) {
            // Quick sweep from center to panX
            panner.pan.setValueAtTime(0, t);
            panner.pan.linearRampToValueAtTime(panX, t + 0.5);
        }
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sawtooth';
        // Doppler pitch drop
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);
        
        // Filter sweeping down
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + 0.5);
        
        const vol = Math.min(1.0, speedKMH / 100);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(vol * 0.4, t + 0.25);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.5);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);
        
        osc.start(t);
        osc.stop(t + 0.5);
    }
}

window.SoundManager = SoundManager;
