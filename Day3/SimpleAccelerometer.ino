#include <Arduino_LSM9DS1.h>

void setup() {
  Serial.begin(9600);

  pinMode(LEDR, OUTPUT);
  pinMode(LEDG, OUTPUT);
  pinMode(LEDB, OUTPUT);

  // RGB LEDs are active LOW
  digitalWrite(LEDR, HIGH);
  digitalWrite(LEDG, HIGH);
  digitalWrite(LEDB, HIGH);

  if (!IMU.begin()) {
    Serial.println("Failed to initialize IMU!");
    while (1);
  }

  Serial.println("Tilt Detection Started");
}

void loop() {

  float x, y, z;

  if (IMU.accelerationAvailable()) {

    IMU.readAcceleration(x, y, z);

    Serial.print("X: ");
    Serial.print(x);
    Serial.print("  Y: ");
    Serial.print(y);
    Serial.print("  Z: ");
    Serial.println(z);

    // Turn all LEDs OFF first
    digitalWrite(LEDR, HIGH);
    digitalWrite(LEDG, HIGH);
    digitalWrite(LEDB, HIGH);

    // Tilt Left
    if (x < -0.4) {
      digitalWrite(LEDR, LOW);     // Red ON
      Serial.println("LEFT");
    }

    // Tilt Right
    else if (x > 0.4) {
      digitalWrite(LEDB, LOW);     // Blue ON
      Serial.println("RIGHT");
    }

    // Flat
    else {
      Serial.println("CENTER");
    }
  }

  delay(100);
}
