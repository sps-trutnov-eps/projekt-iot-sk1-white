# Server Script Executor

Tato složka obsahuje Python skripty, které běží na pozadí hlavního serveru (Raspberry Pi 4). Jejich úkolem je vykonávat systémové příkazy, které přijdou přes MQTT od mikrokontrolerů (např. z OLED panelu).

Protože hlavní webový server (Node.js) se stará primárně o data a vizualizaci, tento oddělený skript slouží jako "vykonavatel" pro správu operačního systému Debian.

## 📂 Soubory

*   **`debian_executor.py`**: Hlavní skript, který naslouchá MQTT příkazům a volá systémové utility (shutdown, reboot, uptime).

## 🛠 Instalace a Prerekvizity

Skript vyžaduje Python 3 a knihovnu pro MQTT.

1.  **Instalace závislostí:**
    ```bash
    sudo apt update
    sudo apt install python3-pip
    pip3 install paho-mqtt psutil
    ```

2.  **Konfigurace:**
    Otevřete `debian_executor.py` a zkontrolujte nastavení MQTT brokeru (obvykle `localhost` nebo `127.0.0.1`, pokud běží na stejném RPi).

## 🚀 Spuštění

Skript by měl běžet neustále na pozadí.

**Manuální spuštění (pro test):**
```bash
python3 debian_executor.py
```

**Spuštění jako služba (systemd) - Doporučeno:**
Aby se skript spustil automaticky po startu RPi:
1.  Vytvořte soubor služby: `sudo nano /etc/systemd/system/mqtt-executor.service`
2.  Vložte definici (upravte cestu k souboru podle reality):
    ```ini
    [Unit]
    Description=MQTT System Executor
    After=network.target mosquitto.service

    [Service]
    ExecStart=/usr/bin/python3 /home/pi/IOT/RPI-white/ServerScript/debian_executor.py
    WorkingDirectory=/home/pi/IOT/RPI-white/ServerScript
    Restart=always
    User=pi

    [Install]
    WantedBy=multi-user.target
    ```
3.  Aktivujte službu:
    ```bash
    sudo systemctl enable mqtt-executor.service
    sudo systemctl start mqtt-executor.service
    ```

## 📡 Podporované Příkazy

Skript naslouchá na topicu `server/commands` a reaguje na následující `command_id`:

| Command ID | Akce | Příkaz OS |
| :--- | :--- | :--- |
| `cmd_shutdown` | Vypne Raspberry Pi | `sudo shutdown -h now` |
| `cmd_reboot` | Restartuje Raspberry Pi | `sudo reboot` |
| `cmd_uptime` | Získá čas běhu systému | `uptime -p` |