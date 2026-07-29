#include <Arduino_OV767X.h>
#include <Ultrasonic.h>

// ------------------------
// Ultrasonic Sensor
// ------------------------
Ultrasonic ultrasonic(12);

// ------------------------
// Camera
// ------------------------
#define IMAGE_WIDTH 160
#define IMAGE_HEIGHT 120
byte frameBuffer[IMAGE_WIDTH * IMAGE_HEIGHT];

// ------------------------
// RGB LED (Active LOW)
// ------------------------
#define RED_LED   LEDR
#define GREEN_LED LEDG
#define BLUE_LED  LEDB

// ------------------------
// Buzzer
// ------------------------
#define BUZZER 11

void setup() {

  Serial.begin(115200);
  while (!Serial);

  // RGB LED
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);

  digitalWrite(RED_LED, HIGH);
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(BLUE_LED, HIGH);

  // Buzzer
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  Serial.println("SYSTEM:READY");

  // Camera
  if (!Camera.begin(QQVGA, GRAYSCALE, 1)) {
    Serial.println("SYSTEM:CAMERA_FAILED");
    while (1);
  }

  Serial.println("SYSTEM:CAMERA_OK");
}

void loop() {

  long distance = ultrasonic.MeasureInCentimeters();

  // Send distance to Python
  Serial.print("DIST:");
  Serial.println(distance);

  if (distance > 0 && distance <= 30) {

    // Visitor detected
    Serial.println("STATUS:VISITOR");

    // Green LED ON
    digitalWrite(RED_LED, HIGH);
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(BLUE_LED, HIGH);

    // Capture image
    Camera.readFrame(frameBuffer);

    Serial.println("CAMERA:CAPTURED");

    // Buzzer
    digitalWrite(BUZZER, HIGH);
    delay(300);
    digitalWrite(BUZZER, LOW);

    delay(700);

  }
  else {

    // Waiting
    Serial.println("STATUS:WAITING");

    // Blue LED ON
    digitalWrite(RED_LED, HIGH);
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(BLUE_LED, LOW);

    digitalWrite(BUZZER, LOW);
  }

  delay(300);
}
