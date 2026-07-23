/**
 * @file config.js
 * @brief Dynamic client configurations and game system constants.
 * 
 * Centralizes UI constants, API paths, and calibration bounds.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

const ClientConfig = {
    // API Route Endpoints
    API: {
        STATUS: '/api/status',
        PORTS: '/api/ports',
        CONNECT: '/api/connect',
        DISCONNECT: '/api/disconnect',
        CALIBRATE: '/api/calibrate',
        EVENTS: '/api/events'
    },

    // Controller defaults
    DEFAULTS: {
        steerDeadzone: 2.0,      // degrees
        pitchLimit: 30.0,        // degrees
        enableAudio: true        // Web Audio Synth active state
    },

    // Diagnostic settings
    FPS_REFRESH_INTERVAL_MS: 500, // interval to recalculate active FPS
    TELEMETRY_DASH_REFRESH_MS: 33  // rate to update dashboard text panels
};

window.ClientConfig = ClientConfig;
