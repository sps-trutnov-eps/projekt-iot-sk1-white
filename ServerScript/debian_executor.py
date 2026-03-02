import json
import time
import subprocess
import threading
import paho.mqtt.client as mqtt

# --- Konfigurace ---
MQTT_BROKER = "localhost"  # IP adresa brokera (na RPi obvykle localhost)
MQTT_PORT = 1883
TOPIC_COMMANDS = "server/commands"
TOPIC_STATUS = "server/status"
SERVER_ID = "debian_server_1"

# --- Mapování command_id na reálné příkazy ---
# Bezpečnostní whitelist: pouze tyto příkazy lze spustit
COMMAND_MAP = {
    "cmd_apt_update": ["sudo", "apt-get", "update"],
    "cmd_ping_google": ["ping", "-c", "3", "google.com"],
    "cmd_uptime": ["uptime"],
    "cmd_restart_service": ["sudo", "systemctl", "restart", "nginx"]
}

def send_status(client, original_msg_id, status, exit_code=None, log_msg=""):
    """
    Odesle JSON zpravu se stavem zpet do MQTT.
    """
    payload = {
        "sender_id": SERVER_ID,
        "message_id": original_msg_id,
        "status": status,
        "exit_code": exit_code,
        "log": log_msg
    }
    
    try:
        client.publish(TOPIC_STATUS, json.dumps(payload))
        print(f"-> Odeslán status: {status} (Log: {log_msg[:50]}...)")
    except Exception as e:
        print(f"Chyba při odesílání MQTT: {e}")

def execute_command(client, payload):
    """
    Funkce běží v samostatném vlákně, aby neblokovala MQTT smyčku.
    """
    msg_id = payload.get("message_id")
    cmd_id = payload.get("command_id")
    sender = payload.get("sender_id")

    print(f"<- Přijat příkaz {cmd_id} od {sender} (ID: {msg_id})")

    # 1. Fáze: RECEIVED
    send_status(client, msg_id, "received", log_msg=f"Příkaz {cmd_id} přijat ke zpracování.")

    if cmd_id not in COMMAND_MAP:
        send_status(client, msg_id, "error", exit_code=1, log_msg=f"Neznámé command_id: {cmd_id}")
        return

    # 2. Fáze: RUNNING
    real_command = COMMAND_MAP[cmd_id]
    send_status(client, msg_id, "running", log_msg=f"Spouštím: {' '.join(real_command)}")

    try:
        # Spuštění procesu
        process = subprocess.Popen(
            real_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Čekání na dokončení a získání výstupu
        stdout, stderr = process.communicate()
        exit_code = process.returncode
        
        # Spojení výstupu pro log
        full_log = stdout + stderr
        if not full_log:
            full_log = "Příkaz proběhl bez výstupu."

        # 3. Fáze: SUCCESS / ERROR
        final_status = "success" if exit_code == 0 else "error"
        send_status(client, msg_id, final_status, exit_code=exit_code, log_msg=full_log)

    except Exception as e:
        send_status(client, msg_id, "error", exit_code=-1, log_msg=f"Kritická chyba při spouštění: {str(e)}")

def on_connect(client, userdata, flags, rc):
    print(f"Připojeno k MQTT Brokeru s kódem {rc}")
    client.subscribe(TOPIC_COMMANDS)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        
        if "action" in payload and payload["action"] == "execute":
            thread = threading.Thread(target=execute_command, args=(client, payload))
            thread.start()
            
    except Exception as e:
        print(f"Chyba při zpracování zprávy: {e}")

if __name__ == "__main__":
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()