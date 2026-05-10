/*
 * ============================================
 * EMG Analyzer - ESP32 Arduino Serial Bridge
 * ============================================
 *
 * Receives EMG values from Arduino via Serial2 (UART2).
 * BATCHES all readings and sends them in ONE HTTP request
 * to prevent server overload and ensure all data reaches website.
 *
 * Hardware Wiring:
 * Arduino TX (D1) -> Voltage Divider (5V->3.3V) -> ESP32 GPIO16 (RX2)
 * Arduino GND -> ESP32 GND
 *
 * Voltage Divider for 5V->3.3V level shifting:
 * Arduino TX -> 1kΩ -> ESP32 RX2
 *                   -> 2kΩ -> GND
 *
 * Author: EMG Analyzer Project
 * License: MIT
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION - CHANGE THESE VALUES!
// ============================================

const char* WIFI_SSID     = "FZH_N_202";
const char* WIFI_PASSWORD = "25388206";

const char* SERVER_URL = "https://emganalyzer.vercel.app/api/sensor-data";

const int SEND_INTERVAL_MS = 500;  // Send batch every 500ms
const int MAX_BATCH_SIZE   = 100;  // Max samples per batch

// If your Arduino sends mV values (like 2.666), multiply to scale up
// Set to 1000 to convert mV to microvolts, or 1 to keep as-is
const float EMG_SCALE_FACTOR = 1000.0;  // mV -> µV (gives values like 2666)

// Serial2 Pins
const int ESP_RX2 = 16;
const int ESP_TX2 = 17;

// LED Pin
const int LED_PIN = 2;

// ============================================
// Variables
// ============================================
unsigned long lastSendTime = 0;
String lineBuffer = "";

// Batch buffer for EMG readings
struct EMGSample {
  int emg;
  unsigned long timestamp;
};
EMGSample batchBuffer[MAX_BATCH_SIZE];
int batchCount = 0;

// ============================================
// WiFi Connection
// ============================================
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi!");
    Serial.println("Check your credentials and try again.");
    digitalWrite(LED_PIN, LOW);
  }
}

// ============================================
// Read Arduino Serial Data
// Parses lines like "2.666\n" into float values
// Adds each reading to the batch buffer
// ============================================
void readArduinoSerial() {
  while (Serial2.available()) {
    char c = Serial2.read();

    if (c == '\n' || c == '\r') {
      if (lineBuffer.length() > 0) {
        float v = lineBuffer.toFloat();
        
        // Scale and add to batch buffer (if not full)
        if (batchCount < MAX_BATCH_SIZE) {
          // Scale the value (mV -> larger unit for visibility on chart)
          int scaledValue = (int)(v * EMG_SCALE_FACTOR);
          batchBuffer[batchCount].emg = scaledValue;
          batchBuffer[batchCount].timestamp = millis();
          batchCount++;
          
          Serial.print("Buffered [");
          Serial.print(batchCount);
          Serial.print("]: ");
          Serial.print(v, 3);
          Serial.print(" mV -> ");
          Serial.println(scaledValue);
        }

        lineBuffer = "";
      }
    } else {
      if (lineBuffer.length() < 32) {
        lineBuffer += c;
      } else {
        lineBuffer = "";  // overflow protection
      }
    }
  }
}

// ============================================
// Send Batched EMG Data to Server
// Sends JSON array: [{"emg": v1, "timestamp": t1}, {"emg": v2, "timestamp": t2}, ...]
// Server supports batch mode!
// ============================================
void sendBatchedEMGData() {
  if (batchCount == 0) {
    Serial.println("No data in batch to send");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Still disconnected, skipping send");
      return;
    }
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);  // 15 second timeout for larger batches

  // Build JSON array of all buffered samples
  DynamicJsonDocument doc(MAX_BATCH_SIZE * 64 + 512);
  JsonArray arr = doc.to<JsonArray>();

  int samplesToSend = batchCount;
  for (int i = 0; i < samplesToSend; i++) {
    JsonObject sample = arr.createNestedObject();
    sample["emg"] = batchBuffer[i].emg;
    sample["timestamp"] = batchBuffer[i].timestamp;
  }

  // Clear batch AFTER copying to JSON
  batchCount = 0;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("========== SENDING BATCH ==========");
  Serial.print("Samples: ");
  Serial.println(samplesToSend);
  Serial.print("Payload size: ");
  Serial.print(jsonString.length());
  Serial.println(" bytes");
  
  // Print first few samples for debugging
  if (samplesToSend > 0) {
    Serial.print("First EMG: ");
    Serial.println(arr[0]["emg"].as<int>());
    if (samplesToSend > 1) {
      Serial.print("Last EMG: ");
      Serial.println(arr[samplesToSend-1]["emg"].as<int>());
    }
  }

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Response (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);

    // Quick blink on success
    digitalWrite(LED_PIN, LOW);
    delay(30);
    digitalWrite(LED_PIN, HIGH);

  } else {
    Serial.print("ERROR sending batch! Code: ");
    Serial.print(httpResponseCode);
    Serial.print(" (");
    Serial.print(HTTPClient::errorToString(httpResponseCode));
    Serial.println(")");

    // Double blink on failure
    digitalWrite(LED_PIN, LOW);  delay(100);
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
    digitalWrite(LED_PIN, HIGH);
  }

  http.end();
  Serial.println("====================================");
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, ESP_RX2, ESP_TX2);

  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("  EMG Analyzer - Arduino Serial Bridge ");
  Serial.println("       ** BATCHED MODE ENABLED **      ");
  Serial.println("========================================");
  Serial.println();
  Serial.println("MODE: Real EMG via Arduino Serial (BATCHED)");
  Serial.print("Listening on GPIO ");
  Serial.println(ESP_RX2);
  Serial.print("Send interval: ");
  Serial.print(SEND_INTERVAL_MS);
  Serial.println(" ms");
  Serial.print("Max batch size: ");
  Serial.print(MAX_BATCH_SIZE);
  Serial.println(" samples");
  Serial.print("Scale factor: ");
  Serial.println(EMG_SCALE_FACTOR);
  Serial.println();

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  connectToWiFi();

  Serial.println();
  Serial.println("ESP32 ready. Waiting for Arduino EMG data...");
  Serial.println("All samples will be BATCHED and sent together!");
  Serial.println();
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  // Continuously read incoming Arduino serial data into batch buffer
  readArduinoSerial();

  unsigned long currentTime = millis();
  
  // Send batch at regular intervals
  if (currentTime - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = currentTime;

    if (batchCount > 0) {
      Serial.print("\n>>> Batch ready with ");
      Serial.print(batchCount);
      Serial.println(" samples");
      sendBatchedEMGData();
    } else {
      Serial.println("Waiting for Arduino data...");
    }
  }
  
  // Small yield to prevent watchdog timeout
  yield();
}

/*
 * ============================================
 * TROUBLESHOOTING TIPS
 * ============================================
 *
 * 1. "WiFi not connecting"
 *    - Double-check SSID and password (case-sensitive!)
 *    - ESP32 only supports 2.4GHz WiFi (not 5GHz)
 *
 * 2. "Waiting for Arduino data..."
 *    - Check TX/RX wiring between Arduino and ESP32
 *    - Make sure Arduino is sending at 115200 baud
 *    - Ensure voltage divider is correctly wired (5V->3.3V)
 *    - Verify Arduino is printing values followed by \n
 *
 * 3. "ERROR sending batch"
 *    - Check SERVER_URL is correct
 *    - Server might be temporarily overloaded - will retry next interval
 *    - If testing locally, use your PC's local IP (not localhost)
 *
 * 4. "Values too small on chart"
 *    - Adjust EMG_SCALE_FACTOR at the top
 *    - If Arduino sends mV (like 2.666), use 1000 to get µV (2666)
 *    - If Arduino sends raw ADC (0-4095), use 1.0
 *
 * 5. "Data not showing on website"
 *    - Check Response shows "Received X sample(s)" where X > 1
 *    - If X is always 1, batching isn't working - check this code
 *    - Refresh the website dashboard page
 */