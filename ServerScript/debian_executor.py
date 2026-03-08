import json
import subprocess
import threading
import logging
import paho.mqtt.client as mqtt

# --- Konfigurace ---
MQTT_BROKER = "192.168.1.100"  # IP adresa brokera
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

    real_command = COMMAND_MAP[cmd_id]
    send_status(client, history_id, "running", log_msg=f"Spouštím: {' '.join(real_command)}")

    try:
        process = subprocess.Popen(
            real_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
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

def on_connect(client, userdata, flags, rc):
    logging.info(f"Připojeno k MQTT (Kód: {rc})")
    # Zaregistrujeme se k odběru pro EXECUTE i CONFIG
    client.subscribe([(TOPIC_EXECUTE, 0), (TOPIC_CONFIG, 0)])
    logging.info(f"Naslouchám na:\n - {TOPIC_EXECUTE}\n - {TOPIC_CONFIG}")

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

if __name__ == "__main__":
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        logging.info("Ukončeno uživatelem.")