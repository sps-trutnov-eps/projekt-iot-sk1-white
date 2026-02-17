import network
import time
import machine
import dht
import ubinascii
import json
from umqtt.simple import MQTTClient
import gc

# --- KONFIGURACE ---
WIFI_SSID = "Forbelina"
WIFI_PASS = "SvisteVodicka1"
# ZDE ZADEJ IP ADRESU TVÉHO POČÍTAČE (kde běží Mosquitto Broker)
# Zjistíš ji v příkazovém řádku Windows příkazem: ipconfig
MQTT_BROKER = "192.168.1.100" 

API_KEY = "api_vkeiatrwi0938tl2jatc72"

# --- HW NASTAVENÍ ---
sensor = dht.DHT11(machine.Pin(14))
# Onboard LED je obvykle na GIPO 2
led = machine.Pin(2, machine.Pin.OUT)

CLIENT_ID = ubinascii.hexlify(machine.unique_id())

def flash_led(times, delay=0.1):
    """Pomocná funkce pro blikání při chybě nebo startu"""
    for _ in range(times):
        led.value(1)
        time.sleep(delay)
        led.value(0)
        time.sleep(delay)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print('Připojuji se k WiFi...')
        wlan.connect(WIFI_SSID, WIFI_PASS)
        
        # Blikáme dokud se nepřipojíme
        retry = 0
        while not wlan.isconnected():
            if retry > 20: break # Timeout
            led.value(not led.value()) # Blikání
            time.sleep(0.5)
            retry += 1
            
    if wlan.isconnected():
        print('WiFi připojena! IP:', wlan.ifconfig()[0])
        led.value(1) # Rozsvítíme LED - WiFi je OK
    else:
        print('Chyba WiFi!')
        led.value(0)

def connect_mqtt():
    try:
        client = MQTTClient(CLIENT_ID, MQTT_BROKER)
        client.connect()
        print('Připojeno k MQTT Brokeru')
        return client
    except Exception as e:
        print('Chyba MQTT:', e)
        flash_led(5, 0.05) # Rychlé zablikání = chyba brokeru
        return None

def loop():
    # 1. Start - připojení k síti
    connect_wifi()
    
    # 2. Start - připojení k MQTT
    client = connect_mqtt()
    
    if not client:
        print("Nepodařilo se připojit k MQTT, restartuji za 5s...")
        time.sleep(5)
        #machine.reset()

    while True:
        try:
            # Signalizace měření (LED krátce zhasne a rozsvítí se)
            led.value(0) 
            sensor.measure()
            time.sleep(0.2)
            led.value(1)

            # Příprava dat
            payload = json.dumps({
                "apiKey": API_KEY,
                "temp": sensor.temperature(),
                "hum": sensor.humidity(),
                "mac": ubinascii.hexlify(network.WLAN().config('mac'),':').decode()
            })
            
            # Odeslání
            client.publish("sensor/data", payload)
            print(f"Odesláno: {payload}")
            
        except OSError as e:
            print(f"!!! CHYBA: {e} !!!")
            led.value(0) # Zhasneme LED na znamení chyby
            try:
                client.connect()
                led.value(1) # Zpátky online
            except:
                pass
        
        # Úklid paměti
        gc.collect()
        
        # Čekání 10 sekund
        time.sleep(10)

# Spuštění
try:
    loop()
except KeyboardInterrupt:
    print("Ukončeno uživatelem")
    led.value(0)