#include <Arduino_APDS9960.h>

int r = 0, g = 0, b = 0;

void setup() {
  Serial.begin(9600);

  while (!Serial);

  if (!APDS.begin()) {
    Serial.println("Error initializing APDS9960!");
    while (1);
  }

  Serial.println("APDS9960 Ready");
}

void loop() {

  // Update values only if a new reading is available
  if (APDS.colorAvailable()) {
    APDS.readColor(r, g, b);
  }

  // Always send the latest values
  Serial.print("R:");
  Serial.print(r);
  Serial.print(",G:");
  Serial.print(g);
  Serial.print(",B:");
  Serial.println(b);

  delay(200);
}











