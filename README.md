# Server Deck: Fyzické rozhraní pro správu serveru

## Téma projektu
Ovládácí panel, který má sloužit jako fyzické rozhraní pro správu a zobrazení stavu PC (například rychlý restart serveru, nebo zobrazení teplot).

Systém propojuje centrální serverovou aplikaci (Web Dashboard) s fyzickými ovládacími prvky pomocí mikrokontrolerů , které zajišťují detekci uživatelského vstupu, sběr dat a měření.

## 3 Featury (Hlavní funkce)

### 1. Spouštěč příkazů
Systém na základě fyzického vstupu na jednom z MCU odesílá zprávy na server kde script na základě správ spouští scripty. Bude se jednat o několik předdefinovaných funkcí.

* **Funkcionalita:** Uživatel může přímo z panelu resetovat síťové rozhraní, bezpečně vypnout systém (shutdown) nebo spustit diagnostický skript. Displej poskytuje okamžitou zpětnou vazbu o úspěšnosti akce.

### 2. Monitorování a analýza dat
Měření hodnot, které budou užité ke kontrole ideálních podmínek a měření trendů.

* **Funkcionalita:** Uživatel na webovém dashboardu nastaví prahové hodnoty (např. "Teplota > 40°C"). Pokud tuto hodnotu překročí měřená hodnota MCU tuto informaci pošle do SBC.

### 3. Editace panelu
Možnost editace zobrazovaných funkcí na displeji panelu.
* **Funkcionalita:** Pomocí zkratky na rotačním enkodéru si uživatel bude moci vybrat jaké funkce uvidí a jaké ne.
    Zárověň zde bude možnost zobrazit si aktuální data naměřená na druhém MCU

## 2 Stretch goaly 

### 1. Wake-on-LAN
Vzdálené zapínání zařízení.
* **Popis:** V menu ovládacího panelu přibude možnost "Wake Device". Po aktivaci systém odešle po síti tzv. *Magic Packet* na nastavenou MAC adresu, čímž na dálku probudí jiné zařízení v síti.

### 2. Prevence náhodného stisknutí
* **Popis:** Proti například nechtěnému vypnutí PC je potřeba zadat sekvenci vstupů pro potvrzení.


## Seznam součástek

### Centrální jednotka (SBC)
* **1x Raspberry Pi 4 Model B**
    * *Funkce:* Backend (Node.js), Webserver, Databáze.
  
### Mikrokontrolery (MCU)
* **1x Raspberry Pi Pico W** (Uživatelský vstup)
    * *Komunikace:* Bezdrátově (Wi-Fi) s SBC.
* **1x Raspberry Pi Pico** (Senzory)
    * *Komunikace:* Sériová linka (UART/USB) s SBC.

### Periferie
* **1x OLED Displej 0.96"** (rozlišení 128x64 px)
    * *Sběrnice:* I2C.
* **1x Rotační enkodér**
* **1x Senzor teploty a vlhkosti (DHT11)**
* **3x Tlačítka**    
