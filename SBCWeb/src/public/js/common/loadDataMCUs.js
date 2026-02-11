// načtení select elementu pro Typy MCU
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const jsonData = await response.json();
    return jsonData.result || [];
    

  } catch (error) {
    console.error('Chyba při načítání dat:', error);
    return null;
  }
}

function populateSelector(selecotrId,typesArray) {
  const selectElement = document.getElementById(selecotrId);
  if (!selectElement) return;

  selectElement.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Vyberte typ';
  placeholder.disabled = true;
  placeholder.selected = true;
  selectElement.appendChild(placeholder);

  const seen = new Set();
  typesArray.forEach(function(item) {
    const id = item.id ?? item._id ?? item.type ?? String(item);
    if (seen.has(id)) return; // dedupe
    seen.add(id);

    const option = document.createElement('option');
    option.value = id;
    option.textContent = item.type ?? String(item);
    selectElement.appendChild(option);
  });
}


function renderMCUGrid(mcusArray) {
  const grid = document.getElementById('mcuGrid');
  if (!grid) return;

  grid.innerHTML = '';
  if (!mcusArray.length) {
    grid.innerHTML = '<div class="text-center text-silver-500 py-8">Žádné MCU nebyly nalezeny.</div>';
    return;
  }

  mcusArray.forEach(mcu => {
    const card = document.createElement('div');
    card.className = 'mcu-card bg-white rounded-lg shadow-sm border border-ash-grey-200 hover:shadow-md transition-shadow mb-4';
    card.dataset.id = mcu.id;
    card.dataset.status = 'online'; // nebo podle dat
    card.dataset.type = mcu.type || '';

    card.innerHTML = `
      <div class="flex items-center p-4">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <div class="w-12 h-12 bg-gradient-to-br from-midnight-violet-700 to-vintage-grape-600 rounded-xl flex items-center justify-center">
              <i class="fas fa-microchip text-xl text-white"></i>
            </div>
            <span class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></span>
          </div>
          <div class="min-w-[140px]">
            <h3 class="font-semibold text-midnight-violet-900">${mcu.name}</h3>
            <span class="text-xs text-silver-500">${mcu.type || ''}</span>
          </div>
        </div>
        <div class="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 mx-6 text-sm">
          <div class="flex items-center space-x-2">
            <span class="text-xs text-silver-500 font-semibold">IP:</span>
            <span class="text-silver-700 font-mono">${mcu.ipAddress}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-xs text-silver-500 font-semibold">MAC:</span>
            <span class="text-silver-700 font-mono text-xs">${mcu.macAddress}</span>
          </div>
          <div class="flex items-center space-x-2">
            <i class="fas fa-map-marker-alt text-silver-400 w-4"></i>
            <span class="text-silver-700">${mcu.location}</span>
          </div>
          <div class="flex items-center space-x-2">
            <i class="fas fa-clock text-silver-400 w-4"></i>
            <span class="text-silver-700">${mcu.lastSeen}</span>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="view-data-btn w-9 h-9 text-vintage-grape-600 hover:bg-vintage-grape-50 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Zobrazit data">
            <i class="fas fa-chart-line"></i>
          </button>
          <button class="edit-mcu-btn w-9 h-9 text-silver-600 hover:bg-ash-grey-100 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Upravit">
            <i class="fas fa-pen"></i>
          </button>
          <button class="delete-mcu-btn w-9 h-9 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Smazat">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

window.refreshMCUs = async function() {
    const mcus = await fetchData('/mcu/mcus');
    if (mcus) renderMCUGrid(mcus);
};


function dedupeTypes(typesArray) {
  const seen = new Set();
  return typesArray.filter(item => {
    const id = item.id ?? item._id ?? item.type ?? String(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

document.addEventListener('DOMContentLoaded', async function() {
  // načtení typů //
  const types = await fetchData('/type/types');
  if (types) {
    const dedupedTypes = dedupeTypes(types);
    populateSelector("TypeSelectorSearchBar",dedupedTypes);
    populateSelector("TypeSelectorMCUForm",dedupedTypes);
  } else {
    console.warn('Žádné typy nebyla načtena.');
  }
  // načtení MCU //
  if (window.refreshMCUs) await window.refreshMCUs();

});