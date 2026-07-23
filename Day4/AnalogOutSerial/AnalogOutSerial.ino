#include <rgb_lcd.h>

#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void setup() {
  lcd.begin(16, 2);

  lcd.setRGB(255, 255, 255);

  lcd.clear();

  lcd.print("Hello World!");

  lcd.setCursor(0, 1);
  lcd.print("Sagar Kumar");
}

void loop() {
}
