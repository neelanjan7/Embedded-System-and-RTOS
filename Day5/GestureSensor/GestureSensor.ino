/*
  Arduino Nano 33 BLE Sense
  Gesture Detection + Grove LCD RGB Backlight
*/

#include <Arduino_APDS9960.h>
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void waitingScreen()
{
  lcd.clear();
  lcd.setRGB(255,255,255);      // White LCD

  lcd.setCursor(0,0);
  lcd.print("Gesture");

  lcd.setCursor(0,1);
  lcd.print("Waiting...");
}

void setup()
{
  Serial.begin(9600);
  while (!Serial);

  lcd.begin(16,2);

  waitingScreen();

  if (!APDS.begin())
  {
    lcd.clear();
    lcd.print("Sensor Error");

    while(1);
  }

  APDS.setGestureSensitivity(80);

  Serial.println("Gesture Detection Started");
}

void loop()
{
  if (APDS.gestureAvailable())
  {
    int gesture = APDS.readGesture();

    lcd.clear();

    switch(gesture)
    {

      case GESTURE_LEFT:

        Serial.println("LEFT");

        lcd.setRGB(255,0,0);          // RED

        lcd.setCursor(0,0);
        lcd.print("Gesture:");

        lcd.setCursor(0,1);
        lcd.print("LEFT");

        break;

      case GESTURE_RIGHT:

        Serial.println("RIGHT");

        lcd.setRGB(0,0,255);          // BLUE

        lcd.setCursor(0,0);
        lcd.print("Gesture:");

        lcd.setCursor(0,1);
        lcd.print("RIGHT");

        break;

      case GESTURE_UP:

        Serial.println("FORWARD");

        lcd.setRGB(0,255,0);          // GREEN

        lcd.setCursor(0,0);
        lcd.print("Gesture:");

        lcd.setCursor(0,1);
        lcd.print("FORWARD");

        break;

      case GESTURE_DOWN:

        Serial.println("BACKWARD");

        lcd.setRGB(255,255,0);        // YELLOW

        lcd.setCursor(0,0);
        lcd.print("Gesture:");

        lcd.setCursor(0,1);
        lcd.print("BACKWARD");

        break;

      default:

        Serial.println("UNKNOWN");

        lcd.setRGB(255,255,255);      // WHITE

        lcd.setCursor(0,0);
        lcd.print("Unknown");

        lcd.setCursor(0,1);
        lcd.print("Gesture");

        break;
    }

    delay(1000);

    waitingScreen();
  }
}
