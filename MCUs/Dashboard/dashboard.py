from machine import Pin, I2C
import machine
import ssd1306
import network
import time
import json
import gc
import math
from umqtt.simple import MQTTClient

# ─────────────────────────────────────────────
#   KONFIGURACE — uprav dle prostředí
# ─────────────────────────────────────────────
WIFI_SSID     = "Forbelina"
WIFI_PASSWORD = "SvisteVodicka1"
MQTT_BROKER   = "192.168.1.100"
MQTT_PORT     = 1883
CLIENT_ID     = "dashboard_mcu"

# ─────────────────────────────────────────────
#   HARDWARE
# ─────────────────────────────────────────────
i2c  = I2C(0, sda=Pin(0), scl=Pin(1), freq=400000)
oled = ssd1306.SSD1306_I2C(128, 64, i2c)

clk = Pin(2, Pin.IN, Pin.PULL_UP)
dt  = Pin(3, Pin.IN, Pin.PULL_UP)
sw  = Pin(4, Pin.IN, Pin.PULL_UP)

SETTINGS_FILE = "settings.json"

def load_settings():
    try:
        with open(SETTINGS_FILE, "r") as f: return json.load(f)
    except:
        return {
            "brightness": 200,
            "hotkeys": {"18": None, "19": None, "20": None}
        }

def save_settings():
    try:
        with open(SETTINGS_FILE, "w") as f: json.dump(settings, f)
    except: pass

settings = load_settings()

# Hardwarová tlačítka
btn_hw = {
    "18": {"pin": Pin(18, Pin.IN, Pin.PULL_UP), "last": 1, "t_down": 0, "long_triggered": False},
    "19": {"pin": Pin(19, Pin.IN, Pin.PULL_UP), "last": 1, "t_down": 0, "long_triggered": False},
    "20": {"pin": Pin(20, Pin.IN, Pin.PULL_UP), "last": 1, "t_down": 0, "long_triggered": False},
}

# ─────────────────────────────────────────────
#   GLOBÁLNÍ STAV
# ─────────────────────────────────────────────
mqtt_client  = None
config       = None

level        = 0
mode         = None
selected_mcu = None
current_idx  = 0

live_channel_type = None
live_api_key      = None
live_mcu_name     = None
live_channel_name = None
live_unit         = ""
live_value        = None
live_min          = None
live_max          = None

server_detail_active = False
selected_server      = None

assign_mode   = False
assign_btn_id = None
assign_idx    = 0

is_flashing   = False  # Zajišťuje animaci probliknutí vybraného prvku

# ─────────────────────────────────────────────
#   ENKODÉR — IRQ
# ─────────────────────────────────────────────
scroll_delta      = 0
last_clk          = clk.value()
last_encoder_time = 0

def handle_encoder(pin):
    global scroll_delta, last_clk, last_encoder_time
    current_time = time.ticks_ms()
    if time.ticks_diff(current_time, last_encoder_time) < 10: return
    current_clk = clk.value()
    if current_clk != last_clk:
        last_encoder_time = current_time
        if current_clk == 0:
            scroll_delta += 1 if dt.value() != current_clk else -1
    last_clk = current_clk

sw_down_time = 0
sw_handled   = True
sw_long_triggered = False

def sw_handler(pin):
    global sw_down_time, sw_handled, sw_long_triggered
    if not sw_handled: return
    sw_down_time = time.ticks_ms()
    sw_handled   = False
    sw_long_triggered = False

clk.irq(trigger=Pin.IRQ_FALLING | Pin.IRQ_RISING, handler=handle_encoder)
sw.irq(trigger=Pin.IRQ_FALLING, handler=sw_handler)

# ─────────────────────────────────────────────
#   POMOCNÉ FUNKCE — DISPLEJ
# ─────────────────────────────────────────────
def oled_clear(): oled.fill(0)

def fit(text, width=16):
    if len(text) > width: return text[:width - 1] + "~"
    return text

def draw_status(line1, line2="", line3=""):
    oled_clear()
    oled.text(line1[:16], 0, 2, 1)
    oled.text(line2[:16], 0, 22, 1)
    oled.text(line3[:16], 0, 42, 1)
    oled.show()

def draw_context_bar(items=None, idx=0, breadcrumb=""):
    count   = len(items) if items else 0
    pos_str = f"{idx % count + 1}/{count}" if count > 0 else ""
    avail   = 16 - len(pos_str) - (1 if pos_str else 0)
    bc      = breadcrumb[:avail] if breadcrumb else ""
    bc_padded = bc + " " * (avail - len(bc))
    line    = bc_padded + (" " + pos_str if pos_str else "")
    oled.text(line[:16], 0, 54, 1)

def draw_menu(title, items, idx, breadcrumb=""):
    oled_clear()
    oled.fill_rect(0, 0, 128, 11, 1)
    oled.text(fit(title), 0, 2, 0)
    count = len(items)
    if count == 0:
        oled.text("(prazdne)", 0, 26, 1)
        draw_context_bar(None, 0, breadcrumb)
        oled.show()
        return

    safe = idx % count
    if count == 1:
        if is_flashing:
            oled.fill_rect(0, 25, 128, 10, 0)
            oled.text(fit(items[0]), 0, 26, 1)
        else:
            oled.fill_rect(0, 25, 128, 10, 1)
            oled.text(fit(items[0]), 0, 26, 0)
    elif count == 2:
        y_pos = [18, 32]
        for i in range(2):
            label = fit(items[i])
            if i == safe:
                if is_flashing:
                    oled.fill_rect(0, y_pos[i] - 1, 128, 10, 0)
                    oled.text(label, 0, y_pos[i], 1)
                else:
                    oled.fill_rect(0, y_pos[i] - 1, 128, 10, 1)
                    oled.text(label, 0, y_pos[i], 0)
            else:
                oled.text(label, 0, y_pos[i], 1)
    else:
        rows = [(safe - 1) % count, safe, (safe + 1) % count]
        y_positions = [14, 26, 38]
        for i, row_idx in enumerate(rows):
            label = fit(items[row_idx])
            if i == 1:
                if is_flashing:
                    oled.fill_rect(0, y_positions[i] - 1, 128, 10, 0)
                    oled.text(label, 0, y_positions[i], 1)
                else:
                    oled.fill_rect(0, y_positions[i] - 1, 128, 10, 1)
                    oled.text(label, 0, y_positions[i], 0)
            else:
                oled.text(label, 0, y_positions[i], 1)

    draw_context_bar(items, safe, breadcrumb)
    oled.show()

def draw_server_detail(server):
    oled_clear()
    if is_flashing: # Při kliknutí problikne hlavička serveru
        oled.fill_rect(0, 0, 128, 11, 0)
        oled.text(fit(server.get("name", "Server")), 0, 2, 1)
    else:
        oled.fill_rect(0, 0, 128, 11, 1)
        oled.text(fit(server.get("name", "Server")), 0, 2, 0)
        
    oled.text(fit("IP: " + server.get("ip", "?")), 0, 16, 1)
    status = server.get("status", "?")
    oled.text(fit("Stav: " + ("ONLINE" if status == "online" else "OFFLINE")), 0, 28, 1)
    if server.get("uptime"):
        oled.text(fit(f"Up: {server.get('uptime')}")[:16], 0, 40, 1)
    oled.text("[dlouze] = zpet", 0, 54, 1)
    oled.show()

def draw_live(mcu_name, ch_name, value, unit, vmin, vmax):
    oled_clear()
    oled.text(fit(f"MCU: {mcu_name}"), 0, 0, 1)
    oled.text(fit(ch_name), 0, 10, 1)
    if value is not None:
        val_str = f"{value:.1f} {unit}"
        x_off = max(0, (16 - len(val_str)) * 4)
        if is_flashing: # Problikne hodnota
            oled.fill_rect(x_off, 25, len(val_str)*8, 10, 1)
            oled.text(val_str[:16], x_off, 26, 0)
        else:
            oled.text(val_str[:16], x_off, 26, 1)
    else:
        oled.text("Cekam...", 20, 26, 1)
    mn = f"{vmin:.1f}" if vmin is not None else "--"
    mx = f"{vmax:.1f}" if vmax is not None else "--"
    oled.text(fit(f"mn:{mn} mx:{mx}"), 0, 44, 1)
    oled.text("[dlouze] = zpet", 0, 54, 1)
    oled.show()

def draw_assign(btn_id, items, idx):
    oled_clear()
    oled.fill_rect(0, 0, 128, 11, 1)
    oled.text(fit(f"Btn {btn_id}: priraz"), 0, 2, 0)
    count = len(items)
    if count == 0:
        oled.text("(zadne prikazy)", 0, 26, 1)
    else:
        safe = idx % count
        rows = [(safe - 1) % count, safe, (safe + 1) % count]
        y_positions = [14, 26, 38]
        for i, row_idx in enumerate(rows):
            label = fit(items[row_idx])
            if i == 1:
                if is_flashing:
                    oled.fill_rect(0, y_positions[i] - 1, 128, 10, 0)
                    oled.text(label, 0, y_positions[i], 1)
                else:
                    oled.fill_rect(0, y_positions[i] - 1, 128, 10, 1)
                    oled.text(label, 0, y_positions[i], 0)
            else:
                oled.text(label, 0, y_positions[i], 1)
    oled.text("dlouze = zrusit", 0, 54, 1)
    oled.show()

def draw_no_config():
    draw_status("Neni konfig.", "Zkus Aktualizovat", "v hlavnim menu")

# ─────────────────────────────────────────────
#   UX LOGIKA (Zpětná vazba a UI Render)
# ─────────────────────────────────────────────
def update_display():
    """Vykreslí aktuální stav UI (volá se z main loopu i z feedbacku)"""
    if server_detail_active and selected_server:
        if config:
            fresh = next((s for s in config.get("servers", []) if s.get("id") == selected_server.get("id")), selected_server)
        else:
            fresh = selected_server
        draw_server_detail(fresh)
    elif assign_mode:
        cmds = config.get("commands", []) if config else []
        items_a = ["--- (zrusit)"] + [c.get("name", "?") for c in cmds]
        draw_assign(assign_btn_id, items_a, assign_idx)
    elif level == 0:
        draw_menu("=== MENU ===", get_l1_items(), current_idx, "Hlavni")
    elif level == 1:
        if config is None: draw_no_config()
        else:
            titles = {"servers": "Servery", "commands": "Prikazy", "mcus": "Sledovat MCU"}
            items = get_l2_items()
            draw_menu(titles.get(mode, "Menu"), items if items else ["(prazdne)"], current_idx, "")
    elif level == 2:
        items = get_l3_items()
        draw_menu(fit(selected_mcu.get("name", "MCU") if selected_mcu else "MCU"), items if items else ["(prazdne)"], current_idx, "Kanaly")
    elif level == 3:
        draw_live(live_mcu_name or "MCU", live_channel_name or live_channel_type or "?", live_value, live_unit, live_min, live_max)

def draw_click_feedback(custom_draw_func=None):
    global is_flashing
    is_flashing = True
    if custom_draw_func: custom_draw_func()
    else: update_display()
    
    time.sleep_ms(80)
    
    is_flashing = False
    if custom_draw_func: custom_draw_func()
    else: update_display()

def _draw_brightness_ui(brightness):
    oled_clear()
    oled.text("Nastaveni Jasu", 4, 0, 1)
    if is_flashing:
        oled.fill_rect(10, 30, 108, 10, 0)
        oled.text(" ULOZENO ", 28, 31, 1)
    else:
        oled.fill_rect(10, 30, 108, 10, 1)
        oled.fill_rect(12, 32, int(104 * (brightness / 255)), 6, 0)
    oled.text("[klik] = ulozit", 0, 54, 1)
    oled.show()

def change_brightness():
    global scroll_delta, sw_handled, sw_long_triggered
    brightness = settings.get("brightness", 200)
    scroll_delta = 0
    sw_handled = True
    sw_long_triggered = False
    _draw_brightness_ui(brightness)
    while True:
        if scroll_delta != 0:
            brightness = max(0, min(255, brightness + scroll_delta * 15))
            scroll_delta = 0
            oled.contrast(brightness)
            _draw_brightness_ui(brightness)
        
        if not sw_handled and sw.value() == 1:
            sw_handled = True
            settings["brightness"] = brightness
            save_settings()
            draw_click_feedback(lambda: _draw_brightness_ui(brightness))
            break
        time.sleep_ms(50)

# ─────────────────────────────────────────────
#   WIFI + MQTT LOGIKA
# ─────────────────────────────────────────────
def connect_wifi():
    draw_status("Pripojuji", "WiFi...", "")
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    for _ in range(20):
        if wlan.isconnected(): break
        time.sleep(0.5)
    if wlan.isconnected():
        draw_status("WiFi OK", wlan.ifconfig()[0], "")
        time.sleep(1)
        return True
    return False

def mqtt_callback(topic, msg):
    global config, live_value, live_min, live_max, live_unit, live_channel_name, live_mcu_name
    topic_str = topic.decode() if isinstance(topic, bytes) else topic

    if topic_str == "dashboard/config":
        try: config = json.loads(msg.decode())
        except Exception: pass
        return

    if topic_str.startswith("dashboard/live/"):
        try:
            data = json.loads(msg.decode())
            live_value        = data.get("value")
            live_unit         = data.get("unit", "")
            live_channel_name = data.get("name", live_channel_type or "")
            live_mcu_name     = data.get("mcuName", live_mcu_name or "")
            if live_value is not None:
                v = float(live_value)
                if live_min is None or v < live_min: live_min = v
                if live_max is None or v > live_max: live_max = v
        except Exception: pass

def connect_mqtt():
    global mqtt_client
    draw_status("Pripojuji", "MQTT...", "")
    try:
        mqtt_client = MQTTClient(CLIENT_ID, MQTT_BROKER, port=MQTT_PORT)
        mqtt_client.set_callback(mqtt_callback)
        mqtt_client.connect()
        mqtt_client.subscribe(b"dashboard/config")
        request_config()
        return True
    except Exception as e:
        draw_status("MQTT CHYBA!", str(e)[:16], "")
        time.sleep(2)
        return False

def request_config():
    if mqtt_client:
        try:
            mqtt_client.publish(b"dashboard/request/config", b"1")
        except: pass

def execute_command(cmd):
    if not mqtt_client:
        draw_status("CHYBA", "MQTT odpojeno", "")
        time.sleep(1)
        return
    server_id = cmd.get("server_id") or cmd.get("serverId")
    topic = f"server/{server_id}/execute"
    payload = json.dumps({"command_id": cmd.get("name"), "sender_id": CLIENT_ID, "history_id": None})
    try:
        mqtt_client.publish(topic.encode(), payload.encode())
        draw_status("Prikaz odeslan", fit(cmd.get("name", "?")), "OK!")
        time.sleep(1)
    except Exception as e:
        draw_status("CHYBA", str(e)[:16], "")
        time.sleep(1)

# ─────────────────────────────────────────────
#   MENU A NAVIGACE
# ─────────────────────────────────────────────
def get_l1_items():
    return ["Servery", "Prikazy", "Sledovat MCU", "Jas Displeje", "Aktualizovat"]

def get_l2_items():
    if config is None: return []
    if mode == "servers":
        return [s.get("name", "?") for s in config.get("servers", [])]
    if mode == "commands":
        return [c.get("name", "?") for c in config.get("commands", [])]
    if mode == "mcus":
        return [m.get("name", "?") for m in config.get("mcus", [])]
    return []

def get_l3_items():
    if selected_mcu is None: return []
    return [f"{ch.get('type', '?')} ({ch.get('unit', '')})" for ch in selected_mcu.get("channels", [])]

def go_back():
    global level, mode, selected_mcu, current_idx, server_detail_active, live_channel_type
    if server_detail_active:
        server_detail_active = False
    elif level == 3:
        live_channel_type = None
        level = 2
        current_idx = 0
    elif level == 2:
        selected_mcu = None
        level = 1
        current_idx = 0
    elif level == 1:
        level = 0
        mode  = None
        current_idx = 0

# ─────────────────────────────────────────────
#   HLAVNÍ SMYČKA
# ─────────────────────────────────────────────
def main():
    global config, current_idx, scroll_delta, sw_down_time, sw_handled, sw_long_triggered
    global server_detail_active, selected_server, level, mode, selected_mcu
    global assign_mode, assign_btn_id, assign_idx

    oled.contrast(settings.get("brightness", 200))

    if not connect_wifi() or not connect_mqtt():
        time.sleep(5)
        machine.reset()

    for _ in range(30):
        if mqtt_client:
            try: mqtt_client.check_msg()
            except: pass
        if config: break
        time.sleep(0.2)

    last_draw = 0
    last_auto_refresh = time.ticks_ms()

    while True:
        gc.collect()
        now = time.ticks_ms()
        
        # Auto-refresh configu každých 5 minut pro jistotu
        if time.ticks_diff(now, last_auto_refresh) > 300000:
            request_config()
            last_auto_refresh = now

        if mqtt_client:
            try: mqtt_client.check_msg()
            except: connect_mqtt()

        # ─ 1. ZPRACOVÁNÍ HARDWAROVÝCH TLAČÍTEK (HOTKEYS) ─
        for bid, state in btn_hw.items():
            cur = state["pin"].value()
            
            if cur == 0 and state["last"] == 1:
                state["t_down"] = now
                state["long_triggered"] = False
            
            elif cur == 0 and state["last"] == 0:
                if not state["long_triggered"] and time.ticks_diff(now, state["t_down"]) > 800:
                    state["long_triggered"] = True
                    if not assign_mode and config and config.get("commands"):
                        draw_click_feedback()
                        assign_mode = True
                        assign_btn_id = bid
                        assign_idx = 0

            elif cur == 1 and state["last"] == 0:
                held = time.ticks_diff(now, state["t_down"])
                if held > 15 and not state["long_triggered"]:
                    if not assign_mode:
                        cmd = settings.get("hotkeys", {}).get(bid)
                        if cmd:
                            draw_click_feedback()
                            execute_command(cmd)
                        else:
                            draw_status(f"Btn {bid} prazdny", "Drz 1s pro", "prirazeni")
                            time.sleep_ms(800)
            
            state["last"] = cur

        # ─ 2. ZPRACOVÁNÍ ENKODÉRU (ROTACE) ─
        if scroll_delta != 0:
            _irq = machine.disable_irq()
            step = scroll_delta
            scroll_delta = 0
            machine.enable_irq(_irq)

            if not server_detail_active:
                if assign_mode:
                    cmds = config.get("commands", []) if config else []
                    assign_idx = (assign_idx + step) % (len(cmds) + 1)
                elif level == 0:
                    current_idx = (current_idx + step) % len(get_l1_items())
                elif level == 1:
                    items = get_l2_items()
                    if items: current_idx = (current_idx + step) % len(items)
                elif level == 2:
                    items = get_l3_items()
                    if items: current_idx = (current_idx + step) % len(items)

        # ─ 3. ZPRACOVÁNÍ STISKU ENKODÉRU ─
        if not sw_handled and sw.value() == 0:
            if not sw_long_triggered and time.ticks_diff(now, sw_down_time) > 800:
                sw_long_triggered = True
                draw_click_feedback()
                if assign_mode:
                    assign_mode = False
                    assign_btn_id = None
                else:
                    go_back()

        if not sw_handled and sw.value() == 1:
            held = time.ticks_diff(now, sw_down_time)
            sw_handled = True
            
            if held > 15 and not sw_long_triggered: 
                draw_click_feedback()
                if server_detail_active:
                    pass 
                
                elif assign_mode:
                    cmds = config.get("commands", []) if config else []
                    items_a = ["--- (zrusit)"] + [c.get("name", "?") for c in cmds]
                    safe = assign_idx % len(items_a) if items_a else 0
                    
                    settings.setdefault("hotkeys", {})
                    settings["hotkeys"][assign_btn_id] = None if safe == 0 else cmds[safe - 1]
                    save_settings()
                    
                    cmd_name = (settings["hotkeys"][assign_btn_id] or {}).get("name", "zruseno")
                    draw_status("Prirazeno!", fit(cmd_name), f"Tl. {assign_btn_id}")
                    time.sleep_ms(800)
                    assign_mode = False
                    assign_btn_id = None

                elif level == 0:
                    selected = get_l1_items()[current_idx]
                    if selected == "Jas Displeje":
                        change_brightness()
                    elif selected == "Aktualizovat":
                        draw_status("Vyzadana data", "Cekam na odpoved..", "")
                        request_config()
                        time.sleep(1)
                    else:
                        if not config:
                            request_config()
                        else:
                            level = 1; current_idx = 0
                            if selected == "Servery": mode = "servers"
                            elif selected == "Prikazy": mode = "commands"
                            elif selected == "Sledovat MCU": mode = "mcus"
                
                elif level == 1:
                    if mode == "servers":
                        servers = config.get("servers", [])
                        if current_idx < len(servers):
                            selected_server = servers[current_idx]
                            server_detail_active = True
                    elif mode == "commands":
                        commands = config.get("commands", [])
                        if current_idx < len(commands):
                            execute_command(commands[current_idx])
                    elif mode == "mcus":
                        mcus = config.get("mcus", [])
                        if current_idx < len(mcus):
                            selected_mcu = mcus[current_idx]
                            level = 2; current_idx = 0
                                
                elif level == 2:
                    channels = selected_mcu.get("channels", [])
                    if current_idx < len(channels):
                        ch = channels[current_idx]
                        global live_channel_type, live_api_key, live_mcu_name, live_channel_name, live_unit, live_value, live_min, live_max
                        live_channel_type = ch.get("type")
                        live_api_key      = selected_mcu.get("apiKey")
                        live_mcu_name     = selected_mcu.get("name", "MCU")
                        live_channel_name = ch.get("type", "?")
                        live_unit         = ch.get("unit", "")
                        live_value = None; live_min = None; live_max = None
                        
                        if mqtt_client:
                            topic = f"dashboard/live/{live_api_key}/{live_channel_type}"
                            try: mqtt_client.subscribe(topic.encode())
                            except: pass
                        level = 3

        # ─ 4. VYKRESLENÍ DISPLEJE ─
        if time.ticks_diff(now, last_draw) >= 100:
            last_draw = now
            update_display()
        
        time.sleep_ms(10)

try: main()
except KeyboardInterrupt:
    oled_clear(); oled.show()