/*
  MP34DT05 Voice & Frequency Detector — Accuracy-Improved Version
  Board: Arduino Nano 33 BLE Sense (onboard PDM microphone)

  What it does:
    1. Reads audio samples from the onboard MP34DT05 PDM microphone.
    2. Removes DC offset, then computes RMS (loudness) of each audio block.
    3. Tracks an ADAPTIVE noise floor (learned continuously from quiet
       periods) instead of a single fixed threshold, so the detector
       self-adjusts to the room's ambient noise level.
    4. Uses HYSTERESIS (two thresholds) for silence detection, so the
       Silence flag doesn't flicker on borderline noise.
    5. Runs an FFT to find the dominant frequency, and checks it against
       the human voice range (VOICE_FREQ_MIN..VOICE_FREQ_MAX).
    6. Checks SPECTRAL FLATNESS around the peak — real speech has energy
       spread across nearby bins (formants/texture), while claps,
       whistles, and hums tend to concentrate energy in 1-2 bins even if
       their peak frequency happens to fall in the voice range. This
       rejects those false positives.
    7. Smooths amplitude and frequency with an EMA (exponential moving
       average) to reduce jitter on the Serial Plotter.
    8. DEBOUNCES the Voice flag — requires several consecutive
       voice-like frames before latching "Voice", filtering out
       single-frame spikes (pops, clicks).
    9. Prints Amplitude, Frequency, Silence, and Voice to Serial in
       Serial-Plotter-friendly format.

  Libraries required (install via Library Manager):
    - PDM              (by Arduino)         -> mic capture
    - arduinoFFT        (by Enrique Condes)  -> frequency analysis

  Wiring: none needed — MP34DT05 mic is built into the Nano 33 BLE Sense.

  Tuning tips:
    - If Voice never triggers on your voice: lower NOISE_FLOOR_MULTIPLIER
      or VOICE_DEBOUNCE_FRAMES, or raise MIC gain in setup().
    - If Voice triggers on background noise/fan/AC hum: raise
      NOISE_FLOOR_MULTIPLIER or FLATNESS_MAX_RATIO (stricter).
    - If it's too slow to react: lower EMA_ALPHA_* (less smoothing) or
      VOICE_DEBOUNCE_FRAMES.
*/

#include <PDM.h>
#include <arduinoFFT.h>

// ---------- Audio / Sampling Config ----------
#define SAMPLE_RATE     16000        // Hz, PDM mic sample rate
#define FFT_SIZE        256          // must be a power of 2

// ---------- Adaptive Noise Floor Config ----------
// The threshold used for silence detection is not fixed anymore.
// Instead we track a running estimate of the ambient noise RMS and
// scale it by a multiplier to decide what counts as "sound".
#define NOISE_FLOOR_ALPHA        0.02   // how fast the noise floor adapts (0-1, lower = slower/steadier)
#define NOISE_FLOOR_MULTIPLIER   3.0    // sound must exceed noiseFloor * this to be "not silent"
#define NOISE_FLOOR_MIN          150.0  // floor never adapts below this (avoid runaway near-zero threshold)
#define HYSTERESIS_RATIO         0.85   // exit-silence threshold vs enter-silence threshold (creates hysteresis band)

// ---------- Human Voice Frequency Range ----------
// Adult human voice fundamental frequency roughly:
//   Male:   85  - 180 Hz
//   Female: 165 - 255 Hz
// Including harmonics/consonants, speech energy extends up to ~3000 Hz.
#define VOICE_FREQ_MIN   80          // Hz - below this: hums, rumble, HVAC
#define VOICE_FREQ_MAX   3000        // Hz - above this: whistles, beeps

// ---------- Spectral Flatness (false-positive rejection) ----------
// Real voice spreads energy across several bins near the peak (formants,
// breathiness, consonants). A pure tone (whistle, hum, beep) concentrates
// almost all its energy in 1-2 bins. We compare energy in a small window
// around the peak bin to total spectral energy; if that ratio is too
// high, it's "too pure" to be voice, even if the frequency matches.
#define FLATNESS_WINDOW_BINS   2     // bins on each side of the peak to include
#define FLATNESS_MAX_RATIO     0.55  // peak-window energy / total energy must be BELOW this to count as voice

// ---------- Smoothing (EMA) ----------
#define EMA_ALPHA_AMPLITUDE   0.3    // higher = less smoothing, more responsive
#define EMA_ALPHA_FREQUENCY   0.3

// ---------- Debounce ----------
#define VOICE_DEBOUNCE_FRAMES  3     // consecutive voice-like frames needed before flagging Voice

// ---------- PDM buffers ----------
short sampleBuffer[FFT_SIZE];
volatile int samplesRead = 0;

// ---------- FFT arrays ----------
double vReal[FFT_SIZE];
double vImag[FFT_SIZE];

ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, FFT_SIZE, SAMPLE_RATE);

// ---------- Running state ----------
double noiseFloor = NOISE_FLOOR_MIN;   // adaptive ambient RMS estimate
double smoothedAmplitude = 0;
double smoothedFrequency = 0;
bool   wasSilent = true;               // previous frame's silence state (for hysteresis)
int    voiceStreak = 0;                // consecutive voice-like frame counter
bool   voiceLatched = false;           // debounced/output Voice flag

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

  Serial.println("MP34DT05 Voice & Frequency Detector Ready (accuracy-improved)");
}

void loop() {
  // Wait until we have a full FFT_SIZE block of samples
  if (samplesRead < FFT_SIZE) {
    return;
  }

  // ---------- 1) Remove DC offset, then compute RMS ----------
  double mean = 0;
  for (int i = 0; i < FFT_SIZE; i++) {
    mean += sampleBuffer[i];
  }
  mean /= FFT_SIZE;

  double sumSquares = 0;
  for (int i = 0; i < FFT_SIZE; i++) {
    double centered = (double)sampleBuffer[i] - mean; // DC-removed sample
    vReal[i] = centered;   // load into FFT real array (DC removed)
    vImag[i] = 0.0;        // clear imaginary array
    sumSquares += centered * centered;
  }
  double rms = sqrt(sumSquares / FFT_SIZE);

  // ---------- 2) Adaptive noise floor ----------
  // Only adapt the floor during frames that look like ambient noise
  // (i.e. the previous frame was already classified silent), so a
  // sustained voice doesn't drag the floor upward.
  if (wasSilent) {
    noiseFloor = (1.0 - NOISE_FLOOR_ALPHA) * noiseFloor + NOISE_FLOOR_ALPHA * rms;
    if (noiseFloor < NOISE_FLOOR_MIN) noiseFloor = NOISE_FLOOR_MIN;
  }

  double enterSoundThreshold = noiseFloor * NOISE_FLOOR_MULTIPLIER;
  double exitSoundThreshold  = enterSoundThreshold * HYSTERESIS_RATIO;

  // ---------- 3) Silence detection with hysteresis ----------
  bool isSilent;
  if (wasSilent) {
    // Was silent: need to clearly exceed the higher threshold to become "sound"
    isSilent = rms < enterSoundThreshold;
  } else {
    // Was sound: only drop back to "silent" once below the lower threshold
    isSilent = rms < exitSoundThreshold;
  }
  wasSilent = isSilent;

  // ---------- 4) Frequency + spectral flatness via FFT ----------
  double peakFrequency = 0;
  bool spectrumLooksVoiceLike = false;

  if (!isSilent) {
    FFT.windowing(FFTWindow::Hamming, FFTDirection::Forward); // reduce spectral leakage
    FFT.compute(FFTDirection::Forward);                       // compute FFT
    FFT.complexToMagnitude();                                 // vReal[] now holds magnitudes
    peakFrequency = FFT.majorPeak();                          // dominant frequency

    // Find the peak bin's index so we can inspect energy around it.
    // (Only need bins 1..FFT_SIZE/2, the usable half of the spectrum.)
    int peakBin = 1;
    double peakMag = 0;
    int usableBins = FFT_SIZE / 2;
    for (int i = 1; i < usableBins; i++) {
      if (vReal[i] > peakMag) {
        peakMag = vReal[i];
        peakBin = i;
      }
    }

    double totalEnergy = 0;
    double peakWindowEnergy = 0;
    int lo = max(1, peakBin - FLATNESS_WINDOW_BINS);
    int hi = min(usableBins - 1, peakBin + FLATNESS_WINDOW_BINS);
    for (int i = 1; i < usableBins; i++) {
      double e = vReal[i] * vReal[i]; // energy ~ magnitude^2
      totalEnergy += e;
      if (i >= lo && i <= hi) {
        peakWindowEnergy += e;
      }
    }

    double flatnessRatio = (totalEnergy > 0) ? (peakWindowEnergy / totalEnergy) : 1.0;
    // Voice-like = energy is spread out, NOT concentrated in the peak window
    spectrumLooksVoiceLike = (flatnessRatio < FLATNESS_MAX_RATIO);
  }

  // ---------- 5) Smoothing (EMA) ----------
  smoothedAmplitude = EMA_ALPHA_AMPLITUDE * rms + (1.0 - EMA_ALPHA_AMPLITUDE) * smoothedAmplitude;
  if (!isSilent) {
    smoothedFrequency = EMA_ALPHA_FREQUENCY * peakFrequency + (1.0 - EMA_ALPHA_FREQUENCY) * smoothedFrequency;
  }

  // ---------- 6) Voice decision + debounce ----------
  bool frameLooksLikeVoice = (!isSilent) &&
                              (peakFrequency >= VOICE_FREQ_MIN) &&
                              (peakFrequency <= VOICE_FREQ_MAX) &&
                              spectrumLooksVoiceLike;

  if (frameLooksLikeVoice) {
    if (voiceStreak < VOICE_DEBOUNCE_FRAMES) voiceStreak++;
  } else {
    voiceStreak = 0;
  }
  voiceLatched = (voiceStreak >= VOICE_DEBOUNCE_FRAMES);

  // ---------- 7) Output for Serial Plotter ----------
  // Format "Label:value" -> Arduino IDE Serial Plotter draws each label as its own line
  Serial.print("Amplitude:");
  Serial.print(smoothedAmplitude);
  Serial.print(",");

  Serial.print("Frequency:");
  Serial.print(smoothedFrequency);
  Serial.print(",");

  Serial.print("NoiseFloor:");
  Serial.print(noiseFloor);
  Serial.print(",");

  Serial.print("Silence:");
  Serial.print(isSilent ? 1 : 0); // 1 = silent, 0 = sound detected
  Serial.print(",");

  Serial.print("Voice:");
  Serial.println(voiceLatched ? 1 : 0); // 1 = human voice detected (debounced), 0 = not voice

  // Reset for next block
  samplesRead = 0;
}
