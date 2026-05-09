/*
  Arduino EMG -> ESP32

  Reads EMG from A0.
  Uses DC offset removal + 50/60 Hz notch filter.
  Output is always in range [0.0, 5.0] — never negative.

  Hardware:
  EMG OUT -> A0
  Arduino D1/TX -> voltage divider -> ESP32 GPIO16/RX2
  Arduino GND -> ESP32 GND
*/

const int emgPin = A0;

const bool SEND_RAW_ADC = false;

// 50.0 for Bangladesh/India/Europe, 60.0 for USA
const float MAINS_FREQ = 50.0;

const float FS = 1000.0;
const unsigned long SAMPLE_US = 1000;

// Notch strength: 0.95 = narrow, 0.90 = stronger/wider
const float r = 0.90;

// DC offset tracking
float dcOffset = 512.0;
const float dcAlpha = 0.001;

// Notch filter memory
float x1 = 0, x2 = 0;
float y1 = 0, y2 = 0;

// Send control (200 values/sec at FS=1000, PRINT_EVERY=5)
int printCounter = 0;
const int PRINT_EVERY = 5;

// --- Scaling constants ---
// After DC removal, filtered EMG typically swings in this range.
// Adjust EMG_MIN/EMG_MAX to match your actual signal range.
const float EMG_MIN = -512.0;
const float EMG_MAX =  512.0;
const float OUT_MIN =  0.0;
const float OUT_MAX =  5.0;

float notchFilter(float x) {
  float w0 = 2.0 * PI * MAINS_FREQ / FS;
  float c  = cos(w0);

  float y = x
            - 2.0 * c  * x1
            + x2
            + 2.0 * r  * c * y1
            - r * r    * y2;

  x2 = x1; x1 = x;
  y2 = y1; y1 = y;

  return y;
}

// Map filtered value to [0, 5], then clamp (shape) anything outside
float scaleAndClamp(float value) {
  // Linear map from [EMG_MIN, EMG_MAX] -> [OUT_MIN, OUT_MAX]
  float scaled = (value - EMG_MIN) / (EMG_MAX - EMG_MIN) * (OUT_MAX - OUT_MIN) + OUT_MIN;

  // Hard clamp — values beyond range get shaped to the boundary
  if (scaled < OUT_MIN) scaled = OUT_MIN;
  if (scaled > OUT_MAX) scaled = OUT_MAX;

  return scaled;
}

void setup() {
  Serial.begin(115200);
  pinMode(emgPin, INPUT);
}

void loop() {
  unsigned long startMicros = micros();

  int raw = analogRead(emgPin);

  if (SEND_RAW_ADC) {
    // Raw ADC mode: just scale 0-1023 to 0-5 and clamp
    printCounter++;
    if (printCounter >= PRINT_EVERY) {
      printCounter = 0;
      float scaled = (raw / 1023.0) * 5.0;
      // clamp just in case
      if (scaled < 0.0) scaled = 0.0;
      if (scaled > 5.0) scaled = 5.0;
      Serial.println(scaled, 3);
    }
  } else {
    // Filtered mode
    dcOffset = (1.0 - dcAlpha) * dcOffset + dcAlpha * raw;
    float centered = raw - dcOffset;
    float filtered = notchFilter(centered);

    printCounter++;
    if (printCounter >= PRINT_EVERY) {
      printCounter = 0;
      float output = scaleAndClamp(filtered);
      Serial.println(output, 3);
    }
  }

  while (micros() - startMicros < SAMPLE_US) {
    // maintain ~1000 Hz internal sampling rate
  }
}