/*
  Arduino Nano 33 BLE Sense
  APDS9960 Proximity Sensor
  Grove LCD RGB Backlight

  Very Close -> LCD OFF (Black)
  Close      -> Dim White
  Medium     -> Medium White
  Far        -> Bright White
*/

#include <Arduino_APDS9960.h>
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void setup() {

  Serial.begin(9600);
  while (!Serial);

  // Initialize LCD
  lcd.begin(16, 2);

  // Initial LCD = White
  lcd.setRGB(255, 255, 255);

  lcd.setCursor(0, 0);
  lcd.print("Proximity");

  lcd.setCursor(0, 1);
  lcd.print("Ready");

  // Initialize APDS9960
  if (!APDS.begin()) {
    lcd.clear();
    lcd.print("Sensor Error");
    while (1);
  }

  delay(2000);

  lcd.clear();
}

void loop() {

  if (APDS.proximityAvailable()) {

    int proximity = APDS.readProximity();

    Serial.print("Proximity = ");
    Serial.println(proximity);

    lcd.clear();

    // ------------------------------
    // VERY CLOSE (LCD OFF)
    // ------------------------------
    if (proximity <= 20) {

      lcd.setRGB(0, 0, 0);

      lcd.setCursor(0, 0);
      lcd.print("Very Close");

      lcd.setCursor(0, 1);
      lcd.print("LCD OFF");
    }

    // ------------------------------
    // CLOSE TO FAR
    // ------------------------------
    else {

      // Brightness increases as hand moves away
      int brightness = map(proximity, 21, 255, 20, 255);

      brightness = constrain(brightness, 20, 255);

      lcd.setRGB(brightness, brightness, brightness);

      lcd.setCursor(0, 0);
      lcd.print("Brightness");

      lcd.setCursor(0, 1);
      lcd.print(brightness);
      lcd.print("   ");
    }

    delay(100);
  }
}
