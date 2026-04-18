# Server Deck: Fyzické rozhraní pro správu serveru

Ovládací panel, který slouží jako fyzické rozhraní pro správu a zobrazení stavu serveru.
Systém propojuje webový dashboard s fyzickými ovládacími prvky pomocí mikrokontrolerů, které zajišťují uživatelský vstup, sběr dat a měření.

> English version: [README.md](README.md)

---

## 🌐 Live demo na Renderu

Reviewer-friendly demo verze žije na branchi [`demo-render`](../../tree/demo-render) — bez MQTT, bez HW, bez instalace.

**Vlastní deploy (zdarma):**
1. Forkni repo, pushni branch `demo-render`
2. Na [render.com](https://render.com) vytvoř Web Service ze svého forku — Render si přečte [render.yaml](render.yaml)
3. Po buildu otevři URL, přihlaš se `admin` / `admin`

**Co v demo módu funguje (`DEMO_MODE=1`):**
- ✅ Každý návštěvník dostane vlastní in-memory SQLite naseedovanou demo MCU/senzory/serverem/příkazy/prahy + 24h historických měření
- ✅ Per-session ticker generuje simulovaná DHT11 data každých 10s (live grafy, prahové alerty)
- ✅ Spouštěč příkazů a Wake-on-LAN vrací mockované "success" odpovědi s realistickým delayem
- ❌ MQTT broker je úplně přeskočený; flashing MCU, OLED panel, enkodér vyžadují reálný HW

Sessiony se promazávají po 30 min nečinnosti. Free tier Renderu uspí službu po 15 min — první request pak trvá ~30s.

---

## Hlavní funkce

### 1. Spouštěč příkazů
Uživatel může přímo z webového dashboardu nebo fyzického panelu resetovat síťové rozhraní, bezpečně vypnout systém nebo spustit diagnostický skript. Displej poskytuje okamžitou zpětnou vazbu o výsledku akce.

Příkazy vykonává lehký Python agent (`debian_executor.py`) běžící na cílovém Linuxovém stroji. Agent komunikuje s dashboardem přes MQTT, přijímá příkazy z whitelistu, spouští je přes bash a výsledek odesílá zpět v reálném čase.

### 2. Monitorování a analýza dat
MCU měří teplotu a vlhkost vzduchu a odesílá data na server přes MQTT. Uživatel může na webovém dashboardu nastavit prahové hodnoty (např. "Teplota > 40°C") a sledovat trendy.

### 3. Editace panelu
Pomocí rotačního enkodéru si uživatel může vybrat, které funkce se zobrazí na OLED displeji, a zobrazit aktuální data naměřená senzorem.

### 4. Vícejazyčné UI
Dashboard podporuje **češtinu a angličtinu**. Jazyk lze přepnout v nastavení — všechny prvky UI, logy událostí i serverové zprávy se překládají dynamicky.

### Stretch goaly
- **Wake-on-LAN** — vzdálené zapnutí zařízení odesláním Magic Packet na nastavenou MAC adresu
- **Prevence náhodného stisknutí** — potvrzovací sekvence pro nebezpečné akce (např. shutdown)

---

## Rychlý start

### Windows

**Spuštění dashboardu:**
```bat
StartWebServer.bat
```

**Spuštění virtuálního MCU simulátoru** (bez hardwaru):
```bat
StartVirtualPico.bat
```

Simulátor se konfiguruje úpravou `MCUs/DHT11/.env` (vytvoří se automaticky při prvním spuštění).

### Linux / Debian

**Spuštění dashboardu:**
```bash
./StartWebServer.sh
```

**Spuštění virtuálního MCU simulátoru:**
```bash
./StartVirtualPico.sh
```

**Spuštění server agenta** (na stroji, který chceš ovládat):
```bash
./StartLinuxScript.sh
```

Dashboard běží na `http://localhost:3000` — výchozí přihlášení: `admin` / `admin`

> Pokud virtuální Pico běží na **jiném stroji** než server, nastav `BROKER_IP` v `MCUs/DHT11/.env` na IP adresu serveru a zajisti, že Mosquitto přijímá externí připojení (viz [Mosquitto setup](#4-spuštění-mqtt-brokeru)).

---

## Jak funguje autentizace zařízení

Každé MCU má přiřazený unikátní **API klíč** a **MAC adresu** uloženou v databázi. Server přijímá zprávy ze všech MQTT topiců, ale každou zprávu filtruje podle těchto dvou identifikátorů:

- `sensor/data` — payload musí obsahovat `apiKey` odpovídající záznamu v DB; server spáruje data se správným kanálem a zařízením
- `dashboard/.../config` — topicy jsou adresovány přímo přes API klíč zařízení (`dashboard/{apiKey}/...`)
- Při registraci MCU se MAC adresa ověří oproti DB záznamu; nespárované zprávy jsou ignorovány

Díky tomu může na jedné MQTT síti běžet libovolný počet MCU bez toho, aby si navzájem přepisovala data.

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
| i18next | Vícejazyčné UI (čeština / angličtina) |

### Server Agent
| Technologie | Účel |
|---|---|
| Python 3 | Runtime |
| paho-mqtt | MQTT klient |
| subprocess + bash | Spouštění příkazů |

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

## Instalace

### Požadavky
- Node.js v16+
- npm v7+
- Mosquitto (MQTT broker)
- Chrome nebo Edge (pro flashování MCU přes Web Serial API)
- Python 3 + python3-venv (pro server agenta)

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

## Nastavení server agenta

Server agent (`debian_executor.py`) běží na Linuxovém stroji, který chceš ovládat přes Spouštěč příkazů. Připojí se k MQTT brokeru, přijímá příkazy z whitelistu z dashboardu, spouští je a výsledky odesílá zpět.

### 1. Konfigurace IP brokeru

Uprav `ServerScript/debian_executor.py`:
```python
MQTT_BROKER = "192.168.x.x"  # IP stroje s Mosquitto
SERVER_ID = "1"               # Musí odpovídat ID serveru v DB dashboardu
```

### 2. Spuštění agenta

```bash
./StartLinuxScript.sh
```

Skript automaticky:
1. Nainstaluje `python3-venv` pokud chybí (vyžaduje `sudo`)
2. Vytvoří Python virtuální prostředí v `ServerScript/.venv`
3. Nainstaluje `paho-mqtt` ze `ServerScript/requirements.txt`
4. Spustí `debian_executor.py`

Agent se automaticky reconnectuje pokud broker není dostupný.

### 3. Synchronizace příkazů z dashboardu

V dashboardu přejdi na **Detail serveru → Příkazy** a klikni **Synchronizovat**. Tím se whitelist příkazů odešle agentovi přes MQTT.

---

## Virtuální MCU simulátor

Pro simulaci dat senzorů bez fyzického hardwaru:

### Windows
```bat
StartVirtualPico.bat
```

### Linux
```bash
./StartVirtualPico.sh
```

Nakonfiguruj `MCUs/DHT11/.env`:
```env
BROKER_IP=127.0.0.1
BROKER_PORT=1883
API_KEY=your_api_key_here
MAC=AA:AA:AA:AA:AA:AA
```

API klíč získáš z dashboardu po vytvoření záznamu MCU.

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
