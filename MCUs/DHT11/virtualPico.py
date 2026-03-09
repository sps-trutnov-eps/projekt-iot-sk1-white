import time
import json
import random
import paho.mqtt.client as mqtt

# ==========================================================
#                  KONFIGURACE SIMULÁTORU
# ==========================================================
MQTT_BROKER = "loopback"  # IP adresa počítače s Mosquitto
MQTT_PORT = 1883
MQTT_TOPIC = "sensor/data"
MQTT_CLIENT_ID = "PC_Simulator_01"

API_KEY = "api_qhh53nmaijhuccqtkscene"
DEVICE_MAC = "DE:AD:BE:EF:FE:ED"

# ==========================================================
#                  FUNKCE PRO MQTT
# ==========================================================
def on_connect(client, userdata, flags, rc, properties=None):
    """Callback při pokusu o připojení k brokeru"""
    if rc == 0:
        print(f"✅ Úspěšně připojeno k MQTT brokeru {MQTT_BROKER}")
    else:
        print(f"❌ Chyba připojení! Kód: {rc}")

def get_data():
    """Generuje náhodná data pro teplotu a vlhkost"""
    t = random.randint(18, 30)
    h = random.randint(30, 80)
    return t, h

# ==========================================================
#                  HLAVNÍ BĚH PROGRAMU
# ==========================================================
def main():
    print("--- Spouštím reálnou MQTT Simulaci ---")
    
    # Inicializace MQTT klienta (paho-mqtt)
    # Pro novější verze paho-mqtt přidáváme CallbackAPIVersion, aby kód neházel varování
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, MQTT_CLIENT_ID)
    except AttributeError:
        # Fallback pro starší verze paho-mqtt
        client = mqtt.Client(MQTT_CLIENT_ID)
        
    client.on_connect = on_connect

    # Pokus o připojení
    print(f"Připojuji se k {MQTT_BROKER}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        print(f"CRITICAL ERROR: Nelze se připojit k brokeru. Je Mosquitto spuštěné? ({e})")
        return

    # Spustí síťovou komunikaci na pozadí
    client.loop_start()

    print("▶️ Odesílám data každých 5 vteřin. Pro ukončení stiskněte Ctrl+C\n")
    
    try:
        while True:
            temp, hum = get_data()
            
            # Sestavení JSONu
            payload = json.dumps({
                "apiKey": API_KEY,
                "temp": temp,
                "hum": hum,
                "mac": DEVICE_MAC
            })
            
            # REÁLNÉ odeslání dat na Broker
            client.publish(MQTT_TOPIC, payload)
            print(f"📡 Odesláno: {payload}")
            
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\n🛑 Zastaveno uživatelem. Odpojuji...")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()