#include <PDM.h>

short sampleBuffer[256];
volatile int samplesRead = 0;

void onPDMdata() {
  int bytesAvailable = PDM.available();
  PDM.read(sampleBuffer, bytesAvailable);
  samplesRead = bytesAvailable / 2;
}

void setup() {
  Serial.begin(9600);

  pinMode(LEDR, OUTPUT);
  pinMode(LEDG, OUTPUT);
  pinMode(LEDB, OUTPUT);

  // Turn all LEDs OFF
  digitalWrite(LEDR, HIGH);
  digitalWrite(LEDG, HIGH);
  digitalWrite(LEDB, HIGH);

  PDM.onReceive(onPDMdata);
  PDM.setGain(30);

  if (!PDM.begin(1, 16000)) {
    Serial.println("Failed to start microphone!");
    while (1);
  }
}

void loop() {

  if (samplesRead) {

    long sum = 0;

    for (int i = 0; i < samplesRead; i++) {
      sum += (long)sampleBuffer[i] * sampleBuffer[i];
    }

    float rms = sqrt((float)sum / samplesRead);

    Serial.println(rms);

    // Turn all LEDs OFF
    digitalWrite(LEDR, HIGH);
    digitalWrite(LEDG, HIGH);
    digitalWrite(LEDB, HIGH);

    if (rms < 300) {
      // Quiet
      digitalWrite(LEDG, LOW);
    }
    else if (rms < 1200) {
      // Moderate sound
      digitalWrite(LEDB, LOW);
    }
    else {
      // Loud sound
      digitalWrite(LEDR, LOW);
    }

    samplesRead = 0;
  }
}
