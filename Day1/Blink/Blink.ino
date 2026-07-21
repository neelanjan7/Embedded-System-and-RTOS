// Arduino Nano 33 BLE
// Push Button Toggle LED

const int buttonPin = 13;          // Push button pin
const int ledPin = LED_BUILTIN;    // Built-in LED

bool ledState = LOW;               // LED is OFF initially

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);

  digitalWrite(ledPin, ledState);  // Keep LED OFF at start
}

void loop() {

  // Check if button is pressed
  if (digitalRead(buttonPin) == LOW) {

    ledState = !ledState;          // Change LED state
    digitalWrite(ledPin, ledState);

    delay(500);                    // Prevent multiple detections

    // Wait until button is released
    while (digitalRead(buttonPin) == LOW);
  }

}
