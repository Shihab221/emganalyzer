/*
 * ============================================
 * EMG Analyzer - ESP32 Real Sensor Code
 * ============================================
 * 
 * This code reads from actual EMG sensor:
 * - EMG sensor connected to GPIO 34 (analog input)
 * 
 * Wiring Diagram:
 * 
 * EMG Sensor (e.g., MyoWare, AD8232):
 *   VCC  --> 3.3V
 *   GND  --> GND
 *   OUT  --> GPIO 34
 * 
 * Required Libraries:
 * - ArduinoJson (by Benoit Blanchon) - Install via Library Manager
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

// Your WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_NAME";        // <-- Change this!
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // <-- Change this!

// Server URL
// Local testing: "http://YOUR_COMPUTER_IP:3000/api/sensor-data"
// Vercel: "https://your-app.vercel.app/api/sensor-data"
const char* SERVER_URL = "http://192.168.1.100:3000/api/sensor-data"; // <-- Change this!

// How often to send data (in milliseconds)
const int SEND_INTERVAL = 500;  // 500ms = 2 times per second

// ============================================
// Pin Definitions
// ============================================
const int EMG_PIN = 34;    // Analog input for EMG sensor (ADC1)
const int LED_PIN = 2;     // Built-in LED for status

// ============================================
// Timing
// ============================================
unsigned long lastSendTime = 0;

// ============================================
// EMG Filtering (optional)
// ============================================
const bool USE_FILTER = true;  // Set to false for raw readings
const int FILTER_SAMPLES = 10;
int filterBuffer[FILTER_SAMPLES];
int filterIndex = 0;
int filterTotal = 0;
bool filterReady = false;

// ============================================
// SETUP FUNCTION
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("   EMG Analyzer - Real Sensor Mode");
  Serial.println("========================================");
  Serial.println();
  
  Serial.print("EMG Pin: GPIO ");
  Serial.println(EMG_PIN);
  Serial.print("Filter: ");
  Serial.println(USE_FILTER ? "Enabled (Moving Average)" : "Disabled (Raw)");
  Serial.println();
  
  pinMode(LED_PIN, OUTPUT);
  pinMode(EMG_PIN, INPUT);
  digitalWrite(LED_PIN, LOW);
  
  for (int i = 0; i < FILTER_SAMPLES; i++) {
    filterBuffer[i] = 0;
  }
  
  connectToWiFi();
  
  Serial.println("Setup complete! Starting data transmission...");
  Serial.println();
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectToWiFi();
  }
  
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    
    int emgValue = readEMG();
    sendEMGData(emgValue);
  }
}

// ============================================
// WiFi Connection Function
// ============================================
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
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
    Serial.println();
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi!");
    digitalWrite(LED_PIN, LOW);
  }
}

// ============================================
// Read EMG Sensor
// ============================================
int readEMG() {
  int rawValue = analogRead(EMG_PIN);
  
  if (!USE_FILTER) {
    return rawValue;
  }
  
  filterTotal -= filterBuffer[filterIndex];
  filterBuffer[filterIndex] = rawValue;
  filterTotal += filterBuffer[filterIndex];
  filterIndex = (filterIndex + 1) % FILTER_SAMPLES;
  
  if (filterIndex == 0) {
    filterReady = true;
  }
  
  if (filterReady) {
    return filterTotal / FILTER_SAMPLES;
  }
  
  return rawValue;
}

// ============================================
// Send EMG Data to Server
// ============================================
void sendEMGData(int emg) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<100> doc;
  doc["emg"] = emg;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("Sending: EMG=");
  Serial.println(emg);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.print("OK (");
    Serial.print(httpResponseCode);
    Serial.println(")");
    
    digitalWrite(LED_PIN, LOW);
    delay(30);
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.print("FAILED! Code: ");
    Serial.print(httpResponseCode);
    Serial.print(" (");
    Serial.print(HTTPClient::errorToString(httpResponseCode));
    Serial.println(")");
  }
  
  http.end();
}

/*
 * ============================================
 * WIRING REFERENCE
 * ============================================
 * 
 * ESP32 GPIO Reference:
 * - GPIO 34: ADC1_CH6 (input only, no pull-up)
 * - GPIO 2: Built-in LED on most boards
 * 
 * EMG Sensor (e.g., MyoWare, AD8232):
 * +--------+     +---------+
 * | EMG    |     | ESP32   |
 * |--------|     |---------|
 * | VCC    |---->| 3.3V    |
 * | GND    |---->| GND     |
 * | OUTPUT |---->| GPIO 34 |
 * +--------+     +---------+
 * 
 * ============================================
 * TROUBLESHOOTING
 * ============================================
 * 
 * "EMG readings stuck at 0 or 4095":
 *   - Check EMG sensor power
 *   - Verify GPIO 34 connection
 *   - Make sure electrodes are properly placed
 * 
 * "Noisy EMG readings":
 *   - Set USE_FILTER to true
 *   - Increase FILTER_SAMPLES for more smoothing
 *   - Check electrode placement and skin preparation
 *   - Keep wires away from power sources
 * 
 * "Data not appearing on website":
 *   - Verify SERVER_URL is correct
 *   - Check that both ESP32 and server are on same network
 *   - Look at Serial Monitor for error messages
 */
