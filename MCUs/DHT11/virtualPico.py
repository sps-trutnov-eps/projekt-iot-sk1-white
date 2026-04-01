import time
import json
import random
import paho.mqtt.client as mqtt

# ==========================================================
#   SIMULATOR CONFIGURATION
#   Set MQTT_BROKER to the IP of the machine running Mosquitto.
#   Set API_KEY and DEVICE_MAC to match the MCU record in the dashboard.
# ==========================================================
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "sensor/data"
MQTT_CLIENT_ID = "VirtualPico_01"

API_KEY = "your_api_key_here"   # copy from MCU detail in the dashboard
DEVICE_MAC = "DE:AD:BE:EF:FE:ED"  # must match the MAC set in the dashboard

PUBLISH_INTERVAL = 5  # seconds between messages

# ==========================================================
#   MQTT
# ==========================================================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[OK] Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
    else:
        print(f"[ERROR] Connection failed, code: {rc}")

def get_data():
    temp = round(random.uniform(18.0, 35.0), 1)
    hum = round(random.uniform(30.0, 80.0), 1)
    return temp, hum

# ==========================================================
#   MAIN
# ==========================================================
def main():
    print("=== Virtual Pico — MQTT Simulator ===")
    print(f"Broker : {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Topic  : {MQTT_TOPIC}")
    print(f"API key: {API_KEY}\n")

    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, MQTT_CLIENT_ID)
    except AttributeError:
        client = mqtt.Client(MQTT_CLIENT_ID)

    client.on_connect = on_connect

    print(f"Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        print(f"[CRITICAL] Cannot connect to broker. Is Mosquitto running? ({e})")
        return

    client.loop_start()

    print(f"Sending data every {PUBLISH_INTERVAL}s. Press Ctrl+C to stop.\n")

    try:
        while True:
            temp, hum = get_data()
            payload = json.dumps({
                "apiKey": API_KEY,
                "temp": temp,
                "hum": hum,
                "mac": DEVICE_MAC
            })
            client.publish(MQTT_TOPIC, payload)
            print(f"[SENT] {payload}")
            time.sleep(PUBLISH_INTERVAL)

    except KeyboardInterrupt:
        print("\n[STOP] Disconnecting...")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
