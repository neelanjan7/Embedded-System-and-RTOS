#include <Arduino.h>
#include <nrf.h>
#define LED_PIN 13 // Onboard LED
volatile bool led_on = false;
// --- INTERRUPT SERVICE ROUTINE ---
extern "C" void TIMER3_IRQHandler(void) {
// Check if Compare Channel 0 triggered the interrupt
if (NRF_TIMER3->EVENTS_COMPARE[0]) {
NRF_TIMER3->EVENTS_COMPARE[0] = 0; // Clear the event flag
// Toggle the LED state
led_on = !led_on;
if (led_on) {
NRF_P0->OUTSET = (1 << LED_PIN); // Turn ON
} else {
NRF_P0->OUTCLR = (1 << LED_PIN); // Turn OFF
}
}
}
// --- MAIN SETUP ---
void setup() {
// 1. Set LED pin as output (Bit 0)
NRF_P0->PIN_CNF[LED_PIN] = (1 << 0);
// 2. Configure 32-bit Timer
NRF_TIMER3->TASKS_STOP = 1;
NRF_TIMER3->TASKS_CLEAR = 1;
NRF_TIMER3->MODE = 0; // Timer mode
NRF_TIMER3->BITMODE = 3; // 32-bit mode
// 3. Set Frequency and Timeout
NRF_TIMER3->PRESCALER = 4; // 1 MHz clock (1 microsecond per tick)
NRF_TIMER3->CC[0] = 1000000; // Count to 1,000,000 for exactly 1 second
// 4. Enable Auto-Clear Shortcut & Interrupts
NRF_TIMER3->SHORTS = (1 << 0);
NRF_TIMER3->INTENSET = (1 << 16);
// 5. Map the ISR to the core and enable it
NVIC_SetVector(TIMER3_IRQn, (uint32_t)TIMER3_IRQHandler);
NVIC_EnableIRQ(TIMER3_IRQn);
// 6. Start the Timer
NRF_TIMER3->TASKS_START = 1;
}
void loop() {
// The hardware timer handles everything.
// We just leave a tiny delay here to keep the USB serial connection alive.
delay(10);
}