import network
import time
import machine
import dht
import ubinascii
import json
from umqtt.simple import MQTTClient
import gc
import socket

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

# --- HW NASTAVENI ---
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
#  WIFI
# ══════════════════════════════════════════
def scan_networks(wlan):
    dbg("Skenuji dostupne site...")
    try:
        nets = wlan.scan()
        if not nets:
            dbg("SCAN", "Zadne site nenalezeny!")
            return
        nets.sort(key=lambda x: x[3], reverse=True)
        print(f"[DEBUG] Nalezeno {len(nets)} siti:")
        target_found = False
        for ssid, bssid, channel, rssi, authmode, hidden in nets:
            ssid_str = ssid.decode('utf-8', 'ignore')
            bssid_str = ubinascii.hexlify(bssid, ':').decode()
            auth_names = ['Open', 'WEP', 'WPA-PSK', 'WPA2-PSK', 'WPA/WPA2-PSK']
            auth_str = auth_names[authmode] if authmode < len(auth_names) else str(authmode)
            marker = " <-- CIL" if ssid_str == WIFI_SSID else ""
            if ssid_str == WIFI_SSID:
                target_found = True
            print(f"         SSID: '{ssid_str}' | RSSI: {rssi} dBm | Ch: {channel} | Auth: {auth_str} | Hidden: {hidden}{marker}")
        if not target_found:
            print(f"[DEBUG] VAROVANI: Sit '{WIFI_SSID}' NEBYLA NALEZENA!")
    except Exception as e:
        dbg("SCAN CHYBA", e)

def connect_wifi():
    dbg("=== WIFI CONNECT START ===")
    wlan = network.WLAN(network.STA_IF)

    dbg("STA aktivni?", wlan.active())
    wlan.active(True)
    time.sleep(0.5)
    dbg("STA aktivni po enable?", wlan.active())

    # Staticka IP konfigurace
    if STATIC_IP:
        dbg("Nastavuji statickou IP", STATIC_IP)
        wlan.ifconfig((STATIC_IP, SUBNET, GATEWAY, DNS))

    if wlan.isconnected():
        cfg = wlan.ifconfig()
        dbg("Jiz pripojeno!", f"IP={cfg[0]}, Mask={cfg[1]}, GW={cfg[2]}, DNS={cfg[3]}")
        return True

    scan_networks(wlan)

    dbg(f"Pripojuji se k '{WIFI_SSID}' ...")
    wlan.connect(WIFI_SSID, WIFI_PASS)

    STATUS_NAMES = {
        0: "IDLE", 1: "CONNECTING", 2: "WRONG_PASSWORD",
        3: "NO_AP_FOUND", 4: "CONNECT_FAIL", 5: "CONNECTED (GOT IP)",
        1000: "IDLE", 1001: "CONNECTING", 1010: "NO_AP_FOUND",
        1011: "WRONG_PASSWORD", 1012: "BEACON_TIMEOUT",
        1013: "ASSOC_FAIL", 1014: "HANDSHAKE_TIMEOUT", 1015: "GOT_IP",
    }

    last_status = -1
    for attempt in range(40):
        status = wlan.status()
        status_name = STATUS_NAMES.get(status, f"UNKNOWN({status})")

        if status != last_status:
            dbg(f"Stav WiFi zmenen", f"{status} = {status_name}")
            last_status = status

        if wlan.isconnected():
            break

        if status in [2, 1011]:
            dbg("FATALNI", "Spatne heslo! Zkontroluj WIFI_PASS.")
            break
        if status in [3, 1010]:
            dbg("FATALNI", f"Sit '{WIFI_SSID}' nenalezena! Zkontroluj WIFI_SSID.")
            break

        led.value(not led.value())
        time.sleep(0.5)

    led.value(0)

    if wlan.isconnected():
        cfg = wlan.ifconfig()
        rssi = wlan.status('rssi') if hasattr(wlan, 'status') else 'N/A'
        dbg("WiFi USPECH!")
        dbg("IP adresa", cfg[0])
        dbg("Maska site", cfg[1])
        dbg("Vychozi brana", cfg[2])
        dbg("DNS server", cfg[3])
        dbg("RSSI (signal)", f"{rssi} dBm")
        dbg("MAC adresa", ubinascii.hexlify(wlan.config('mac'), ':').decode())
        led.value(1)
        return True
    else:
        final_status = wlan.status()
        dbg("WiFi SELHALO", f"Finalni stav: {final_status} = {STATUS_NAMES.get(final_status, 'UNKNOWN')}")
        if final_status == 201 or final_status == 1:
            dbg("TIP", "Stale se pripojuje - zkus zvysit timeout nebo pribliz zarizeni k routeru")
        flash_led(10, 0.1)
        return False

# ══════════════════════════════════════════
#  TCP/MQTT
# ══════════════════════════════════════════
def test_tcp_connection():
    dbg(f"Testuji TCP spojeni -> {MQTT_BROKER}:{MQTT_PORT}")
    try:
        s = socket.socket()
        s.settimeout(5)
        addr = socket.getaddrinfo(MQTT_BROKER, MQTT_PORT)[0][-1]
        dbg("DNS resolved", str(addr))
        s.connect(addr)
        dbg("TCP spojeni", "USPECH - broker je dostupny")
        s.close()
        return True
    except OSError as e:
        dbg("TCP spojeni", f"SELHALO: {e}")
        if "ECONNREFUSED" in str(e) or "111" in str(e):
            dbg("TIP", "Broker nenasloucha na tomto portu nebo IP. Zkontroluj Mosquitto.")
        elif "ETIMEDOUT" in str(e) or "110" in str(e):
            dbg("TIP", "Broker nedosazitelny. Zkontroluj firewall nebo IP adresu.")
        elif "ENETUNREACH" in str(e) or "101" in str(e):
            dbg("TIP", "Sit nedosazitelna - WiFi jeste nebezi?")
        return False

def connect_mqtt():
    dbg("=== MQTT CONNECT START ===")
    dbg("CLIENT_ID", CLIENT_ID)
    dbg("Broker", MQTT_BROKER)
    dbg("Port", MQTT_PORT)

    if not test_tcp_connection():
        dbg("MQTT preskoceno - TCP test selhal")
        return None

    try:
        client = MQTTClient(
            CLIENT_ID,
            MQTT_BROKER,
            port=MQTT_PORT,
            keepalive=30
        )
        dbg("MQTTClient objekt vytvoren, volam connect()...")
        client.connect()
        dbg("MQTT USPECH - pripojeno k brokeru")
        return client
    except Exception as e:
        dbg("MQTT CHYBA", e)
        flash_led(5, 0.05)
        return None

# ══════════════════════════════════════════
#  SENSOR
# ══════════════════════════════════════════
def read_sensor():
    try:
        sensor.measure()
        t = sensor.temperature()
        h = sensor.humidity()
        dbg("DHT11", f"Teplota={t}C, Vlhkost={h}%")
        if not (0 <= t <= 50):
            dbg("DHT11 VAROVANI", f"Teplota {t}C je mimo rozsah DHT11 (0-50C)!")
        if not (20 <= h <= 90):
            dbg("DHT11 VAROVANI", f"Vlhkost {h}% je mimo rozsah DHT11 (20-90%)!")
        return t, h
    except Exception as e:
        dbg("DHT11 CHYBA", e)
        return None, None

# ══════════════════════════════════════════
#  HLAVNI SMYCKA
# ══════════════════════════════════════════
def loop():
    dbg("=== SPOUSTIM APLIKACI ===")
    dbg("Volna pamet", f"{gc.mem_free()} bytes")
    dbg("Chip ID", CLIENT_ID)

    client = None
    consecutive_errors = 0

    while True:
        if client is None:
            dbg("Client je None, zahajuji reconnect...")
            if not connect_wifi():
                dbg("WiFi selhala, cekam 10s pred dalsim pokusem...")
                time.sleep(10)
                continue
            client = connect_mqtt()
            if client is None:
                dbg("MQTT selhalo, cekam 5s...")
                time.sleep(5)
                continue
            consecutive_errors = 0

        led.value(0)
        t, h = read_sensor()
        time.sleep(0.2)
        led.value(1)

        if t is None:
            dbg("Preskakuji publish - sensor selhal")
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
            dbg("Publish USPECH")
            consecutive_errors = 0

        except OSError as e:
            consecutive_errors += 1
            dbg(f"CHYBA pri publish (#{consecutive_errors})", e)
            led.value(0)
            try:
                client.disconnect()
                dbg("Stary socket odpojen")
            except:
                pass
            client = None

        dbg("Volna pamet", f"{gc.mem_free()} bytes")
        gc.collect()
        dbg("Volna pamet po GC", f"{gc.mem_free()} bytes")
        time.sleep(PUBLISH_INTERVAL)

try:
    loop()
except KeyboardInterrupt:
    print("[DEBUG] Ukonceno uzivatelem (Ctrl+C)")
    led.value(0)
