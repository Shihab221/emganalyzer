/*
 * ============================================
 * EMG Analyzer - ESP32 Raw EMG Only
 * ============================================
 * 
 * Simplified version that sends only raw EMG data.
 * No MPU6050/accelerometer data.
 * 
 * How to use:
 * 1. Install ESP32 board in Arduino IDE
 * 2. Change WIFI_SSID and WIFI_PASSWORD below
 * 3. Change SERVER_URL to your computer's IP or deployed URL
 * 4. Upload to ESP32
 * 5. Open Serial Monitor (115200 baud) to see status
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
const char* WIFI_SSID = "FZH_N_202";        // <-- Change this!
const char* WIFI_PASSWORD = "25388206"; // <-- Change this!

// Server URL - Change to your computer's IP when testing locally
// Example: "http://192.168.1.100:3000/api/sensor-data"
// For Vercel deployment: "https://your-app.vercel.app/api/sensor-data"
const char* SERVER_URL = "https://emganalyzer.vercel.app/api/sensor-data"; // <-- Change this!

// How often to send data (in milliseconds)
const int SEND_INTERVAL = 500;  // 500ms = 2 times per second

// EMG Sensor Pin (ADC)
const int EMG_PIN = 34;  // GPIO 34 for real EMG sensor

// Use mock data for testing (set to false when using real sensor)
const bool USE_MOCK_DATA = true;

// ============================================
// Variables
// ============================================
unsigned long lastSendTime = 0;
float emgPhase = 0;  // For generating realistic EMG waves (mock mode)

// LED for status indication (built-in LED on most ESP32 boards)
const int LED_PIN = 2;

// ============================================
// SETUP FUNCTION
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("   EMG Analyzer - Raw EMG Only");
  Serial.println("========================================");
  Serial.println();
  
  if (USE_MOCK_DATA) {
    Serial.println("MODE: Mock Data (for testing)");
  } else {
    Serial.println("MODE: Real EMG Sensor");
    Serial.print("EMG Pin: GPIO ");
    Serial.println(EMG_PIN);
  }
  Serial.println();
  
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  if (!USE_MOCK_DATA) {
    pinMode(EMG_PIN, INPUT);
  }
  
  connectToWiFi();
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
    
    int emgValue;
    if (USE_MOCK_DATA) {
      emgValue = generateMockEMG();
    } else {
      emgValue = analogRead(EMG_PIN);
    }
    
    sendEMGData(emgValue);
    
    if (USE_MOCK_DATA) {
      emgPhase += 0.3;
    }
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
    Serial.println("Please check your credentials and try again.");
    digitalWrite(LED_PIN, LOW);
  }
}

// ============================================
// Mock EMG Data Generation (for testing)
// ============================================
int generateMockEMG() {
  float baseWave = sin(emgPhase) * 800;
  float tremor = sin(emgPhase * 5) * 200;
  float noise = random(-150, 150);
  
  int emgValue = 2048 + (int)(baseWave + tremor + noise);
  emgValue = constrain(emgValue, 0, 4095);
  
  return emgValue;
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
  
  Serial.print("Sending: ");
  Serial.println(jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Response (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);
    
    digitalWrite(LED_PIN, LOW);
    delay(50);
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.print("Error sending data! Code: ");
    Serial.print(httpResponseCode);
    Serial.print(" (");
    Serial.print(HTTPClient::errorToString(httpResponseCode));
    Serial.println(")");
    
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
  }
  
  http.end();
  Serial.println("---");
}

/*
 * ============================================
 * TROUBLESHOOTING TIPS
 * ============================================
 * 
 * 1. "WiFi not connecting"
 *    - Double-check SSID and password (case-sensitive!)
 *    - Make sure you're using 2.4GHz WiFi (ESP32 doesn't support 5GHz)
 * 
 * 2. "Error sending data"
 *    - Make sure the server is running (npm run dev)
 *    - Check that SERVER_URL is correct
 *    - If testing locally, use your computer's local IP (not localhost)
 * 
 * 3. "Using Real EMG Sensor"
 *    - Set USE_MOCK_DATA to false
 *    - Connect EMG sensor output to GPIO 34
 *    - Make sure sensor has proper power supply
 */
