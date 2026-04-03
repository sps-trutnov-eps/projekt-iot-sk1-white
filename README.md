# Server Deck: Physical Interface for Server Management

A web application and physical control panel for managing and monitoring a server's state.
The system connects a web dashboard with physical controls via microcontrollers that handle user input, data collection, and measurements.

> Czech version: [README.cs.md](README.cs.md)

---

## ⚠️ Reviewer Notes

Setup instructions are below. Without physical hardware:
- **Data monitoring** works fully via the virtual MCU simulator (`StartVirtualPico.bat` / `StartVirtualPico.sh`)
- **Command Launcher** can be tested from the web dashboard; server-side execution requires a Debian VM running `ServerScript/server_script.py`
- **Wake-on-LAN** can be verified via Wireshark — the magic packet is correctly sent
- **OLED deck + rotary encoder** require physical hardware
- **MCU flashing** requires physical hardware with MicroPython pre-installed

---

## Features

### 1. Command Launcher
Trigger server scripts directly from the web dashboard or physical panel — reset the network interface, safely shut down the system, or run a diagnostic script. The OLED display gives immediate feedback on the result.

### 2. Data Monitoring
The MCU measures temperature and humidity and publishes data to the server via MQTT. Users can set threshold values (e.g. "Temperature > 40°C") on the web dashboard and track trends over time.

### 3. Panel Customization
Using the rotary encoder, users can choose which functions appear on the OLED display and view live sensor readings.

### Stretch Goals
- **Wake-on-LAN** — remotely power on a device by sending a Magic Packet to a configured MAC address
- **Accidental press prevention** — confirmation sequence required for destructive actions (e.g. shutdown)

---

## Quick Start

### Windows

**Start the dashboard:**
```bat
StartWebServer.bat
```

**Start the virtual MCU simulator** (no hardware needed):
```bat
StartVirtualPico.bat
```

Configure the simulator by editing `MCUs/DHT11/.env` (created automatically on first run).

### Linux / Debian

**Start the dashboard:**
```bash
./StartWebServer.sh
```

**Start the virtual MCU simulator:**
```bash
./StartVirtualPico.sh
```

Dashboard starts at `http://localhost:3000` — default login: `admin` / `admin`

> If the virtual Pico runs on a **different machine** than the server, set `BROKER_IP` in `MCUs/DHT11/.env` to the server's IP address, and ensure Mosquitto is configured to accept external connections (see [Mosquitto setup](#4-start-mqtt-broker)).

---

## How Device Authentication Works

Each MCU is assigned a unique **API key** and **MAC address** stored in the database. The server accepts messages from all MQTT topics but filters each message by these two identifiers:

- `sensor/data` — payload must contain an `apiKey` matching a DB record; the server routes data to the correct channel and device
- `dashboard/.../config` — topics are addressed directly via the device's API key (`dashboard/{apiKey}/...`)
- On MCU registration, the MAC address is verified against the DB record; unmatched messages are ignored

This allows any number of MCUs to run on the same MQTT network without overwriting each other's data.

---

## Tech Stack

### Server (SBC)
| Technology | Purpose |
|---|---|
| Node.js + Express | Web server and REST API |
| EJS | Server-side templating |
| SQLite (better-sqlite3) | Database (devices, telemetry, settings) |
| MQTT (mqtt.js) | Communication with devices |
| Socket.io | Real-time browser updates |
| Tailwind CSS | UI styling |
| Web Serial API | Flash MCU over USB directly from the browser |

### MCU
| Technology | Purpose |
|---|---|
| MicroPython | Firmware for Raspberry Pi Pico / Pico W |
| umqtt.simple | MQTT client on MCU |
| ssd1306 | OLED display driver |

### Hardware
| Component | Qty | Role |
|---|---|---|
| Server / SBC | 1x | Server, database, webserver |
| Raspberry Pi Pico 2W | 1x | Dashboard panel (OLED, encoder, buttons) |
| Raspberry Pi Pico | 1x | Sensor node (DHT11) |
| OLED display 0.96" (128×64, I2C) | 1x | Display data and menu |
| Rotary encoder | 1x | Menu navigation |
| DHT11 | 1x | Temperature and humidity sensor |
| Push buttons | 3x | Hardware shortcuts |

---

## Manual Installation

### Requirements
- Node.js v16+
- npm v7+
- Mosquitto (MQTT broker)
- Chrome or Edge (for MCU flashing via Web Serial API)

### 1. Clone the repository

```bash
git clone <repository-url>
cd projekt-iot-sk1-white/SBCWeb
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` for your environment — key values:

```env
SERVER_PORT=3000
MQTT_BROKER_IP=127.0.0.1
MQTT_BROKER_PORT=1883
```

### 4. Start MQTT broker

```bash
mosquitto
```

If Mosquitto only listens on localhost, add to `/etc/mosquitto/mosquitto.conf`:
```
listener 1883 0.0.0.0
allow_anonymous true
```

### 5. Start the server

```bash
npm start
```

Server starts at `http://localhost:3000`.
Default login: `admin` / `admin` — you'll be prompted to change the password on first login.

---

## Virtual MCU Simulator

To simulate sensor data without physical hardware:

### Windows
```bat
StartVirtualPico.bat
```

### Linux
```bash
./StartVirtualPico.sh
```

Configure `MCUs/DHT11/.env`:
```env
BROKER_IP=127.0.0.1
BROKER_PORT=1883
API_KEY=your_api_key_here
MAC=AA:AA:AA:AA:AA:AA
```

Get the API key from the dashboard after creating an MCU entry.

---

## Flashing MCU

The web interface lets you upload MicroPython code directly to a Pico over USB — no additional software needed.

1. Open the **MCU detail** page and click ⚡ (Flash)
2. Connect the Pico via USB and click **Connect USB**
3. Enter your **WiFi SSID and password**
4. Select a **template** or upload your own `.py` file
5. Click **Flash**

Templates are MicroPython `.py` files with placeholders in `{{NAME}}` format (e.g. `{{WIFI_SSID}}`, `{{API_KEY}}`), automatically filled in during flashing.

Pre-built templates are in the `MCUs/` directory, or upload your own via the "Upload new template" button in the UI.