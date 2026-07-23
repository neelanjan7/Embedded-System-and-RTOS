#include <ArduinoBLE.h>

// Nordic UART Service (NUS) UUIDs
BLEService uartService("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
BLECharacteristic rxChar("6E400002-B5A3-F393-E0A9-E50E24DCCA9E", BLEWriteWithoutResponse | BLEWrite, 20);
BLECharacteristic txChar("6E400003-B5A3-F393-E0A9-E50E24DCCA9E", BLENotify, 20);

String packetBuffer = "";

void setup() {
  Serial.begin(115200);

  pinMode(LEDR, OUTPUT);
  pinMode(LEDG, OUTPUT);
  pinMode(LEDB, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);

  // Turn off RGB LEDs (Active LOW: 255 is OFF, 0 is fully ON)
  analogWrite(LEDR, 255);
  analogWrite(LEDG, 255);
  analogWrite(LEDB, 255);
  digitalWrite(LED_BUILTIN, LOW);

  if (!BLE.begin()) {
    Serial.println("Starting BLE failed!");
    while (1);
  }

  BLE.setLocalName("Sagar kumar");
  BLE.setAdvertisedService(uartService);
  uartService.addCharacteristic(rxChar);
  uartService.addCharacteristic(txChar);
  BLE.addService(uartService);

  BLE.advertise();
  Serial.println("Bluetooth device active, waiting for connections...");
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to phone MAC: ");
    Serial.println(central.address());
    digitalWrite(LED_BUILTIN, HIGH);

    while (central.connected()) {
      if (rxChar.written()) {
        int length = rxChar.valueLength();
        const uint8_t* data = rxChar.value();

        // Add all incoming characters into our buffer
        for (int i = 0; i < length; i++) {
          packetBuffer += (char)data[i];
        }

        // Process the buffer to separate commands from chat text
        processBuffer();
      }
    }

    Serial.print("Disconnected from phone MAC: ");
    Serial.println(central.address());
    digitalWrite(LED_BUILTIN, LOW);
    analogWrite(LEDR, 255); analogWrite(LEDG, 255); analogWrite(LEDB, 255);
    packetBuffer = "";
  }
}

// --- The Traffic Director ---
void processBuffer() {
  while (packetBuffer.length() > 0) {
    
    // 1. Is this an Adafruit Controller Packet? (They always start with '!')
    if (packetBuffer.charAt(0) == '!') {
      
      if (packetBuffer.length() < 2) return; // Wait for the type byte to arrive
      
      char commandType = packetBuffer.charAt(1);
      int expectedLen = 0;
      
      // Determine the exact length of the packet based on Adafruit's protocol
      if (commandType == 'B') expectedLen = 5;       // Control Pad Buttons
      else if (commandType == 'C') expectedLen = 6;  // Color Picker
      else if (commandType == 'A' || commandType == 'G' || commandType == 'M' || commandType == 'L') expectedLen = 15; // Sensor streams (Accel, Gyro, etc.)
      else if (commandType == 'Q') expectedLen = 19; // Quaternion
      else {
        // Unknown '!' command. Treat it as normal chat text.
        handleChatText("!");
        packetBuffer.remove(0, 1);
        continue;
      }

      // Wait until the full packet arrives in the buffer
      if (packetBuffer.length() < expectedLen) return;

      // Verify the Data Checksum
      uint8_t xsum = 0;
      for (int i = 0; i < expectedLen - 1; i++) {
        xsum += (uint8_t)packetBuffer.charAt(i);
      }
      xsum = ~xsum; // Invert the sum
      
      uint8_t checksum = (uint8_t)packetBuffer.charAt(expectedLen - 1);
      
      if (xsum == checksum) {
        
        // --- CHECKSUM PASSED: Execute the command ---
        
        if (commandType == 'B') {
           char btn = packetBuffer.charAt(2);
           char pressed = packetBuffer.charAt(3);
           
           if (pressed == '1') {
             Serial.print("Control Pad Pressed: ");
             switch(btn) {
               case '1': Serial.println("1"); break;
               case '2': Serial.println("2"); break;
               case '3': Serial.println("3"); break;
               case '4': Serial.println("4"); break;
               case '5': Serial.println("Up Arrow"); break;
               case '6': Serial.println("Down Arrow"); break;
               case '7': Serial.println("Left Arrow"); break;
               case '8': Serial.println("Right Arrow"); break;
             }
           } else {
             Serial.print("Control Pad Released: ");
             Serial.println(btn);
           }
        } 
        else if (commandType == 'C') {
           uint8_t r = packetBuffer.charAt(2);
           uint8_t g = packetBuffer.charAt(3);
           uint8_t b = packetBuffer.charAt(4);
           
           // Apply real-time color (Active LOW: 255 minus the color value)
           analogWrite(LEDR, 255 - r);
           analogWrite(LEDG, 255 - g);
           analogWrite(LEDB, 255 - b);
        }
        
        // Remove this specific packet from the buffer so the loop can read the next one
        packetBuffer.remove(0, expectedLen);
        
      } else {
        // Checksum failed (User likely just typed "!B" in the chat). Treat as text.
        handleChatText("!");
        packetBuffer.remove(0, 1);
      }
      
    } 
    // 2. Normal UART Chat Text (Doesn't start with '!')
    else {
      int nextBang = packetBuffer.indexOf('!');
      String chatText = "";
      
      if (nextBang == -1) {
        chatText = packetBuffer; // The whole buffer is text
        packetBuffer = "";       // Clear it
      } else {
        chatText = packetBuffer.substring(0, nextBang); // Get text up to the next '!'
        packetBuffer.remove(0, nextBang);               // Remove it so the '!' is processed next loop
      }
      
      handleChatText(chatText);
    }
  }
}

// --- The Text Chat Handler ---
void handleChatText(String text) {
  // Clean up hidden newline characters so it prints beautifully
  text.replace("\n", "");
  text.replace("\r", "");
  
  if (text.length() > 0) {
    // Print whatever the user typed in the UART module
    Serial.print("UART Chat Message: ");
    Serial.println(text);
    
    // Retain the old manual override: typing 1, 2, 3, or 0 in chat forces the color
    if (text.indexOf('1') != -1) {
      analogWrite(LEDR, 0); analogWrite(LEDG, 255); analogWrite(LEDB, 255); 
      Serial.println("-> Switched to Red via Chat Override");
    }
    else if (text.indexOf('2') != -1) {
      analogWrite(LEDR, 255); analogWrite(LEDG, 0); analogWrite(LEDB, 255); 
      Serial.println("-> Switched to Green via Chat Override");
    }
    else if (text.indexOf('3') != -1) {
      analogWrite(LEDR, 255); analogWrite(LEDG, 255); analogWrite(LEDB, 0); 
      Serial.println("-> Switched to Blue via Chat Override");
    }
    else if (text.indexOf('0') != -1) {
      analogWrite(LEDR, 255); analogWrite(LEDG, 255); analogWrite(LEDB, 255); 
      Serial.println("-> LEDs Turned Off via Chat Override");
    }
  }
}