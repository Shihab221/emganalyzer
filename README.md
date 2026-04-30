# EMG Analyzer 🧠⚡

A beautiful, real-time EMG and motion sensor data visualization dashboard built with Next.js 14, TypeScript, and Tailwind CSS. Features glassmorphism design with dark/light mode support.

![EMG Analyzer Dashboard](https://via.placeholder.com/800x400?text=EMG+Analyzer+Dashboard)

## ✨ Features

- **Real-time Data Visualization** - Live charts for EMG and 3-axis accelerometer data
- **Beautiful Glassmorphism UI** - Modern frosted glass design with smooth animations
- **Dark/Light Mode** - Automatic theme switching with manual toggle
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **ESP32 Integration** - Ready-to-use Arduino code for ESP32 microcontroller
- **Easy Setup** - Well-documented code with helpful comments

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- ESP32 board (for hardware integration)
- Arduino IDE (for uploading ESP32 code)

### 1. Install Dependencies

```bash
cd emganalyzer
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Test with Mock Data (Recommended First Step!)

Before connecting real hardware, test with mock data:

1. Open `esp32/emg_analyzer_mock.ino` in Arduino IDE
2. Install required libraries:
   - `ArduinoJson` (by Benoit Blanchon)
3. Update the configuration:
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* SERVER_URL = "http://YOUR_COMPUTER_IP:3000/api/sensor-data";
   ```
4. Find your computer's IP address:
   - Windows: Open CMD, type `ipconfig`
   - Mac/Linux: Open Terminal, type `ifconfig` or `ip addr`
5. Upload to ESP32
6. Open Serial Monitor (115200 baud) to see status
7. Watch the dashboard update in real-time!

## 📁 Project Structure

```
emganalyzer/
├── app/
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Main dashboard page
│   ├── globals.css         # Global styles & glassmorphism
│   └── api/
│       └── sensor-data/
│           └── route.ts    # API endpoint for ESP32
├── components/
│   ├── Header.tsx          # App header with logo
│   ├── ThemeToggle.tsx     # Dark/light mode switch
│   ├── ThemeProvider.tsx   # Theme context provider
│   ├── SensorCard.tsx      # Individual sensor value cards
│   ├── EMGChart.tsx        # EMG signal line chart
│   └── MPUChart.tsx        # Accelerometer multi-line chart
├── lib/
│   └── types.ts            # TypeScript type definitions
├── esp32/
│   ├── emg_analyzer_mock.ino   # Mock data code (test first!)
│   └── emg_analyzer_real.ino   # Real sensor code
└── ...config files
```

## 🔧 Hardware Setup

### Components Needed

- ESP32 Development Board
- EMG Sensor (MyoWare, AD8232, or similar)
- MPU6050 Accelerometer/Gyroscope Module
- Jumper wires
- Breadboard (optional)

### Wiring Diagram

```
┌─────────────┐     ┌─────────────┐
│ EMG Sensor  │     │   ESP32     │
├─────────────┤     ├─────────────┤
│ VCC         │────▶│ 3.3V        │
│ GND         │────▶│ GND         │
│ OUTPUT      │────▶│ GPIO 34     │
└─────────────┘     │             │
                    │             │
┌─────────────┐     │             │
│  MPU6050    │     │             │
├─────────────┤     │             │
│ VCC         │────▶│ 3.3V        │
│ GND         │────▶│ GND         │
│ SDA         │────▶│ GPIO 21     │
│ SCL         │────▶│ GPIO 22     │
└─────────────┘     └─────────────┘
```

### Required Arduino Libraries

Install these via Arduino Library Manager:

1. **ArduinoJson** by Benoit Blanchon
2. **Adafruit MPU6050** by Adafruit
3. **Adafruit Unified Sensor** by Adafruit

## 🌐 API Reference

### POST /api/sensor-data

Receives sensor data from ESP32.

**Request Body:**
```json
{
  "emg": 2456,
  "ax": 0.45,
  "ay": -1.23,
  "az": 9.81,
  "timestamp": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data received successfully"
}
```

### GET /api/sensor-data

Returns latest data and history for charts.

**Response:**
```json
{
  "success": true,
  "latest": {
    "emg": 2456,
    "ax": 0.45,
    "ay": -1.23,
    "az": 9.81,
    "timestamp": 123456789
  },
  "history": [
    { "emg": 2400, "ax": 0.40, ... },
    { "emg": 2456, "ax": 0.45, ... }
  ]
}
```

## 🚀 Deployment to Vercel

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Deploy! Vercel will automatically detect Next.js

4. Update your ESP32 code with the Vercel URL:
   ```cpp
   const char* SERVER_URL = "https://your-app.vercel.app/api/sensor-data";
   ```

## 🎨 Customization

### Changing Colors

Edit `app/globals.css` to modify the color scheme:

```css
:root {
  --chart-emg: #ef4444;    /* Red for EMG */
  --chart-ax: #3b82f6;     /* Blue for X axis */
  --chart-ay: #22c55e;     /* Green for Y axis */
  --chart-az: #f59e0b;     /* Amber for Z axis */
}
```

### Changing Update Interval

In `app/page.tsx`, modify the polling interval:
```typescript
const interval = setInterval(fetchData, 400); // Change 400 to desired ms
```

In ESP32 code:
```cpp
const int SEND_INTERVAL = 500; // Change to desired ms
```

## 🐛 Troubleshooting

### Dashboard shows "Waiting for ESP32"

- Make sure ESP32 is connected to WiFi (check Serial Monitor)
- Verify SERVER_URL matches your server address
- If testing locally, use your computer's IP (not localhost)
- Check that both ESP32 and computer are on the same network

### ESP32 "Error sending data"

- Verify the Next.js server is running (`npm run dev`)
- Check the URL format: `http://IP:3000/api/sensor-data`
- Make sure no firewall is blocking port 3000

### Charts not updating smoothly

- Reduce polling interval for faster updates
- Check network latency
- Ensure ESP32 is sending data every 500ms

### MPU6050 not detected

- Check I2C wiring (SDA to GPIO 21, SCL to GPIO 22)
- Verify MPU6050 is powered (VCC to 3.3V or 5V)
- Run I2C scanner sketch to find the device

## 📝 License

MIT License - feel free to use this project for learning and building!

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

Built with ❤️ using Next.js, TypeScript, Tailwind CSS, and Recharts
