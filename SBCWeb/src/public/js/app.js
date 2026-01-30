// Základní JavaScript pro dashboard
console.log('IoT Dashboard inicializován');

// Funkce pro získání dat ze senzorů
async function fetchSensorData() {
  try {
    const response = await fetch('/api/sensor/data');
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      const latest = data.data[0];
      updateDisplay(latest);
    }
  } catch (error) {
    console.error('Chyba při načítání dat:', error);
  }
}

// Aktualizace zobrazení
function updateDisplay(data) {
  const tempEl = document.getElementById('temperature');
  const humEl = document.getElementById('humidity');
  
  if (tempEl && data.temperature) {
    tempEl.textContent = data.temperature;
  }
  
  if (humEl && data.humidity) {
    humEl.textContent = data.humidity;
  }
}

// Automatické obnovování dat každých 5 sekund
setInterval(fetchSensorData, 5000);

// Načtení dat při startu
document.addEventListener('DOMContentLoaded', () => {
  console.log('Stránka načtena, zahajuji monitoring...');
  fetchSensorData();
});
