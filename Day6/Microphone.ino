#include <PDM.h>

// Buffer to store microphone samples
short sampleBuffer[256];
volatile int samplesRead = 0;

// Called whenever new microphone data is available
void onPDMdata() {
  int bytesAvailable = PDM.available();
  PDM.read(sampleBuffer, bytesAvailable);
  samplesRead = bytesAvailable / 2;   // 2 bytes per sample
}

void setup() {
  Serial.begin(9600);

  // Set callback
  PDM.onReceive(onPDMdata);

  // Optional: microphone gain (0–80)
  PDM.setGain(30);

  // Start microphone
  if (!PDM.begin(1, 16000)) {
    Serial.println("Failed to start PDM!");
    while (1);
  }
}

void loop() {

  if (samplesRead) {

    long sum = 0;

    // Calculate RMS
    for (int i = 0; i < samplesRead; i++) {
      sum += (long)sampleBuffer[i] * sampleBuffer[i];
    }

    float rms = sqrt((float)sum / samplesRead);

    // Print sound level to Serial Plotter
    Serial.println(rms);

    samplesRead = 0;
  }
}
