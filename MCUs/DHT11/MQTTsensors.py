import network
import time
import machine
import dht
import ubinascii
import json
from umqtt.simple import MQTTClient
import gc
import socket

# --- KONFIGURACE ---
WIFI_SSID = "Forbelina"
WIFI_PASS = "SvisteVodicka1"
MQTT_BROKER = "192.168.1.100"
MQTT_PORT = 1883
API_KEY = "api_key"
PUBLISH_INTERVAL = 5

# --- HW NASTAVENÍ ---
sensor = dht.DHT11(machine.Pin(14))
led = machine.Pin(2, machine.Pin.OUT)
CLIENT_ID = ubinascii.hexlify(machine.unique_id()).decode()

def dbg(label, value=""):
    print(f"[DEBUG] {label}: {value}" if value != "" else f"[DEBUG] {label}")

def flash_led(times, delay=0.1):
    for _ in range(times):
        led.value(1); time.sleep(delay)
        led.value(0); time.sleep(delay)

# ══════════════════════════════════════════
#  WIFI DEBUG
# ══════════════════════════════════════════
def scan_networks(wlan):
    """Naskenuje sítě a vypíše je seřazené podle síly signálu."""
    dbg("Skenuji dostupné sítě...")
    try:
        nets = wlan.scan()
        if not nets:
            dbg("SCAN", "Žádné sítě nenalezeny!")
            return
        # Seřadit podle RSSI (sestupně)
        nets.sort(key=lambda x: x[3], reverse=True)
        print(f"[DEBUG] Nalezeno {len(nets)} sítí:")
        target_found = False
        for ssid, bssid, channel, rssi, authmode, hidden in nets:
            ssid_str = ssid.decode('utf-8', 'ignore')
            bssid_str = ubinascii.hexlify(bssid, ':').decode()
            auth_names = ['Open', 'WEP', 'WPA-PSK', 'WPA2-PSK', 'WPA/WPA2-PSK']
            auth_str = auth_names[authmode] if authmode < len(auth_names) else str(authmode)
            marker = " <-- CÍL" if ssid_str == WIFI_SSID else ""
            if ssid_str == WIFI_SSID:
                target_found = True
            print(f"         SSID: '{ssid_str}' | RSSI: {rssi} dBm | Ch: {channel} | Auth: {auth_str} | Hidden: {hidden}{marker}")
        if not target_found:
            print(f"[DEBUG] VAROVÁNÍ: Síť '{WIFI_SSID}' NEBYLA NALEZENA!")
    except Exception as e:
        dbg("SCAN CHYBA", e)

def connect_wifi():
    dbg("=== WIFI CONNECT START ===")
    wlan = network.WLAN(network.STA_IF)
    
    dbg("STA aktivní?", wlan.active())
    wlan.active(True)
    time.sleep(0.5)
    dbg("STA aktivní po enable?", wlan.active())
    
    # Pokud jsme už připojeni
    if wlan.isconnected():
        cfg = wlan.ifconfig()
        dbg("Již připojeno!", f"IP={cfg[0]}, Mask={cfg[1]}, GW={cfg[2]}, DNS={cfg[3]}")
        return True
    
    # Scan sítí
    scan_networks(wlan)
    
    dbg(f"Připojuji se k '{WIFI_SSID}' ...")
    wlan.connect(WIFI_SSID, WIFI_PASS)
    
    # Čekáme a logujeme stav každé 0.5s
    # Stavové kódy: 0=IDLE, 1=CONNECTING, 2=WRONG_PASS, 3=NO_AP, 4=CONNECT_FAIL, 5=CONNECTED
    STATUS_NAMES = {
        0: "IDLE",
        1: "CONNECTING",
        2: "WRONG_PASSWORD",
        3: "NO_AP_FOUND",
        4: "CONNECT_FAIL",
        5: "CONNECTED (GOT IP)",
        1000: "IDLE",
        1001: "CONNECTING",
        1010: "NO_AP_FOUND",
        1011: "WRONG_PASSWORD",
        1012: "BEACON_TIMEOUT",
        1013: "ASSOC_FAIL",
        1014: "HANDSHAKE_TIMEOUT",
        1015: "GOT_IP",
    }
    
    last_status = -1
    for attempt in range(40):  # 20 sekund timeout
        status = wlan.status()
        status_name = STATUS_NAMES.get(status, f"UNKNOWN({status})")
        
        if status != last_status:
            dbg(f"Stav WiFi změněn", f"{status} = {status_name}")
            last_status = status
        
        if wlan.isconnected():
            break
            
        # Detekce fatálních chyb (nebudeme čekat dál)
        if status in [2, 1011]:  # WRONG_PASSWORD
            dbg("FATÁLNÍ", "Špatné heslo! Zkontroluj WIFI_PASS.")
            break
        if status in [3, 1010]:  # NO_AP_FOUND
            dbg("FATÁLNÍ", f"Síť '{WIFI_SSID}' nenalezena! Zkontroluj WIFI_SSID.")
            break
            
        led.value(not led.value())
        time.sleep(0.5)
    
    led.value(0)
    
    if wlan.isconnected():
        cfg = wlan.ifconfig()
        rssi = wlan.status('rssi') if hasattr(wlan, 'status') else 'N/A'
        dbg("WiFi ÚSPĚCH!")
        dbg("IP adresa", cfg[0])
        dbg("Maska sítě", cfg[1])
        dbg("Výchozí brána", cfg[2])
        dbg("DNS server", cfg[3])
        dbg("RSSI (signál)", f"{rssi} dBm")
        dbg("MAC adresa", ubinascii.hexlify(wlan.config('mac'), ':').decode())
        led.value(1)
        return True
    else:
        final_status = wlan.status()
        dbg("WiFi SELHALO", f"Finální stav: {final_status} = {STATUS_NAMES.get(final_status, 'UNKNOWN')}")
        
        # Speciální rady podle stavového kódu
        if final_status == 201 or final_status == 1:
            dbg("TIP", "Stále se připojuje - zkus zvýšit timeout nebo přiblíž zařízení k routeru")
        
        flash_led(10, 0.1)
        return False

# ══════════════════════════════════════════
#  TCP/MQTT DEBUG
# ══════════════════════════════════════════
def test_tcp_connection():
    """Ověří, zda je broker vůbec dosažitelný na TCP úrovni (před MQTT)."""
    dbg(f"Testuji TCP spojení → {MQTT_BROKER}:{MQTT_PORT}")
    try:
        s = socket.socket()
        s.settimeout(5)
        addr = socket.getaddrinfo(MQTT_BROKER, MQTT_PORT)[0][-1]
        dbg("DNS resolved", str(addr))
        s.connect(addr)
        dbg("TCP spojení", "ÚSPĚCH - broker je dostupný")
        s.close()
        return True
    except OSError as e:
        dbg("TCP spojení", f"SELHALO: {e}")
        if "ECONNREFUSED" in str(e) or "111" in str(e):
            dbg("TIP", "Broker nenaslouchá na tomto portu nebo IP. Zkontroluj Mosquitto.")
        elif "ETIMEDOUT" in str(e) or "110" in str(e):
            dbg("TIP", "Broker nedosažitelný. Zkontroluj firewall Windows nebo IP adresu.")
        elif "ENETUNREACH" in str(e) or "101" in str(e):
            dbg("TIP", "Síť nedosažitelná - WiFi ještě neběží?")
        return False

def connect_mqtt():
    dbg("=== MQTT CONNECT START ===")
    dbg("CLIENT_ID", CLIENT_ID)
    dbg("CLIENT_ID typ", type(CLIENT_ID).__name__)
    dbg("Broker", MQTT_BROKER)
    dbg("Port", MQTT_PORT)
    
    # Nejdřív otestuj holé TCP
    if not test_tcp_connection():
        dbg("MQTT přeskočeno - TCP test selhal")
        return None
    
    try:
        client = MQTTClient(
            CLIENT_ID,
            MQTT_BROKER,
            port=MQTT_PORT,
            keepalive=30
        )
        dbg("MQTTClient objekt vytvořen, volám connect()...")
        client.connect()
        dbg("MQTT ÚSPĚCH - připojeno k brokeru")
        return client
    except Exception as e:
        dbg("MQTT CHYBA", e)
        flash_led(5, 0.05)
        return None

# ══════════════════════════════════════════
#  SENSOR DEBUG
# ══════════════════════════════════════════
def read_sensor():
    """Přečte DHT11 s debuggingem."""
    try:
        sensor.measure()
        t = sensor.temperature()
        h = sensor.humidity()
        dbg("DHT11", f"Teplota={t}°C, Vlhkost={h}%")
        # Sanity check - DHT11 rozsah: 0-50°C, 20-90%
        if not (0 <= t <= 50):
            dbg("DHT11 VAROVÁNÍ", f"Teplota {t}°C je mimo rozsah DHT11 (0-50°C)!")
        if not (20 <= h <= 90):
            dbg("DHT11 VAROVÁNÍ", f"Vlhkost {h}% je mimo rozsah DHT11 (20-90%)!")
        return t, h
    except Exception as e:
        dbg("DHT11 CHYBA", e)
        return None, None

# ══════════════════════════════════════════
#  HLAVNÍ SMYČKA
# ══════════════════════════════════════════
def loop():
    dbg("=== SPOUŠTÍM APLIKACI ===")
    dbg("Volná paměť", f"{gc.mem_free()} bytes")
    dbg("Chip ID", CLIENT_ID)
    
    client = None
    consecutive_errors = 0
    
    while True:
        # Zajisti připojení
        if client is None:
            dbg("Client je None, zahajuji reconnect...")
            if not connect_wifi():
                dbg("WiFi selhala, čekám 10s před dalším pokusem...")
                time.sleep(10)
                continue
            client = connect_mqtt()
            if client is None:
                dbg("MQTT selhalo, čekám 5s...")
                time.sleep(5)
                continue
            consecutive_errors = 0

        # Měření
        led.value(0)
        t, h = read_sensor()
        time.sleep(0.2)
        led.value(1)
        
        if t is None:
            dbg("Přeskakuji publish - sensor selhal")
            time.sleep(PUBLISH_INTERVAL)
            continue

        try:
            mac = ubinascii.hexlify(network.WLAN().config('mac'), ':').decode()
            payload = json.dumps({
                "apiKey": API_KEY,
                "temp": t,
                "hum": h,
                "mac": mac
            })
            dbg(f"Publishuji na 'sensor/data'", payload)
            client.publish("sensor/data", payload)
            dbg("Publish ÚSPĚCH")
            consecutive_errors = 0

        except OSError as e:
            consecutive_errors += 1
            dbg(f"CHYBA při publish (#{consecutive_errors})", e)
            led.value(0)
            try:
                client.disconnect()
                dbg("Starý socket odpojen")
            except:
                pass
            client = None
        
        dbg("Volná paměť", f"{gc.mem_free()} bytes")
        gc.collect()
        dbg("Volná paměť po GC", f"{gc.mem_free()} bytes")
        time.sleep(PUBLISH_INTERVAL)

try:
    loop()
except KeyboardInterrupt:
    print("[DEBUG] Ukončeno uživatelem (Ctrl+C)")
    led.value(0)