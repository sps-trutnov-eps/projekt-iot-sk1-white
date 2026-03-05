# Senzorová Jednotka (MCU 2)

Samostatná jednotka založená na **Raspberry Pi Pico W**, která měří teplotu a vlhkost a odesílá data na centrální server.

## 📂 Soubory v této složce

*   **`MQTTsensors.py`** (Doporučeno): Hlavní skript pro produkci. Měří data a odesílá je přes MQTT protokol na lokální server.
*   **`sensors.py`**: Alternativní verze využívající HTTP POST requesty (např. pro testování s Webhook.site).
*   **`virtualPico.py`**: Python skript pro PC, který simuluje chování Pico W. Generuje náhodná data a posílá je na MQTT broker (vhodné pro ladění serveru bez HW).

## 🔌 Zapojení (Pinout)

| Komponenta | Pin na Komponentě | Pin na Pico (GPIO) |
| :--- | :--- | :--- |
| **DHT11 Senzor** | DATA / OUT | **GP14** |
| | VCC | 3.3V |
| | GND | GND |
| **Status LED** | Anoda (+) | **GP2** (nebo onboard LED) |

## ⚙️ Konfigurace (MQTTsensors.py)

Před nahráním upravte v kódu sekci `--- KONFIGURACE ---`:

```python
WIFI_SSID = "Vase_Wifi"
WIFI_PASS = "Vase_Heslo"
MQTT_BROKER = "192.168.x.x"  # IP adresa serveru (RPi 4)
API_KEY = "api_..."          # Unikátní klíč vygenerovaný na Dashboardu
```

## 📡 Datový Protokol

Jednotka odesílá data do MQTT topicu `sensor/data` ve formátu JSON:

```json
{
    "apiKey": "api_hb9xdo9cnrpp50010gcbv",
    "temp": 24.5,
    "hum": 50.0,
    "mac": "28:cd:c1:..."
}
```

## 🚦 Signalizace LED

*   **Blikání:** Připojování k WiFi.
*   **Svítí:** Připojeno k WiFi a připraveno.
*   **Krátké bliknutí (zhasnutí):** Probíhá měření a odesílání dat.
*   **Rychlé blikání (5x):** Chyba připojení k MQTT brokeru.