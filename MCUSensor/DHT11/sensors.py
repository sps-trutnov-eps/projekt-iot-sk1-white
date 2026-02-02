import network
import time
import machine
import dht
import urequests
import json
import gc  # Garbage Collector pro správu paměti

# --- KONFIGURACE --- 
# #pouzil jsem hotspot
WIFI_SSID = "Necum"
WIFI_PASS = "pokus123"

# Pokud server nemáš, jdi na https://webhook.site/, zkopíruj "Your unique URL" a vlož ji sem:
SERVER_URL = "https://webhook.site/60976ca4-bc14-4b8b-a0f2-725eb1e08971"

# Interval měření v sekundách (DHT11 potřebuje min 2s, pro odesílání je lepší třeba 30s nebo 60s)
INTERVAL = 10 

# Inicializace senzoru na GPIO 14
sensor = dht.DHT11(machine.Pin(14, machine.Pin.IN, machine.Pin.PULL_UP))
led = machine.Pin("LED", machine.Pin.OUT) # LED na desce pro signalizaci

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print('Připojuji se k WiFi...')
        wlan.connect(WIFI_SSID, WIFI_PASS)
        
        # Čekáme max 15 vteřin na připojení
        max_wait = 15
        while max_wait > 0:
            if wlan.status() < 0 or wlan.status() >= 3:
                break
            max_wait -= 1
            time.sleep(1)
            
    if wlan.isconnected():
        print('WiFi připojena! IP:', wlan.ifconfig()[0])
        led.on() # Rozsvítí LED když je WiFi OK
        return True
    else:
        print('Chyba připojení k WiFi')
        led.off()
        return False

def send_data(data):
    """
    Odešle data jako JSON POST request
    """
    headers = {'Content-Type': 'application/json'}
    try:
        # Převedeme slovník na JSON string
        json_data = json.dumps(data)
        
        print(f"Odesílám: {json_data}")
        
        # Samotné odeslání
        response = urequests.post(SERVER_URL, data=json_data, headers=headers)
        
        # Zkontrolujeme odpověď (jen pro debug)
        print("Server odpověděl:", response.text)
        
        # VELMI DŮLEŽITÉ: Musíme zavřít response, jinak dojde paměť!
        response.close() 
        return True
    except Exception as e:
        print("Chyba při odesílání:", e)
        return False

# --- HLAVNÍ SMYČKA ---
print("Startuji IoT senzor...")
connect_wifi()

while True:
    try:
        # 1. Změření dat
        sensor.measure()
        temp = sensor.temperature()
        hum = sensor.humidity()
        
        # 2. Příprava balíčku
        payload = {
            "sensor": "DHT11",
            "location": "pokoj",
            "temperature": temp,
            "humidity": hum
        }
        
        # 3. Odeslání
        # Kontrola WiFi před odesláním (kdyby vypadla)
        if network.WLAN(network.STA_IF).isconnected():
             send_data(payload)
        else:
            print("WiFi vypadla, zkouším reconnect...")
            connect_wifi()

    except OSError as e:
        print("Chyba čtení senzoru (zkusím to příště)")
    
    # Úklid paměti (prevence proti zaseknutí po dlouhé době)
    gc.collect()
    
    # Čekání na další cyklus
    time.sleep(INTERVAL)
