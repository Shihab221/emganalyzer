/*
 * ============================================
 * EMG Analyzer - ESP32 Mock Data Code
 * ============================================
 * 
 * Use this code FIRST to test your setup!
 * It sends realistic mock sensor data to the server
 * without needing actual sensors connected.
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
const char* WIFI_SSID = "YOUR_WIFI_NAME";        // <-- Change this!
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // <-- Change this!

// Server URL - Change to your computer's IP when testing locally
// Example: "http://192.168.1.100:3000/api/sensor-data"
// For Vercel deployment: "https://your-app.vercel.app/api/sensor-data"
const char* SERVER_URL = "http://192.168.1.100:3000/api/sensor-data"; // <-- Change this!

// How often to send data (in milliseconds)
const int SEND_INTERVAL = 500;  // 500ms = 2 times per second

// ============================================
// Variables for mock data generation
// ============================================
unsigned long lastSendTime = 0;
float emgPhase = 0;      // For generating realistic EMG waves
float motionPhase = 0;   // For generating motion patterns

// LED for status indication (built-in LED on most ESP32 boards)
const int LED_PIN = 2;

// ============================================
// SETUP FUNCTION
// Runs once when ESP32 starts
// ============================================
void setup() {
  // Start Serial communication for debugging
  Serial.begin(115200);
  delay(1000);  // Wait for serial to initialize
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("   EMG Analyzer - Mock Data Mode");
  Serial.println("========================================");
  Serial.println();
  
  // Setup LED pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Connect to WiFi
  connectToWiFi();
}

// ============================================
// MAIN LOOP
// Runs continuously after setup
// ============================================
void loop() {
  // Check if WiFi is still connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectToWiFi();
  }
  
  // Check if it's time to send data
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    
    // Generate mock sensor data
    int emgValue = generateMockEMG();
    float ax = generateMockAccelX();
    float ay = generateMockAccelY();
    float az = generateMockAccelZ();
    
    // Send data to server
    sendSensorData(emgValue, ax, ay, az);
    
    // Update phases for next iteration
    emgPhase += 0.3;
    motionPhase += 0.1;
  }
}

// ============================================
// WiFi Connection Function
// ============================================
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Blink LED while connecting
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // Toggle LED
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
    
    digitalWrite(LED_PIN, HIGH);  // LED on = connected
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi!");
    Serial.println("Please check your credentials and try again.");
    digitalWrite(LED_PIN, LOW);
  }
}

// ============================================
// Mock Data Generation Functions
// These create realistic-looking sensor data
// ============================================

// Generate mock EMG data (0-4095 range, like real ADC)
// Creates a wave pattern with some random noise
int generateMockEMG() {
  // Base wave (simulates muscle activity pattern)
  float baseWave = sin(emgPhase) * 800;
  
  // Add some higher frequency components (muscle tremor simulation)
  float tremor = sin(emgPhase * 5) * 200;
  
  // Add random noise (like real EMG signals)
  float noise = random(-150, 150);
  
  // Combine and shift to positive range
  int emgValue = 2048 + (int)(baseWave + tremor + noise);
  
  // Clamp to valid ADC range (0-4095)
  emgValue = constrain(emgValue, 0, 4095);
  
  return emgValue;
}

// Generate mock X-axis acceleration (left/right movement)
float generateMockAccelX() {
  // Gentle swaying motion
  float ax = sin(motionPhase * 0.7) * 0.5;
  ax += (random(-10, 10) / 100.0);  // Small noise
  return ax;
}

// Generate mock Y-axis acceleration (forward/back movement)
float generateMockAccelY() {
  // Different frequency for Y axis
  float ay = cos(motionPhase * 0.5) * 0.3;
  ay += (random(-10, 10) / 100.0);  // Small noise
  return ay;
}

// Generate mock Z-axis acceleration (up/down, includes gravity ~9.81)
float generateMockAccelZ() {
  // Z axis shows gravity plus small movements
  float az = 9.81 + sin(motionPhase * 0.3) * 0.2;
  az += (random(-5, 5) / 100.0);  // Small noise
  return az;
}

// ============================================
// Send Data to Server
// ============================================
void sendSensorData(int emg, float ax, float ay, float az) {
  // Create HTTP client
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["emg"] = emg;
  doc["ax"] = ax;
  doc["ay"] = ay;
  doc["az"] = az;
  doc["timestamp"] = millis();  // Use millis as timestamp
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send POST request
  Serial.print("Sending: ");
  Serial.println(jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  // Check response
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Response (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);
    
    // Blink LED to show successful send
    digitalWrite(LED_PIN, LOW);
    delay(50);
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.print("Error sending data! Code: ");
    Serial.println(httpResponseCode);
    
    // Double blink for error
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
  }
  
  http.end();  // Clean up
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
 *    - Try moving closer to the router
 * 
 * 2. "Error sending data"
 *    - Make sure the server is running (npm run dev)
 *    - Check that SERVER_URL is correct
 *    - If testing locally, use your computer's local IP (not localhost)
 *    - Find your IP: Windows (ipconfig), Mac/Linux (ifconfig)
 * 
 * 3. "Serial Monitor shows garbage"
 *    - Set baud rate to 115200 in Serial Monitor
 * 
 * 4. "LED not blinking"
 *    - Some ESP32 boards have LED on different pins
 *    - Try changing LED_PIN to 5, 13, or check your board docs
 * 
 * ============================================
 * NEXT STEPS
 * ============================================
 * 
 * Once this mock code works:
 * 1. Open the web dashboard and see the charts update
 * 2. Move to the real sensor code (emg_analyzer_real.ino)
 * 3. Connect actual EMG and MPU6050 sensors
 */
