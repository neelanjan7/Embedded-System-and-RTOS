/*
  MP34DT05 Voice & Frequency Detector
  Board: Arduino Nano 33 BLE Sense (onboard PDM microphone)

  What it does:
    1. Reads audio samples from the onboard MP34DT05 PDM microphone.
    2. Computes RMS (Root Mean Square) amplitude of each audio block.
    3. Compares RMS against a threshold to decide SOUND vs SILENCE.
       (A quiet / far-away sound has low RMS, so it is treated as silence —
        this is what filters out distant or faint sounds.)
    4. Runs an FFT on the audio block to estimate the dominant frequency (Hz).
    5. Checks whether that frequency falls inside the human voice range
       (VOICE_FREQ_MIN to VOICE_FREQ_MAX). Only sounds that are both loud
       enough AND in that frequency band are flagged as "Voice".
       Other sounds (claps, taps, machine noise, etc.) fall outside the
       range and are ignored even if loud.
    6. Prints Amplitude, Frequency, Silence, and Voice flags to Serial —
       formatted so the Arduino IDE Serial Plotter draws separate traces.

  Libraries required (install via Library Manager):
    - PDM              (by Arduino)      -> mic capture
    - arduinoFFT        (by Enrique Condes) -> frequency analysis

  Wiring: none needed — MP34DT05 mic is built into the Nano 33 BLE Sense.
*/

#include <PDM.h>
#include <arduinoFFT.h>

// ---------- Audio / Sampling Config ----------
#define SAMPLE_RATE     16000        // Hz, PDM mic sample rate
#define FFT_SIZE        256          // must be a power of 2
#define SILENCE_THRESHOLD 500        // tune this based on your mic/environment
                                      // (lower threshold = picks up fainter/farther sounds,
                                      //  higher threshold = only close/loud sounds count)

// ---------- Human Voice Frequency Range ----------
// Adult human voice fundamental frequency roughly:
//   Male:   85  - 180 Hz
//   Female: 165 - 255 Hz
// Including harmonics/consonants, speech energy extends up to ~3000 Hz.
// Adjust these two values to widen/narrow what counts as "voice".
#define VOICE_FREQ_MIN   80          // Hz - anything below this is NOT voice (e.g. hums, rumble)
#define VOICE_FREQ_MAX   3000        // Hz - anything above this is NOT voice (e.g. whistles, beeps)

// ---------- PDM buffers ----------
short sampleBuffer[FFT_SIZE];
volatile int samplesRead = 0;

// ---------- FFT arrays ----------
double vReal[FFT_SIZE];
double vImag[FFT_SIZE];

ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, FFT_SIZE, SAMPLE_RATE);

void onPDMdata() {
  int bytesAvailable = PDM.available();
  PDM.read(sampleBuffer, bytesAvailable);
  samplesRead = bytesAvailable / 2; // 2 bytes per sample (16-bit)
}

void setup() {
  Serial.begin(115200);
  while (!Serial);

  PDM.onReceive(onPDMdata);

  // Mono channel, 16kHz sample rate
  if (!PDM.begin(1, SAMPLE_RATE)) {
    Serial.println("Failed to start PDM microphone!");
    while (1);
  }

  // Optional: adjust mic gain (0-80). Increase if signal is too weak.
  PDM.setGain(40);

  Serial.println("MP34DT05 Voice & Frequency Detector Ready");
}

void loop() {
  // Wait until we have a full FFT_SIZE block of samples
  if (samplesRead < FFT_SIZE) {
    return;
  }

  // ---------- 1) Compute RMS amplitude ----------
  double sumSquares = 0;
  for (int i = 0; i < FFT_SIZE; i++) {
    vReal[i] = (double)sampleBuffer[i]; // load into FFT real array
    vImag[i] = 0.0;                     // clear imaginary array
    sumSquares += (double)sampleBuffer[i] * (double)sampleBuffer[i];
  }
  double rms = sqrt(sumSquares / FFT_SIZE);

  // ---------- 2) Silence detection ----------
  bool isSilent = rms < SILENCE_THRESHOLD;

  // ---------- 3) Frequency detection via FFT ----------
  double peakFrequency = 0;
  if (!isSilent) {
    FFT.windowing(FFTWindow::Hamming, FFTDirection::Forward); // reduce spectral leakage
    FFT.compute(FFTDirection::Forward);                       // compute FFT
    FFT.complexToMagnitude();                                 // get magnitudes
    peakFrequency = FFT.majorPeak();                          // dominant frequency
  }

  // ---------- 4) Voice range check ----------
  // Only counts as "voice" if it's loud enough (not silent/far) AND
  // its dominant frequency falls inside the human voice band.
  bool isVoice = (!isSilent) &&
                 (peakFrequency >= VOICE_FREQ_MIN) &&
                 (peakFrequency <= VOICE_FREQ_MAX);

  // ---------- 5) Output for Serial Plotter ----------
  // Format "Label:value" -> Arduino IDE Serial Plotter draws each label as its own line
  Serial.print("Amplitude:");
  Serial.print(rms);
  Serial.print(",");

  Serial.print("Frequency:");
  Serial.print(peakFrequency);
  Serial.print(",");

  Serial.print("Silence:");
  Serial.print(isSilent ? 1 : 0); // 1 = silent, 0 = sound detected
  Serial.print(",");

  Serial.print("Voice:");
  Serial.println(isVoice ? 1 : 0); // 1 = human voice detected, 0 = not voice (or silent)

  // Reset for next block
  samplesRead = 0;
}
