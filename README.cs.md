# Server Deck: Fyzické rozhraní pro správu serveru

Ovládací panel, který slouží jako fyzické rozhraní pro správu a zobrazení stavu serveru.
Systém propojuje webový dashboard s fyzickými ovládacími prvky pomocí mikrokontrolerů, které zajišťují uživatelský vstup, sběr dat a měření.

> English version: [README.md](README.md)

---

## Hlavní funkce

### 1. Spouštěč příkazů
Uživatel může přímo z fyzického panelu resetovat síťové rozhraní, bezpečně vypnout systém nebo spustit diagnostický skript. Displej poskytuje okamžitou zpětnou vazbu o výsledku akce.

### 2. Monitorování a analýza dat
MCU měří teplotu a vlhkost vzduchu a odesílá data na server přes MQTT. Uživatel může na webovém dashboardu nastavit prahové hodnoty (např. "Teplota > 40°C") a sledovat trendy.

### 3. Editace panelu
Pomocí rotačního enkodéru si uživatel může vybrat, které funkce se zobrazí na OLED displeji, a zobrazit aktuální data naměřená senzorem.

### Stretch goaly
- **Wake-on-LAN** — vzdálené zapnutí zařízení odesláním Magic Packet na nastavenou MAC adresu
- **Prevence náhodného stisknutí** — potvrzovací sekvence pro nebezpečné akce (např. shutdown)

---

## Použité technologie

### Server (SBC)
| Technologie | Účel |
|---|---|
| Node.js + Express | Webový server a REST API |
| EJS | Server-side šablony |
| SQLite (better-sqlite3) | Databáze (zařízení, telemetrie, nastavení) |
| MQTT (mqtt.js) | Komunikace se zařízeními |
| Socket.io | Real-time aktualizace v prohlížeči |
| Tailwind CSS | Stylování UI |
| Web Serial API | Flashování MCU přes USB přímo z prohlížeče |

### MCU
| Technologie | Účel |
|---|---|
| MicroPython | Firmware pro Raspberry Pi Pico / Pico W |
| umqtt.simple | MQTT klient na MCU |
| ssd1306 | Ovladač OLED displeje |

### Hardware
| Součástka | Počet | Funkce |
|---|---|---|
| Raspberry Pi 4 Model B | 1x | SBC — server, databáze, webserver |
| Raspberry Pi Pico W | 1x | Dashboard panel (OLED, enkodér, tlačítka) |
| Raspberry Pi Pico | 1x | Senzorový uzel (DHT11) |
| OLED displej 0.96" (128×64, I2C) | 1x | Zobrazení dat a menu |
| Rotační enkodér | 1x | Navigace v menu |
| DHT11 | 1x | Měření teploty a vlhkosti |
| Tlačítka | 3x | Hardwarové zkratky |

---

## Jak funguje autentizace zařízení

Každé MCU má přiřazený unikátní **API klíč** a **MAC adresu** uloženou v databázi. Server přijímá zprávy ze všech MQTT topiců, ale každou zprávu filtruje podle těchto dvou identifikátorů:

- `sensor/data` — payload musí obsahovat `apiKey` odpovídající záznamu v DB; server spáruje data se správným kanálem a zařízením
- `dashboard/.../config` — topicy jsou adresovány přímo přes API klíč zařízení (`dashboard/{apiKey}/...`)
- Při registraci MCU se MAC adresa ověří oproti DB záznamu; nespárované zprávy jsou ignorovány

Díky tomu může na jedné MQTT síti běžet libovolný počet MCU bez toho, aby si navzájem přepisovala data.

---

## Instalace

### Požadavky
- Node.js v16+
- npm v7+
- Mosquitto (MQTT broker)
- Chrome nebo Edge (pro flashování MCU přes Web Serial API)

### 1. Klonování repozitáře

```bash
git clone <repository-url>
cd projekt-iot-sk1-white/SBCWeb
```

### 2. Instalace závislostí

```bash
npm install
```

### 3. Konfigurace prostředí

```bash
cp .env.example .env
```

Uprav `.env` dle svého prostředí — klíčové hodnoty:

```env
SERVER_PORT=3000
MQTT_BROKER_IP=127.0.0.1
MQTT_BROKER_PORT=1883
```

### 4. Spuštění MQTT brokeru

```bash
mosquitto
```

Pokud Mosquitto naslouchá jen na localhostu, přidej do `/etc/mosquitto/mosquitto.conf`:
```
listener 1883 0.0.0.0
allow_anonymous true
```

### 5. Spuštění serveru

```bash
npm start
```

Server se spustí na `http://localhost:3000`.
Výchozí přihlášení: `admin` / `admin` — systém při prvním přihlášení vyzve ke změně hesla.

---

## Flashování MCU

Webové rozhraní umožňuje nahrát MicroPython kód přímo na Pico přes USB bez jakékoli instalace.

1. V **detailu MCU** klikni na ⚡ (Flash)
2. Připoj Pico přes USB a klikni **Připojit USB**
3. Zadej **WiFi SSID a heslo**
4. Vyber **šablonu** nebo nahraj vlastní `.py` soubor
5. Klikni **Flashnout**

Šablony jsou MicroPython `.py` soubory s placeholdery ve formátu `{{NAZEV}}` (např. `{{WIFI_SSID}}`, `{{API_KEY}}`), které se automaticky vyplní při flashování.

Připravené šablony jsou v adresáři `MCUs/` nebo je nahraj přes tlačítko "Nahrát novou šablonu" v UI.
