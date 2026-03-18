# Server Deck: Fyzické rozhraní pro správu serveru

## Téma projektu
Ovládácí panel, který má sloužit jako fyzické rozhraní pro správu a zobrazení stavu PC (například rychlý restart serveru, nebo zobrazení teplot).

Systém propojuje centrální serverovou aplikaci (Web Dashboard) s fyzickými ovládacími prvky pomocí mikrokontrolerů , které zajišťují detekci uživatelského vstupu, sběr dat a měření.

## 3 Featury (Hlavní funkce)

### 1. Spouštěč příkazů
Systém na základě fyzického vstupu na jednom z MCU odesílá zprávy na server kde script na základě správ spouští scripty. Bude se jednat o několik předdefinovaných funkcí.

* **Funkcionalita:** Uživatel může přímo z panelu resetovat síťové rozhraní, bezpečně vypnout systém (shutdown) nebo spustit diagnostický skript. Displej poskytuje okamžitou zpětnou vazbu o úspěšnosti akce.

### 2. Monitorování a analýza dat
Měření hodnot, které budou užité ke kontrole ideálních podmínek a měření trendů.

* **Funkcionalita:** Uživatel na webovém dashboardu nastaví prahové hodnoty (např. "Teplota > 40°C"). Pokud tuto hodnotu překročí měřená hodnota MCU tuto informaci pošle do SBC.

### 3. Editace panelu
Možnost editace zobrazovaných funkcí na displeji panelu.
* **Funkcionalita:** Pomocí zkratky na rotačním enkodéru si uživatel bude moci vybrat jaké funkce uvidí a jaké ne.
    Zárověň zde bude možnost zobrazit si aktuální data naměřená na druhém MCU

## 2 Stretch goaly 

### 1. Wake-on-LAN
Vzdálené zapínání zařízení.
* **Popis:** V menu ovládacího panelu přibude možnost "Wake Device". Po aktivaci systém odešle po síti tzv. *Magic Packet* na nastavenou MAC adresu, čímž na dálku probudí jiné zařízení v síti.

### 2. Prevence náhodného stisknutí
* **Popis:** Proti například nechtěnému vypnutí PC je potřeba zadat sekvenci vstupů pro potvrzení.


## Flash MCU z webu

Webové rozhraní umožňuje nahrát MicroPython kód přímo na připojené MCU přes USB.

### Prerekvizity

```bash
pip install mpremote
```

### Jak to funguje

1. V **detailu MCU** klikni na ⚡ (Flash)
2. Vyber **USB port** (Pico se automaticky rozpozná)
3. Zadej **WiFi SSID a heslo**
4. Vyber **šablonu** (.py soubor s placeholdery) nebo nahraj vlastní
5. Klikni **Flashnout** — server vygeneruje kód a nahraje ho na MCU přes `mpremote`

### Formát šablony

Šablona je běžný MicroPython `.py` soubor, kde konfigurovatelné hodnoty jsou nahrazeny placeholdery ve formátu `{{NAZEV}}`. Při flashování se automaticky doplní z konfigurace MCU a zadaných údajů.

#### Dostupné placeholdery

| Placeholder | Zdroj | Popis |
|---|---|---|
| `{{WIFI_SSID}}` | Flash modal | Název WiFi sítě |
| `{{WIFI_PASS}}` | Flash modal | Heslo WiFi sítě |
| `{{MQTT_BROKER}}` | Nastavení (settings) | IP adresa MQTT brokeru |
| `{{MQTT_PORT}}` | Výchozí: 1883 | Port MQTT brokeru |
| `{{API_KEY}}` | MCU záznam v DB | API klíč zařízení |
| `{{STATIC_IP}}` | MCU záznam v DB | Statická IP adresa zařízení |
| `{{SUBNET}}` | Flash modal / výchozí | Maska podsítě (výchozí: 255.255.255.0) |
| `{{GATEWAY}}` | Flash modal / výchozí | Výchozí brána (výchozí: 192.168.1.1) |
| `{{DNS}}` | Flash modal / výchozí | DNS server (výchozí: 192.168.1.1) |
| `{{DEVICE_NAME}}` | MCU záznam v DB | Název zařízení |
| `{{MAC_ADDRESS}}` | MCU záznam v DB | MAC adresa zařízení |
| `{{PUBLISH_INTERVAL}}` | Výchozí: 5 | Interval odesílání dat (sekundy) |

#### Vzorová šablona (DHT11 senzor)

```python
import network
import time
import machine
import dht
import ubinascii
import json
from umqtt.simple import MQTTClient
import gc

# --- KONFIGURACE (generovano z IoT Control) ---
WIFI_SSID = "{{WIFI_SSID}}"
WIFI_PASS = "{{WIFI_PASS}}"
MQTT_BROKER = "{{MQTT_BROKER}}"
MQTT_PORT = {{MQTT_PORT}}
API_KEY = "{{API_KEY}}"
PUBLISH_INTERVAL = {{PUBLISH_INTERVAL}}

# --- STATICKA IP ---
STATIC_IP = "{{STATIC_IP}}"
SUBNET = "{{SUBNET}}"
GATEWAY = "{{GATEWAY}}"
DNS = "{{DNS}}"

# --- HW ---
sensor = dht.DHT11(machine.Pin(14))
CLIENT_ID = ubinascii.hexlify(machine.unique_id()).decode()

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if STATIC_IP:
        wlan.ifconfig((STATIC_IP, SUBNET, GATEWAY, DNS))
    wlan.connect(WIFI_SSID, WIFI_PASS)
    for _ in range(40):
        if wlan.isconnected():
            return True
        time.sleep(0.5)
    return False

def connect_mqtt():
    client = MQTTClient(CLIENT_ID, MQTT_BROKER, port=MQTT_PORT, keepalive=30)
    client.connect()
    return client

def loop():
    client = None
    while True:
        if client is None:
            if not connect_wifi():
                time.sleep(10); continue
            client = connect_mqtt()
            if client is None:
                time.sleep(5); continue

        try:
            sensor.measure()
            mac = ubinascii.hexlify(network.WLAN().config('mac'), ':').decode()
            payload = json.dumps({
                "apiKey": API_KEY,
                "temp": sensor.temperature(),
                "hum": sensor.humidity(),
                "mac": mac
            })
            client.publish("sensor/data", payload)
        except:
            client = None

        gc.collect()
        time.sleep(PUBLISH_INTERVAL)

loop()
```

### Hotové šablony

V adresáři `MCUs/` jsou připravené šablony:

| Soubor | Popis |
|---|---|
| `MCUs/DHT11/MQTTsensors.template.py` | DHT11 senzor s MQTT (plný debug) |
| `MCUs/Dashboard/dashboard.template.py` | OLED dashboard s enkodérem |

Šablony nahraj přes flash modal (tlačítko "Nahrát novou šablonu") nebo je ručně zkopíruj do `SBCWeb/data/templates/`.

---

## Seznam součástek

### Centrální jednotka (SBC)
* **1x Raspberry Pi 4 Model B**
    * *Funkce:* Backend (Node.js), Webserver, Databáze.
  
### Mikrokontrolery (MCU)
* **1x Raspberry Pi Pico W** (Uživatelský vstup)
    * *Komunikace:* Bezdrátově (Wi-Fi) s SBC.
* **1x Raspberry Pi Pico** (Senzory)
    * *Komunikace:* Sériová linka (UART/USB) s SBC.

### Periferie
* **1x OLED Displej 0.96"** (rozlišení 128x64 px)
    * *Sběrnice:* I2C.
* **1x Rotační enkodér**
* **1x Senzor teploty a vlhkosti (DHT11)**
* **3x Tlačítka**    
