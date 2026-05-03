/*
 * ============================================
 * EMG Analyzer - ESP32 Real Sensor Code
 * ============================================
 * 
 * This code reads from actual sensors:
 * - EMG sensor connected to GPIO 34 (analog input)
 * - MPU6050 accelerometer via I2C (SDA=21, SCL=22)
 * 
 * Wiring Diagram:
 * 
 * EMG Sensor:
 *   VCC  --> 3.3V
 *   GND  --> GND
 *   OUT  --> GPIO 34
 * 
 * MPU6050:
 *   VCC  --> 3.3V (or 5V if module has regulator)
 *   GND  --> GND
 *   SDA  --> GPIO 21
 *   SCL  --> GPIO 22
 * 
 * Required Libraries:
 * - ArduinoJson (by Benoit Blanchon) - Install via Library Manager
 * - Adafruit MPU6050 - Install via Library Manager
 * - Adafruit Unified Sensor - Install via Library Manager
 * 
 * Author: EMG Analyzer Project
 * License: MIT
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

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
// MPU6050 Object
// ============================================
Adafruit_MPU6050 mpu;
bool mpuInitialized = false;

// ============================================
// Timing
// ============================================
unsigned long lastSendTime = 0;

// ============================================
// SETUP FUNCTION
// ============================================
void setup() {
  // Start Serial communication
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("   EMG Analyzer - Real Sensor Mode");
  Serial.println("========================================");
  Serial.println();
  
  // Setup pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(EMG_PIN, INPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize I2C for MPU6050
  Wire.begin(21, 22);  // SDA = 21, SCL = 22 (default ESP32 I2C pins)
  
  // Initialize MPU6050
  initializeMPU6050();
  
  // Connect to WiFi
  connectToWiFi();
  
  Serial.println("Setup complete! Starting data transmission...");
  Serial.println();
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  // Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectToWiFi();
  }
  
  // Check if it's time to send data
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    
    // Read EMG sensor
    int emgValue = readEMG();
    
    // Read MPU6050 accelerometer
    float ax, ay, az;
    readAccelerometer(&ax, &ay, &az);
    
    // Send data to server
    sendSensorData(emgValue, ax, ay, az);
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
// Initialize MPU6050 Sensor
// ============================================
void initializeMPU6050() {
  Serial.println("Initializing MPU6050...");
  
  if (!mpu.begin()) {
    Serial.println("ERROR: Failed to find MPU6050!");
    Serial.println("Check wiring: SDA->21, SCL->22, VCC->3.3V, GND->GND");
    Serial.println("Continuing without MPU6050 (will send zeros)...");
    mpuInitialized = false;
    return;
  }
  
  // Configure MPU6050 settings
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);  // ±8g range
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);       // ±500 deg/s
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);    // Low-pass filter
  
  mpuInitialized = true;
  Serial.println("MPU6050 initialized successfully!");
  Serial.print("  Accelerometer range: ±8g");
  Serial.println();
}

// ============================================
// Read EMG Sensor
// ============================================
int readEMG() {
  // Read analog value (0-4095 for 12-bit ADC)
  int rawValue = analogRead(EMG_PIN);
  
  // Optional: Apply simple moving average filter
  // Uncomment if you want smoother readings:
  /*
  static int readings[10] = {0};
  static int readIndex = 0;
  static int total = 0;
  
  total -= readings[readIndex];
  readings[readIndex] = rawValue;
  total += readings[readIndex];
  readIndex = (readIndex + 1) % 10;
  
  return total / 10;
  */
  
  return rawValue;
}

// ============================================
// Read Accelerometer Data
// ============================================
void readAccelerometer(float* ax, float* ay, float* az) {
  if (!mpuInitialized) {
    // Return zeros if MPU6050 is not available
    *ax = 0.0;
    *ay = 0.0;
    *az = 0.0;
    return;
  }
  
  // Get sensor events
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  // Acceleration values in m/s² (divide by 9.81 to get g)
  *ax = a.acceleration.x / 9.81;
  *ay = a.acceleration.y / 9.81;
  *az = a.acceleration.z / 9.81;
}

// ============================================
// Send Data to Server
// ============================================
void sendSensorData(int emg, float ax, float ay, float az) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["emg"] = emg;
  doc["ax"] = ax;
  doc["ay"] = ay;
  doc["az"] = az;
  doc["timestamp"] = millis();
  
  // Serialize JSON
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Print to Serial for debugging
  Serial.print("Sending: EMG=");
  Serial.print(emg);
  Serial.print(" Ax=");
  Serial.print(ax, 2);
  Serial.print(" Ay=");
  Serial.print(ay, 2);
  Serial.print(" Az=");
  Serial.println(az, 2);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.print("OK (");
    Serial.print(httpResponseCode);
    Serial.println(")");
    
    // Quick LED blink for success
    digitalWrite(LED_PIN, LOW);
    delay(30);
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.print("FAILED! Code: ");
    Serial.print(httpResponseCode);
    Serial.print(" (");
    Serial.print(HTTPClient::errorToString(httpResponseCode));
    Serial.println(")");
    Serial.println("Hint: check SERVER_URL = PC LAN IP + port from `npm run dev` (not localhost).");
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
 * - GPIO 21: Default SDA (I2C Data)
 * - GPIO 22: Default SCL (I2C Clock)
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
 * MPU6050:
 * +--------+     +---------+
 * | MPU6050|     | ESP32   |
 * |--------|     |---------|
 * | VCC    |---->| 3.3V    |
 * | GND    |---->| GND     |
 * | SDA    |---->| GPIO 21 |
 * | SCL    |---->| GPIO 22 |
 * +--------+     +---------+
 * 
 * ============================================
 * TROUBLESHOOTING
 * ============================================
 * 
 * "MPU6050 not found":
 *   - Check I2C wiring (SDA, SCL)
 *   - Verify power supply (3.3V or 5V depending on module)
 *   - Try scanning I2C addresses with I2C scanner sketch
 * 
 * "EMG readings stuck at 0 or 4095":
 *   - Check EMG sensor power
 *   - Verify GPIO 34 connection
 *   - Make sure electrodes are properly placed
 * 
 * "Noisy EMG readings":
 *   - Enable the moving average filter in readEMG()
 *   - Check electrode placement and skin preparation
 *   - Keep wires away from power sources
 * 
 * "Data not appearing on website":
 *   - Verify SERVER_URL is correct
 *   - Check that both ESP32 and server are on same network
 *   - Look at Serial Monitor for error messages
 */
