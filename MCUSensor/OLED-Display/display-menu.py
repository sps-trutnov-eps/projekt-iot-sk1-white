from machine import Pin, I2C
import ssd1306
import time
import dht
import machine

# --- NASTAVENÍ PINŮ ---
# I2C pro OLED
i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=400000)
oled_width = 128
oled_height = 64
oled = ssd1306.SSD1306_I2C(oled_width, oled_height, i2c)

# Rotační enkodér
CLK_PIN = 2
DT_PIN = 3
SW_PIN = 4

clk = Pin(CLK_PIN, Pin.IN, Pin.PULL_UP)
dt = Pin(DT_PIN, Pin.IN, Pin.PULL_UP)
sw = Pin(SW_PIN, Pin.IN, Pin.PULL_UP)

# Senzor teploty (shodné s MQTTsensors.py)
dht_sensor = dht.DHT11(Pin(14))

# --- DEFINICE MENU ---
menu_items = [
    {"label": "Mereni Teploty", "visible": True},
    {"label": "Data z MCU2", "visible": True},
    {"label": "Nastaveni Wifi", "visible": True},
    {"label": "Jas Displeje", "visible": True},
    {"label": "Informace o sys", "visible": True},
    {"label": "Restartovat", "visible": True},
    {"label": "Vypnout", "visible": True}
]

edit_mode = False
current_index = 0
scroll_delta = 0
button_pressed = False

# --- LOGIKA ENKODÉRU ---
last_clk = clk.value()

def handle_encoder(pin):
    global scroll_delta, last_clk
    current_clk = clk.value()
    current_dt = dt.value()
    
    if current_clk != last_clk:
        if current_clk == 0:  # Detekce hrany dolů
            # Rozhodnutí směru podle stavu DT
            if current_dt != current_clk:
                scroll_delta += 1
            else:
                scroll_delta -= 1

    last_clk = current_clk

# Připojení přerušení (IRQ) na CLK pin enkodéru
clk.irq(trigger=Pin.IRQ_FALLING | Pin.IRQ_RISING, handler=handle_encoder)

# --- LOGIKA TLAČÍTKA ---
def handle_button(pin):
    global button_pressed
    # Jednoduchý debounce
    time.sleep_ms(20)
    if sw.value() == 0:
        button_pressed = True

sw.irq(trigger=Pin.IRQ_FALLING, handler=handle_button)

# --- VYKRESLOVÁNÍ ---
def draw_menu():
    oled.fill(0) # Vyčistit obrazovku
    
    # Určení seznamu, který se má zobrazovat
    if edit_mode:
        active_list = menu_items
        header_text = "EDITACE MENU"
    else:
        active_list = [item for item in menu_items if item['visible']]
        header_text = ""

    # Pokud není nic k zobrazení
    if not active_list:
        oled.text("Zadne polozky", 10, 30, 1)
        oled.show()
        return

    # Bezpečné zjištění indexů (modulo délkou aktuálního seznamu)
    list_len = len(active_list)
    safe_index = current_index % list_len
    
    # Vypočítáme indexy pro položku nahoře a dole
    prev_index = (safe_index - 1) % list_len
    next_index = (safe_index + 1) % list_len
    
    # Pomocná funkce pro formátování textu
    def get_label(idx):
        item = active_list[idx]
        text = item['label']
        if edit_mode:
            prefix = "[x]" if item['visible'] else "[ ]"
            return f"{prefix} {text}"
        return text

    # Vykreslení nadpisu v edit módu
    y_offset = 0
    if edit_mode:
        oled.text(header_text, 20, 0, 1)
        y_offset = 8 # Posuneme menu trochu dolů
    
    # 1. Horní položka (malá, šedá/normální)
    oled.text(get_label(prev_index), 10, 5 + y_offset, 1)
    
    # 2. PROSTŘEDNÍ POLOŽKA (Zvýrazněná)
    oled.fill_rect(0, 22 + y_offset, 128, 20, 1)
    
    selected_text = get_label(safe_index)
    if not edit_mode:
        selected_text = f"> {selected_text} <"
    
    # Centr textu
    x_pos = max(0, (128 - len(selected_text) * 8) // 2)
    oled.text(selected_text, x_pos, 28 + y_offset, 0) # color 0 = černá
    
    # 3. Dolní položka (malá)
    oled.text(get_label(next_index), 10, 50 + y_offset, 1)
    
    # Vykreslení
    oled.show()

def show_local_temp():
    """Zobrazí teplotu a vlhkost z lokálního senzoru"""
    oled.fill(0)
    oled.text("Merim...", 10, 30, 1)
    oled.show()
    
    try:
        dht_sensor.measure()
        t = dht_sensor.temperature()
        h = dht_sensor.humidity()
        
        while True:
            oled.fill(0)
            oled.text("MISTNOST:", 0, 0, 1)
            oled.text(f"Teplota: {t} C", 0, 20, 1)
            oled.text(f"Vlhkost: {h} %", 0, 35, 1)
            oled.text("< Zpet tlacitkem", 0, 55, 1)
            oled.show()
            
            # Čekání na stisk tlačítka pro návrat
            if sw.value() == 0:
                while sw.value() == 0: time.sleep_ms(10) # Debounce uvolnění
                break
            time.sleep_ms(100)
            
    except Exception as e:
        oled.fill(0)
        oled.text("Chyba senzoru!", 0, 20, 1)
        oled.show()
        time.sleep(2)

def perform_action(item_name):
    """Rozcestník funkcí podle vybrané položky"""
    if item_name == "Mereni Teploty":
        show_local_temp()
        
    elif item_name == "Restartovat":
        oled.fill(0)
        oled.text("Restartuji...", 10, 30, 1)
        oled.show()
        time.sleep(1)
        machine.reset()
        
    else:
        # Defaultní akce pro zatím neimplementované funkce
        oled.fill(0)
        oled.text("Potvrzeno:", 5, 20, 1)
        oled.text(item_name, 5, 40, 1)
        oled.show()
        time.sleep(1) 

# --- HLAVNÍ SMYČKA ---
draw_menu() # Prvotní vykreslení

while True:
    # 1. Zpracování pohybu enkodéru
    if scroll_delta != 0:
        # Zjistíme délku aktuálního seznamu
        if edit_mode:
            list_len = len(menu_items)
        else:
            list_len = len([m for m in menu_items if m['visible']])
        
        if list_len > 0:
            current_index += scroll_delta
            # Ošetření přetečení
            if current_index >= list_len:
                current_index = 0
            elif current_index < 0:
                current_index = list_len - 1
        
        scroll_delta = 0
        draw_menu()
    
    # 2. Zpracování tlačítka
    if button_pressed:
        button_pressed = False
        
        # Detekce DLOUHÉHO stisku (pro vstup do Editace)
        hold_time = 0
        while sw.value() == 0: # Dokud je drženo
            time.sleep_ms(50)
            hold_time += 50
            if hold_time > 1000: break # Po 1s považujeme za dlouhý stisk
            
        if hold_time > 1000:
            # --- PŘEPNUTÍ REŽIMU ---
            edit_mode = not edit_mode
            current_index = 0 # Reset pozice při změně režimu
            draw_menu()
            # Čekáme na uvolnění tlačítka
            while sw.value() == 0: time.sleep_ms(10)
            
        else:
            # --- KRÁTKÝ STISK (AKCE) ---
            if edit_mode:
                # Přepnout viditelnost položky
                item = menu_items[current_index]
                item['visible'] = not item['visible']
                draw_menu()
            else:
                # Spustit funkci
                active_list = [m for m in menu_items if m['visible']]
                if active_list:
                    selected_item = active_list[current_index]
                    print(f"Vybrano: {selected_item['label']}")
                    perform_action(selected_item['label'])
                    draw_menu()
        
    time.sleep_ms(10) # Malá pauza pro uvolnění CPU
