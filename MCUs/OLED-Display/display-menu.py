from machine import Pin, I2C
import ssd1306
import time
import dht
import machine
import math
import network
import json
from umqtt.simple import MQTTClient

# --- NASTAVENÍ SÍTĚ A MQTT ---
WIFI_SSID = "rasppico"
WIFI_PASSWORD = "embedded"
MQTT_BROKER_IP = "192.168.1.100"
MQTT_PORT = 1883
CLIENT_ID = "mcu_kuba_kancl"
TOPIC_COMMANDS = "server/commands"

mqtt_client = None

# --- NASTAVENÍ PINŮ ---
i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=400000)
oled_width = 128
oled_height = 64
oled = ssd1306.SSD1306_I2C(oled_width, oled_height, i2c)

CLK_PIN = 2
DT_PIN   = 3
SW_PIN   = 4

clk = Pin(CLK_PIN, Pin.IN, Pin.PULL_UP)
dt  = Pin(DT_PIN,  Pin.IN, Pin.PULL_UP)
sw  = Pin(SW_PIN,  Pin.IN, Pin.PULL_UP)

dht_sensor = dht.DHT11(Pin(14))

# --- FYZICKÁ TLAČÍTKA (přiřaditelná) ---
btn_1 = Pin(18, Pin.IN, Pin.PULL_UP)
btn_2 = Pin(19, Pin.IN, Pin.PULL_UP)
btn_3 = Pin(20, Pin.IN, Pin.PULL_UP)
QUICK_BTNS = {18: btn_1, 19: btn_2, 20: btn_3}

# --- NASTAVENÍ (uložené v settings.json) ---
def load_settings():
    try:
        with open("settings.json", "r") as f:
            return json.load(f)
    except:
        return {
            "brightness": 200,
            "button_assignments": {"18": None, "19": None, "20": None}
        }

def save_settings():
    try:
        with open("settings.json", "w") as f:
            json.dump(settings, f)
    except Exception as e:
        print("Chyba ukladani nastaveni:", e)

settings = load_settings()

# --- DOSTUPNÉ PŘÍKAZY, SERVERY, KANÁLY ---
available_commands = [
    {"id": "cmd_uptime",   "label": "Uptime"},
    {"id": "cmd_restart",  "label": "Restart srv"},
    {"id": "cmd_shutdown", "label": "Vypnout srv"},
    {"id": "cmd_status",   "label": "Status srv"},
]

known_servers = [
    {"id": "rpi4", "label": "RPi 4"},
    {"id": "rpi5", "label": "RPi 5"},
]

known_channels = [
    {"id": "server/commands", "label": "server/commands"},
    {"id": "sensor/data",     "label": "sensor/data"},
    {"id": "mcu/status",      "label": "mcu/status"},
]

# --- DEFINICE MENU ---
menu_items = [
    {"label": "Mereni Teploty",  "visible": True},
    {"label": "Sledovat MCU",    "visible": True},
    {"label": "Server List",     "visible": True},
    {"label": "Prikazy",         "visible": True},
    {"label": "Kanaly",          "visible": True},
    {"label": "Nastaveni Wifi",  "visible": True},
    {"label": "Jas Displeje",    "visible": True},
    {"label": "Informace o sys", "visible": True},
    {"label": "Restartovat",     "visible": True},
    {"label": "Vypnout",         "visible": True},
]

edit_mode      = False
current_index  = 0
scroll_delta   = 0
button_pressed = False

# --- PŘIPOJENÍ K WIFI A MQTT ---
def connect_wifi_and_mqtt():
    global mqtt_client
    oled.fill(0)
    oled.text("Pripojuji WiFi..", 0, 20, 1)
    oled.show()

    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)

    max_wait = 10
    while max_wait > 0:
        if wlan.status() < 0 or wlan.status() >= 3:
            break
        max_wait -= 1
        time.sleep(1)

    if wlan.status() != 3:
        oled.fill(0)
        oled.text("WiFi Chyba!", 0, 20, 1)
        oled.show()
        time.sleep(2)
        return False

    oled.fill(0)
    oled.text("WiFi OK", 0, 10, 1)
    oled.text("Pripojuji MQTT..", 0, 30, 1)
    oled.show()

    try:
        mqtt_client = MQTTClient(CLIENT_ID, MQTT_BROKER_IP, port=MQTT_PORT)
        mqtt_client.connect()
        oled.text("MQTT OK", 0, 50, 1)
        oled.show()
        time.sleep(1)
        return True
    except Exception as e:
        oled.fill(0)
        oled.text("MQTT Chyba!", 0, 20, 1)
        oled.show()
        time.sleep(2)
        return False

def send_mqtt_command(command_id):
    """Sestaví JSON a odešle příkaz přes MQTT."""
    global mqtt_client
    if not mqtt_client:
        return False
    payload = {
        "sender_id": CLIENT_ID,
        "message_id": time.time(),
        "action": "execute",
        "command_id": command_id,
    }
    try:
        mqtt_client.publish(TOPIC_COMMANDS, json.dumps(payload))
        return True
    except Exception as e:
        print("Chyba odesilani MQTT:", e)
        return False

# --- ENKODÉR (IRQ) – debounce 10 ms ---
last_clk          = clk.value()
last_encoder_time = 0

def handle_encoder(pin):
    global scroll_delta, last_clk, last_encoder_time
    current_time = time.ticks_ms()
    if time.ticks_diff(current_time, last_encoder_time) < 10:
        return
    current_clk = clk.value()
    if current_clk != last_clk:
        last_encoder_time = current_time
        if current_clk == 0:
            scroll_delta += 1 if dt.value() != current_clk else -1
    last_clk = current_clk

clk.irq(trigger=Pin.IRQ_FALLING | Pin.IRQ_RISING, handler=handle_encoder)

# --- TLAČÍTKO ENKODÉRU (IRQ) – debounce 50 ms bez sleep v IRQ ---
last_sw_time = 0

def handle_button(pin):
    global button_pressed, last_sw_time
    now = time.ticks_ms()
    if time.ticks_diff(now, last_sw_time) < 50:
        return
    last_sw_time = now
    if sw.value() == 0:
        button_pressed = True

sw.irq(trigger=Pin.IRQ_FALLING, handler=handle_button)

# --- POMOCNÉ KRESLENÍ ---
def draw_list(title, items, index):
    """Vykreslí seznam se 3 viditelnými položkami (stejný styl jako główní menu)."""
    oled.fill(0)
    n = len(items)
    if n == 0:
        oled.text("Prazdny seznam", 0, 30, 1)
        oled.show()
        return
    si     = index % n
    prev_i = (si - 1) % n
    next_i = (si + 1) % n
    # Nadpis
    title_x = max(0, (128 - len(title) * 8) // 2)
    oled.text(title, title_x, 0, 1)
    # Horní položka
    oled.text(items[prev_i]["label"][:14], 5, 10, 1)
    # Zvýrazněná prostřední
    oled.fill_rect(0, 23, 128, 18, 1)
    sel = items[si]["label"][:14]
    oled.text(sel, max(0, (128 - len(sel) * 8) // 2), 28, 0)
    # Dolní položka
    oled.text(items[next_i]["label"][:14], 5, 46, 1)
    oled.show()

# --- VYKRESLOVÁNÍ HLAVNÍHO MENU ---
def draw_menu():
    oled.fill(0)
    if edit_mode:
        active_list = menu_items
        header_text = "EDITACE MENU"
    else:
        active_list = [item for item in menu_items if item['visible']]
        header_text = ""

    if not active_list:
        oled.text("Zadne polozky", 10, 30, 1)
        oled.show()
        return

    n  = len(active_list)
    si = current_index % n
    prev_i = (si - 1) % n
    next_i = (si + 1) % n

    def get_label(i):
        item = active_list[i]
        if edit_mode:
            return ("[x] " if item['visible'] else "[ ] ") + item['label']
        return item['label']

    y_off = 0
    if edit_mode:
        oled.text(header_text, 20, 0, 1)
        y_off = 8

    oled.text(get_label(prev_i), 10, 5 + y_off, 1)
    oled.fill_rect(0, 22 + y_off, 128, 20, 1)
    sel_text = get_label(si)
    if not edit_mode:
        sel_text = f"> {sel_text} <"
    oled.text(sel_text, max(0, (128 - len(sel_text) * 8) // 2), 28 + y_off, 0)
    oled.text(get_label(next_i), 10, 50 + y_off, 1)
    oled.show()

# --- OBRAZOVKY PODMENU ---

def show_server_list():
    """Seznam serverů s položkou < Zpet na začátku."""
    global scroll_delta, button_pressed
    items = [{"id": None, "label": "< Zpet"}] + known_servers
    idx = 0
    scroll_delta = 0
    button_pressed = False
    draw_list("SERVERY", items, idx)
    while True:
        if scroll_delta != 0:
            idx = (idx + scroll_delta) % len(items)
            scroll_delta = 0
            draw_list("SERVERY", items, idx)
        if button_pressed:
            button_pressed = False
            sel = items[idx % len(items)]
            if sel["id"] is None:
                break
            oled.fill(0)
            oled.text("Server:", 0, 10, 1)
            oled.text(sel["label"], 0, 26, 1)
            oled.text("[btn] Zpet", 0, 54, 1)
            oled.show()
            # Čekáme na další stisk pro návrat
            while not button_pressed:
                time.sleep_ms(20)
            button_pressed = False
            draw_list("SERVERY", items, idx)
        time.sleep_ms(10)


def show_commands():
    """
    Seznam příkazů.
    Enkodér (krátký stisk) = odeslat příkaz přes MQTT.
    Fyzické tlačítko bez přiřazení (krátký stisk) = přiřadit příkaz.
    Fyzické tlačítko s přiřazením (přidržení >=600 ms)  = přeřadit příkaz.
    < Zpet = návrat.
    """
    global scroll_delta, button_pressed
    items = [{"id": None, "label": "< Zpet"}] + available_commands
    idx = 0
    scroll_delta = 0
    button_pressed = False

    def read_quick_btn_hold(pin_obj):
        """Vrací (stisknuto, hold_ms) s debounce."""
        if pin_obj.value() == 1:
            return False, 0
        time.sleep_ms(30)        # debounce potvrzení
        if pin_obj.value() == 1:
            return False, 0
        hold = 0
        while pin_obj.value() == 0 and hold < 1200:
            time.sleep_ms(50)
            hold += 50
        return True, hold

    draw_list("PRIKAZY", items, idx)
    while True:
        if scroll_delta != 0:
            idx = (idx + scroll_delta) % len(items)
            scroll_delta = 0
            draw_list("PRIKAZY", items, idx)

        # Enkodér = odeslat nebo zpět
        if button_pressed:
            button_pressed = False
            sel = items[idx % len(items)]
            if sel["id"] is None:
                break
            ok = send_mqtt_command(sel["id"])
            oled.fill(0)
            oled.text("Odeslano:" if ok else "Chyba!", 0, 20, 1)
            oled.text(sel["label"][:14], 0, 35, 1)
            oled.show()
            time.sleep(1)
            draw_list("PRIKAZY", items, idx)

        # Fyzická tlačítka = přiřazení příkazu (jen pokud je vybrán příkaz, ne < Zpet)
        sel_cmd = items[idx % len(items)]
        if sel_cmd["id"] is not None:
            for pin_num, btn_obj in QUICK_BTNS.items():
                pressed, hold_ms = read_quick_btn_hold(btn_obj)
                if pressed:
                    existing = settings["button_assignments"].get(str(pin_num))
                    # Krátký stisk → přiřadit pouze pokud tlačítko ještě nemá příkaz
                    # Přidržení   → přiřadit vždy (i přepsání existujícího)
                    if existing is None or hold_ms >= 600:
                        settings["button_assignments"][str(pin_num)] = sel_cmd["id"]
                        save_settings()
                        oled.fill(0)
                        oled.text(f"Btn {pin_num}:", 0, 15, 1)
                        oled.text(sel_cmd["label"][:14], 0, 30, 1)
                        oled.text("prirazen", 0, 47, 1)
                        oled.show()
                        time.sleep(1.5)
                        draw_list("PRIKAZY", items, idx)
                    break   # zpracovat max 1 tlačítko za iteraci

        time.sleep_ms(10)


def show_watch_mcu():
    """Živá data z lokálního senzoru s možností návratu enkodérovým tlačítkem."""
    global button_pressed
    button_pressed = False
    while True:
        try:
            dht_sensor.measure()
            t = dht_sensor.temperature()
            h = dht_sensor.humidity()
        except:
            t, h = "--", "--"
        oled.fill(0)
        oled.text("SLEDOVAT MCU", 4, 0, 1)
        oled.text(f"Teplota: {t} C", 0, 16, 1)
        oled.text(f"Vlhkost: {h} %", 0, 28, 1)
        oled.text("MCU2: ---", 0, 40, 1)
        oled.text("[btn] Zpet", 0, 54, 1)
        oled.show()
        if button_pressed:
            button_pressed = False
            break
        time.sleep_ms(200)


def show_channels():
    """Seznam MQTT kanálů s položkou < Zpet na začátku."""
    global scroll_delta, button_pressed
    items = [{"id": None, "label": "< Zpet"}] + known_channels
    idx = 0
    scroll_delta = 0
    button_pressed = False
    draw_list("KANALY", items, idx)
    while True:
        if scroll_delta != 0:
            idx = (idx + scroll_delta) % len(items)
            scroll_delta = 0
            draw_list("KANALY", items, idx)
        if button_pressed:
            button_pressed = False
            sel = items[idx % len(items)]
            if sel["id"] is None:
                break
            oled.fill(0)
            oled.text("Kanal:", 0, 10, 1)
            oled.text(sel["label"][:14], 0, 26, 1)
            oled.text("[btn] Zpet", 0, 54, 1)
            oled.show()
            while not button_pressed:
                time.sleep_ms(20)
            button_pressed = False
            draw_list("KANALY", items, idx)
        time.sleep_ms(10)

# --- JAS DISPLEJE ---
def draw_circle(x0, y0, r, c, fill=False):
    f = 1 - r; ddF_x = 1; ddF_y = -2 * r; x = 0; y = r
    if fill:
        oled.vline(x0, y0 - r, 2 * r + 1, c)
    else:
        oled.pixel(x0, y0 + r, c); oled.pixel(x0, y0 - r, c)
        oled.pixel(x0 + r, y0, c); oled.pixel(x0 - r, y0, c)
    while x < y:
        if f >= 0:
            y -= 1; ddF_y += 2; f += ddF_y
        x += 1; ddF_x += 2; f += ddF_x
        if fill:
            oled.vline(x0 + x, y0 - y, 2 * y + 1, c)
            oled.vline(x0 - x, y0 - y, 2 * y + 1, c)
            oled.vline(x0 + y, y0 - x, 2 * x + 1, c)
            oled.vline(x0 - y, y0 - x, 2 * x + 1, c)
        else:
            oled.pixel(x0 + x, y0 + y, c); oled.pixel(x0 - x, y0 + y, c)
            oled.pixel(x0 + x, y0 - y, c); oled.pixel(x0 - x, y0 - y, c)
            oled.pixel(x0 + y, y0 + x, c); oled.pixel(x0 - y, y0 + x, c)
            oled.pixel(x0 + y, y0 - x, c); oled.pixel(x0 - y, y0 - x, c)

def _draw_brightness_ui(brightness):
    oled.fill(0)
    oled.text("Nastaveni Jasu", 4, 0, 1)
    cx, cy, max_r = 64, 36, 20
    draw_circle(cx, cy, max_r, 1, fill=False)
    if brightness > 0:
        level_height = int((brightness / 255) * (2 * max_r))
        for i in range(level_height):
            line_y = (cy + max_r) - i
            dy = line_y - cy
            if abs(dy) < max_r:
                dx = int(math.sqrt(max_r * max_r - dy * dy))
                oled.hline(cx - dx, line_y, 2 * dx, 1)
    oled.show()

def change_brightness():
    global scroll_delta, button_pressed
    brightness = settings.get("brightness", 200)
    scroll_delta = 0
    button_pressed = False
    _draw_brightness_ui(brightness)
    while True:
        if scroll_delta != 0:
            brightness = max(0, min(255, brightness + scroll_delta * 15))
            scroll_delta = 0
            oled.contrast(brightness)
            _draw_brightness_ui(brightness)
        if button_pressed:
            button_pressed = False
            while sw.value() == 0:
                time.sleep_ms(10)
            # Uložit jas do settings.json
            settings["brightness"] = brightness
            save_settings()
            break
        time.sleep_ms(50)

# --- ROZCESTNÍK FUNKCÍ ---
def perform_action(item_name):
    if item_name == "Mereni Teploty":
        show_local_temp()
    elif item_name == "Sledovat MCU":
        show_watch_mcu()
    elif item_name == "Server List":
        show_server_list()
    elif item_name == "Prikazy":
        show_commands()
    elif item_name == "Kanaly":
        show_channels()
    elif item_name == "Jas Displeje":
        change_brightness()
    elif item_name == "Informace o sys":
        oled.fill(0)
        oled.text("Odesilam...", 10, 30, 1)
        oled.show()
        ok = send_mqtt_command("cmd_uptime")
        oled.text("OK!" if ok else "Chyba!", 10, 50, 1)
        oled.show()
        time.sleep(1.5)
    elif item_name == "Restartovat":
        oled.fill(0)
        oled.text("Restartuji...", 10, 30, 1)
        oled.show()
        time.sleep(1)
        machine.reset()
    elif item_name == "Vypnout":
        oled.fill(0)
        oled.text("Odesilam vypnuti", 0, 30, 1)
        oled.show()
        send_mqtt_command("cmd_shutdown")
        time.sleep(2)
    else:
        oled.fill(0)
        oled.text("Potvrzeno:", 5, 20, 1)
        oled.text(item_name[:14], 5, 40, 1)
        oled.show()
        time.sleep(1)

def show_local_temp():
    global button_pressed
    oled.fill(0)
    oled.text("Merim...", 10, 30, 1)
    oled.show()
    try:
        dht_sensor.measure()
        t = dht_sensor.temperature()
        h = dht_sensor.humidity()
        button_pressed = False
        while True:
            oled.fill(0)
            oled.text("MISTNOST:", 0, 0, 1)
            oled.text(f"Teplota: {t} C", 0, 20, 1)
            oled.text(f"Vlhkost: {h} %", 0, 35, 1)
            oled.text("[btn] Zpet", 0, 54, 1)
            oled.show()
            if button_pressed:
                button_pressed = False
                break
            time.sleep_ms(100)
    except Exception:
        oled.fill(0)
        oled.text("Chyba senzoru!", 0, 20, 1)
        oled.show()
        time.sleep(2)

# --- FYZICKÁ TLAČÍTKA V HLAVNÍ SMYČCE ---
# Tlačítka jsou přiřaditelná v podmenu Prikazy.
# Krátký stisk = odeslat přiřazený příkaz.
_last_qbtn_time = {18: 0, 19: 0, 20: 0}

def check_quick_buttons():
    now = time.ticks_ms()
    for pin_num, btn_obj in QUICK_BTNS.items():
        if btn_obj.value() == 0:
            if time.ticks_diff(now, _last_qbtn_time[pin_num]) < 50:
                continue
            _last_qbtn_time[pin_num] = now
            time.sleep_ms(30)
            if btn_obj.value() == 1:
                continue
            # Čekat na uvolnění (max 1,5 s)
            hold_ms = 0
            while btn_obj.value() == 0 and hold_ms < 1500:
                time.sleep_ms(50)
                hold_ms += 50
            cmd_id = settings["button_assignments"].get(str(pin_num))
            if cmd_id:
                ok = send_mqtt_command(cmd_id)
                oled.fill(0)
                oled.text(f"Btn {pin_num}:", 0, 10, 1)
                oled.text(cmd_id[:14], 0, 26, 1)
                oled.text("Odeslano" if ok else "Chyba!", 0, 42, 1)
                oled.show()
                time.sleep(1)
                draw_menu()
            return True
    return False

# --- HLAVNÍ SMYČKA ---
connect_wifi_and_mqtt()
oled.contrast(settings.get("brightness", 200))  # Aplikovat jas ze souboru
draw_menu()

while True:
    check_quick_buttons()

    # Pohyb enkodéru
    if scroll_delta != 0:
        if edit_mode:
            list_len = len(menu_items)
        else:
            list_len = len([m for m in menu_items if m['visible']])
        if list_len > 0:
            current_index = (current_index + scroll_delta) % list_len
            if current_index < 0:
                current_index += list_len
        scroll_delta = 0
        draw_menu()

    # Stisk enkodérového tlačítka
    if button_pressed:
        button_pressed = False

        # Měření doby stisku (dlouhý = editace menu)
        hold_time = 0
        while sw.value() == 0:
            time.sleep_ms(50)
            hold_time += 50
            if hold_time > 1000:
                break

        if hold_time > 1000:
            edit_mode = not edit_mode
            current_index = 0
            draw_menu()
            while sw.value() == 0:
                time.sleep_ms(10)
        else:
            if edit_mode:
                menu_items[current_index % len(menu_items)]['visible'] = \
                    not menu_items[current_index % len(menu_items)]['visible']
                draw_menu()
            else:
                active_list = [m for m in menu_items if m['visible']]
                if active_list:
                    perform_action(active_list[current_index % len(active_list)]['label'])
                    draw_menu()

    time.sleep_ms(10)

