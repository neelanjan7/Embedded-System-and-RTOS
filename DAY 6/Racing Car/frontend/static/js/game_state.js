/**
 * @file game_state.js
 * @brief Handles application transitions and dialog state overlays.
 * 
 * Manages game states (LOADING, PLAYING, PAUSED, CRASH, GAME_OVER) and
 * coordinates showing/hiding menus and halting loop tickers.
 * 
 * Author: Sagar Kumar
 * Date: 2026
 */

class GameStateManager {
    constructor() {
        this.states = {
            LOADING: "LOADING",
            PLAYING: "PLAYING",
            PAUSED: "PAUSED",
            CRASH: "CRASH",
            GAME_OVER: "GAME_OVER"
        };
        this.currentState = this.states.LOADING;
    }

    /**
     * @brief Transitions simulator state and modulates overlay cards.
     * @param {string} newState Destination state index
     */
    setState(newState) {
        if (!this.states[newState]) {
            console.error(`[State] Invalid state request: ${newState}`);
            return;
        }

        const oldState = this.currentState;
        this.currentState = newState;
        
        console.log(`[State] Transition: ${oldState} -> ${newState}`);

        // Update UI overlays based on new active state
        this._updateOverlayVisibilities();
    }

    /**
     * @brief Toggles hidden attributes on dialog nodes based on current state.
     * @private
     */
    _updateOverlayVisibilities() {
        const dialogPause = document.getElementById('dialog-pause');
        const dialogGameOver = document.getElementById('dialog-game-over');

        // Reset visibilities
        if (dialogPause) dialogPause.classList.add('hidden');
        if (dialogGameOver) dialogGameOver.classList.add('hidden');

        switch (this.currentState) {
            case this.states.PAUSED:
                if (dialogPause) dialogPause.classList.remove('hidden');
                break;
            case this.states.GAME_OVER:
                if (dialogGameOver) dialogGameOver.classList.remove('hidden');
                break;
            case this.states.CRASH:
                // Visual indicators (crash overlays) managed in rendering passes
                break;
            default:
                break;
        }
    }

    isPaused() { return this.currentState === this.states.PAUSED; }
    isPlaying() { return this.currentState === this.states.PLAYING; }
    isGameOver() { return this.currentState === this.states.GAME_OVER; }
    isCrash() { return this.currentState === this.states.CRASH; }
}

window.GameStateManager = GameStateManager;
