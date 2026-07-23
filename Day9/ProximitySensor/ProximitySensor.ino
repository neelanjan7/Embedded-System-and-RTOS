/*
  APDS-9960 - Proximity Sensor

  This example reads proximity data from the on-board APDS-9960 sensor of the
  Nano 33 BLE Sense and prints the proximity value to the Serial Monitor
  every 100 ms.

  The circuit:
  - Arduino Nano 33 BLE Sense

  This example code is in the public domain.
*/

#include <Arduino_APDS9960.h>

void setup() {
  Serial.begin(9600);
  while (!Serial);

  if (!APDS.begin()) {
    Serial.println("Error initializing APDS-9960 sensor!");
  }
  pinMode(LEDR, OUTPUT);
  // pinMode(LEDG, OUTPUT);
  pinMode(13, OUTPUT); 
  digitalWrite(LEDR, HIGH);
  
  // digitalWrite(LEDG, LOW);
}

int count = 0;
bool isLastAbove100 = true;
void loop() {
  // check if a proximity reading is available
  if (APDS.proximityAvailable()) {
    // read the proximity
    // - 0   => close
    // - 255 => far
    // - -1  => error
    int proximity = APDS.readProximity();
    if(proximity < 100 && isLastAbove100){
      digitalWrite(13, LOW);
      count ++;
      isLastAbove100 = false;
      if(count==10){
        // digitalWrite(LEDG, HIGH);
        digitalWrite(LEDR, LOW);
      }
    }  
    if(proximity > 100 && !isLastAbove100){
      digitalWrite(13, HIGH);
      isLastAbove100 = true;
    }
    // print value to the Serial Monitor
    Serial.println(proximity);
    Serial.println("Count");
    Serial.println(count);
  }

  // wait a bit before reading again
  delay(100);
}
