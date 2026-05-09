/*
 * ============================================
 * EMG Analyzer - ESP32 Arduino Serial Bridge
 * ============================================
 *
 * Receives EMG values from Arduino via Serial2 (UART2).
 * BATCHES multiple readings and sends them in one HTTP request
 * to prevent server overload.
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

const char* WIFI_SSID     = "shormi20";
const char* WIFI_PASSWORD = "12345678";

const char* SERVER_URL = "https://emganalyzer.vercel.app/api/sensor-data";

// BATCHING CONFIG - Key to preventing server overload
const int SEND_INTERVAL_MS = 500;   // Send batch every 500ms (2 requests/sec)
const int MAX_BATCH_SIZE   = 50;    // Max samples per batch

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
// Parses lines like "512.00\n" into float values
// Adds each reading to the batch buffer
// ============================================
void readArduinoSerial() {
  while (Serial2.available()) {
    char c = Serial2.read();

    if (c == '\n' || c == '\r') {
      if (lineBuffer.length() > 0) {
        float v = lineBuffer.toFloat();
        
        // Add to batch buffer (if not full)
        if (batchCount < MAX_BATCH_SIZE) {
          batchBuffer[batchCount].emg = (int)v;
          batchBuffer[batchCount].timestamp = millis();
          batchCount++;
        }
        // If buffer is full, oldest samples are lost (acceptable trade-off)

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
// Sends array: [{"emg": v1, "timestamp": t1}, {"emg": v2, "timestamp": t2}, ...]
// Server already supports batch mode!
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
  http.setTimeout(10000);  // 10 second timeout

  // Build JSON array of samples
  // Size: ~50 bytes per sample * MAX_BATCH_SIZE + overhead
  DynamicJsonDocument doc(MAX_BATCH_SIZE * 64 + 256);
  JsonArray arr = doc.to<JsonArray>();

  int samplesToSend = batchCount;
  for (int i = 0; i < samplesToSend; i++) {
    JsonObject sample = arr.createNestedObject();
    sample["emg"] = batchBuffer[i].emg;
    sample["timestamp"] = batchBuffer[i].timestamp;
  }

  // Clear batch after copying to JSON
  batchCount = 0;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("Sending batch of ");
  Serial.print(samplesToSend);
  Serial.print(" samples (");
  Serial.print(jsonString.length());
  Serial.println(" bytes)");

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Response (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);

    // Blink LED once on success
    digitalWrite(LED_PIN, LOW);
    delay(30);
    digitalWrite(LED_PIN, HIGH);

  } else {
    Serial.print("Error sending batch! Code: ");
    Serial.print(httpResponseCode);
    Serial.print(" (");
    Serial.print(HTTPClient::errorToString(httpResponseCode));
    Serial.println(")");

    // Blink LED twice on failure
    digitalWrite(LED_PIN, LOW);  delay(100);
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
    digitalWrite(LED_PIN, HIGH);
  }

  http.end();
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
  Serial.println("        (BATCHED MODE - Low Load)      ");
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
  Serial.println();

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  connectToWiFi();

  Serial.println("ESP32 ready. Waiting for Arduino EMG data...");
  Serial.println("Samples will be batched and sent every " + String(SEND_INTERVAL_MS) + "ms");
  Serial.println();
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  // Always read incoming Arduino serial data into batch buffer
  readArduinoSerial();

  unsigned long currentTime = millis();
  
  // Send batch at regular intervals (not per-sample!)
  if (currentTime - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = currentTime;

    if (batchCount > 0) {
      Serial.print("Batch ready: ");
      Serial.print(batchCount);
      Serial.println(" samples");
      sendBatchedEMGData();
    } else {
      Serial.println("No new EMG data received yet...");
    }
  }
  
  // Small yield to prevent watchdog issues
  yield();
}