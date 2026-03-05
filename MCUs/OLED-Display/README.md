# Ovládací Panel (MCU 1)

Tento modul slouží jako fyzické rozhraní pro správu serveru a zobrazení lokálních dat. Je postaven na **Raspberry Pi Pico W** a využívá OLED displej s rotačním enkodérem a tlačítky pro rychlou volbu.

## 🔌 Zapojení (Pinout)

| Komponenta | Pin na Komponentě | Pin na Pico (GPIO) | Poznámka |
| :--- | :--- | :--- | :--- |
| **OLED Displej** | SDA | **GP0** | I2C0 |
| | SCL | **GP1** | I2C0 |
| | VCC | 3.3V | |
| | GND | GND | |
| **Rotační Enkodér** | CLK | **GP2** | |
| | DT | **GP3** | |
| | SW | **GP4** | Tlačítko enkodéru |
| **Senzor** | DHT11 Data | **GP14** | Lokální teplota |
| **Tlačítka** | Restart (Btn 1) | **GP18** | Pull-Up interní |
| | Shutdown (Btn 2) | **GP19** | Pull-Up interní |
| | Info (Btn 3) | **GP20** | Pull-Up interní |

## 🚀 Funkce

### Hlavní Menu
Ovládá se otáčením enkodéru a potvrzením stiskem (SW).
1. **Měření Teploty:** Zobrazí data z lokálního DHT11 senzoru.
2. **Data z MCU2:** (Placeholder) Pro zobrazení vzdálených dat.
3. **Nastavení WiFi:** (Placeholder) Informace o síti.
4. **Jas Displeje:** Umožňuje regulovat jas OLED panelu pomocí enkodéru.
5. **Informace o sys:** Odešle MQTT dotaz `cmd_uptime` na server.
6. **Restartovat / Vypnout:** Softwarové příkazy pro MCU.

### Rychlá Tlačítka (Hardwarová)
Obsahují ochranu proti náhodnému stisku (dvoufázové potvrzení).

*   **Tlačítko 1 (GP18) - RESTART:**
    *   *1. stisk:* Vyžádá potvrzení na displeji.
    *   *2. stisk:* Provede hardwarový restart Pico W (`machine.reset()`).
*   **Tlačítko 2 (GP19) - VYPNOUT SERVER:**
    *   *1. stisk:* Vyžádá potvrzení.
    *   *2. stisk:* Odešle MQTT příkaz `cmd_shutdown` na centrální server.
*   **Tlačítko 3 (GP20) - INFO:**
    *   *Stisk:* Okamžitě vyžádá informace o systému ze serveru.

## 🛠 Instalace a Spuštění

1. **Firmware:** Nainstalujte MicroPython na Raspberry Pi Pico W.
2. **Knihovny:** Nahrajte na Pico následující soubory:
    *   `ssd1306.py` (Ovladač displeje)
    *   `umqtt/simple.py` (MQTT klient - složka umqtt)
3. **Konfigurace:**
    *   V souboru `display-menu.py` upravte proměnné `WIFI_SSID`, `WIFI_PASSWORD` a `MQTT_BROKER_IP`.
4. **Spuštění:**
    *   Spusťte `display-menu.py`.

## 📡 MQTT Komunikace
*   **Publikuje do:** `server/commands`
    *   Formát: JSON `{ "command_id": "cmd_shutdown", ... }`
*   **Odebírá:** (Zatím neimplementováno pro příjem, slouží jako odesílač příkazů).