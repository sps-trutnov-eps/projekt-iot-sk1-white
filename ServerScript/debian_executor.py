import json
import subprocess
import threading
import logging
import time
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

# --- Konfigurace ---
MQTT_BROKER = "10.10.10.100"  # IP adresa brokera
MQTT_PORT = 1883
SERVER_ID = "1" # Mělo by odpovídat ID serveru ve tvé SQLite databázi

# Rozdělení do 3 samostatných topiců
TOPIC_EXECUTE = f"server/{SERVER_ID}/execute"
TOPIC_CONFIG  = f"server/{SERVER_ID}/config"
TOPIC_STATUS  = f"server/{SERVER_ID}/status"

# --- Logování ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("server_agent.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)

# Výchozí slovník, prázdný, čeká na synchronizaci z DB
COMMAND_MAP = {} 

def send_status(client, history_id, status, exit_code=None, log_msg=""):
    """Odesílá status zpět Node.js serveru na topic_status."""
    payload = {
        "sender_id": f"server_{SERVER_ID}",
        "history_id": history_id,
        "status": status,
        "exit_code": exit_code,
        "log": log_msg
    }
    try:
        client.publish(TOPIC_STATUS, json.dumps(payload))
        logging.info(f"-> Odeslán status: {status} (Log: {log_msg[:50]}...)")
    except Exception as e:
        logging.error(f"Chyba při odesílání MQTT: {e}")

def execute_command(client, payload):
    """Fyzické spuštění příkazu."""
    history_id = payload.get("history_id")
    raw_cmd_id = payload.get("command_id", "")
    cmd_id = raw_cmd_id.strip() 

    logging.info(f"<- Přijat požadavek na spuštění '{cmd_id}' (History ID: {history_id})")
    send_status(client, history_id, "received", log_msg=f"Příkaz '{cmd_id}' přijat ke zpracování.")

    if cmd_id not in COMMAND_MAP:
        send_status(client, history_id, "error", exit_code=1, log_msg=f"Zakázaný nebo neznámý command_id: {cmd_id}")
        return

    raw = COMMAND_MAP[cmd_id]
    # Podporuje string i list
    if isinstance(raw, list):
        shell_command = " ".join(raw)
    else:
        shell_command = str(raw)

    send_status(client, history_id, "running", log_msg=f"Spouštím: {shell_command}")

    try:
        process = subprocess.Popen(
            shell_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=True,
            executable="/bin/bash"
        )
        stdout, stderr = process.communicate()
        exit_code = process.returncode
        
        full_log = stdout + stderr
        if not full_log:
            full_log = "Příkaz proběhl bez textového výstupu."

        final_status = "success" if exit_code == 0 else "error"
        send_status(client, history_id, final_status, exit_code=exit_code, log_msg=full_log)

    except Exception as e:
        send_status(client, history_id, "error", exit_code=-1, log_msg=f"Kritická chyba: {str(e)}")

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        logging.info("Připojeno k MQTT brokeru.")
        client.subscribe([(TOPIC_EXECUTE, 0), (TOPIC_CONFIG, 0)])
        logging.info(f"Naslouchám na:\n - {TOPIC_EXECUTE}\n - {TOPIC_CONFIG}")
    else:
        logging.error(f"Připojení selhalo, kód: {reason_code}")

def on_disconnect(client, userdata, flags, reason_code, properties):
    if reason_code != 0:
        logging.warning(f"Odpojeno od brokera (kód: {reason_code}), čekám na reconnect...")

def on_message(client, userdata, msg):
    """Rozcestník podle toho, do jakého topicu zpráva přišla."""
    try:
        payload = json.loads(msg.payload.decode())
        
        # 1. Zpráva přišla do topicu pro spouštění
        if msg.topic == TOPIC_EXECUTE:
            if "command_id" in payload and "history_id" in payload:
                thread = threading.Thread(target=execute_command, args=(client, payload))
                thread.start()
            else:
                logging.warning("Ignoruji zprávu v EXECUTE: Chybí command_id nebo history_id.")
                
        # 2. Zpráva přišla do topicu pro synchronizaci whitelistu
        elif msg.topic == TOPIC_CONFIG:
            if "commands" in payload:
                global COMMAND_MAP
                COMMAND_MAP = payload["commands"]
                logging.info(f"Úspěšný SYNC! Nový povolený seznam příkazů: {list(COMMAND_MAP.keys())}")
            else:
                logging.warning("Ignoruji zprávu v CONFIG: Chybí klíč 'commands'.")
                
    except json.JSONDecodeError:
        logging.error("Zpráva není validní JSON.")
    except Exception as e:
        logging.error(f"Neočekávaná chyba: {e}")

RETRY_DELAY = 10  # sekund mezi pokusy o připojení

if __name__ == "__main__":
    client = mqtt.Client(CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=5, max_delay=60)

    while True:
        try:
            logging.info(f"Připojuji se k brokeru {MQTT_BROKER}:{MQTT_PORT}...")
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_forever()
        except KeyboardInterrupt:
            logging.info("Ukončeno uživatelem.")
            break
        except Exception as e:
            logging.error(f"Nelze se připojit k brokeru: {e}")
            logging.info(f"Zkouším znovu za {RETRY_DELAY} sekund...")
            time.sleep(RETRY_DELAY)