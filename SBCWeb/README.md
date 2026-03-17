# Webovýserver dashboardu IoT (projekt-iot-sk1-white)

Centralizovaný webový server pro správu a monitoring IoT zařízení, senzorů, příkazů a wake-on-lan operací.

## Požadavky

- Node.js v16.0.0 nebo novější
- npm v7.0.0 nebo novější
- MQTT Broker (výchozí: `127.0.0.1:1883`)

## Instalace

### 1. Klonování a instalace závislostí

```bash
git clone <repository-url>
cd SBCWeb
npm install
```

### 2. Konfigurace prostředí

Zkopíruj .env.example do `.env`:

```bash
cp .env.example .env
```

Uprav `.env` dle svého prostředí. Klíčové nastavení:

```env
# Server
SERVER_PORT=3000
SERVER_HOST=0.0.0.0
SESSION_SECRET=iot-sk1-white-secret-key-change-in-production

# Database
DATABASE_PATH=./data/telemetry.db

# MQTT Broker
MQTT_BROKER_IP=127.0.0.1
MQTT_BROKER_PORT=1883
MQTT_PUSH_DELAY=500

# Wake-on-LAN
WOL_UDP_PORT=9

# Timeouts
COMMAND_TIMEOUT=30000
SERVER_CHECKER_PING_TIMEOUT=2

# Intervals
MEASUREMENT_AGGREGATION_INTERVAL=60000
```

> **Poznámka**: Intervaly pingu (`mcu_ping_interval`, `server_ping_interval`) se načítají z DB a lze je měnit v UI.

## Prvotní spuštění

### 1. Zajistit MQTT Broker

MQTT broker musí běžet. Pokud jej máš místně:

```bash
mosquitto
```

Pokud je na jiné adrese, uprav `MQTT_BROKER_IP` v `.env`.

### 2. Spuštění serveru

```bash
npm start
```

Server automaticky:
- Inicializuje databázi
- Vytvoří výchozí nastavení a admin uživatele (`admin/admin`)
- Připojí se k MQTT brokeru
- Naslouchá na `http://localhost:3000`

**Při prvním přihlášení:**
- Přihlaš se jako `admin` s heslem `admin`
- Systém tě vyzve ke změně hesla
- Po změně máš přístup do dashboardu

## MQTT Topicy

**Server → Zařízení:**
- `dashboard/config` - Konfigurace a seznam zařízení
- `server/{id}/config` - Whitelist příkazů pro server
- `server/{id}/execute` - Shell příkaz ke spuštění
- `mcu/{id}/command` - Příkaz pro MCU (WOL, atd.)

**Zařízení → Server:**
- `sensor/data` - Data ze senzorů (teplota, vlhkost, atd.)
- `server/{id}/status` - Výsledek vykonaného příkazu
- `mcu/{id}/wol/status` - Výsledek WOL operace
- `dashboard/request/config` - Žádost o konfiguraci od MCU

## Výchozí nastavení v DB

Po prvním spuštění se vytvoří:

| Klíč | Výchozí hodnota | Měnitelné |
|------|-----------------|-----------|
| mqtt_broker_ip | 127.0.0.1 | Ano (UI → Settings) |
| mcu_ping_interval | 30000 ms | Ano (UI → Settings) |
| server_ping_interval | 60000 ms | Ano (UI → Settings) |

## Struktura projektu

```
SBCWeb/
├── .env.example                    # Vzor konfigurací
├── server.js                       # Vstupní bod
├── package.json                    
├── README.md                       
├── data/
│   └── telemetry.db               # SQLite databáza (vytvoří se)
└── src/
    ├── config/
    │   ├── config.js              # Centralizovaná konfigurace
    │   ├── database.js
    │   ├── initDatabase.js
    │   └── seedDatabase.js
    ├── controllers/               # Request handlery
    ├── services/                  # Business logika
    ├── repositories/              # Přístup k DB
    ├── routes/                    # Express routing
    ├── middleware/                # Auth middleware
    ├── sockets/
    │   ├── mqttHandler.js         # MQTT klient
    │   ├── webSocketHandler.js
    │   └── socketService.js
    ├── models/
    ├── public/                    # Frontend (CSS, JS)
    └── views/                     # EJS šablony
```

## Řešení běžných problémů

### Chyba: "MQTT klient není připojen"
- Ověř, že je MQTT broker spuštěn
- Zkontroluj `MQTT_BROKER_IP` a `MQTT_BROKER_PORT` v `.env`
- Zkontroluj logy serveru

### Databáze se nedá vytvořit
- Ověř, že adresář data existuje
- Na Windows: spusť jako administrator

### Server nejspustí na portu 3000
- Změň `SERVER_PORT` v `.env`
- Ověř dostupnost portu: `netstat -an | find ":3000"`













```

`.env.example` už existuje v rootu! `.env.example` už existuje v rootu! 
