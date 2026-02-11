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

  if (!mcusArray.length) {
    grid.innerHTML = '<div class="text-center text-silver-500 py-8">Žádné MCU nebyly nalezeny.</div>';
    return;
  }

  grid.innerHTML = mcusArray.map(mcu => {

    const escape = (str) => String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));

    const statusColor = mcu.online ? 'bg-green-400' : 'bg-gray-300';

    return `
      <div class="mcu-card bg-white rounded-lg shadow-sm border border-ash-grey-200 hover:shadow-md transition-shadow mb-4" 
           data-id="${mcu.id}" 
           data-type="${escape(mcu.type)}">
        <div class="flex items-center p-4">
          <div class="flex items-center space-x-4">
            <div class="relative">
              <div class="w-12 h-12 bg-gradient-to-br from-midnight-violet-700 to-vintage-grape-600 rounded-xl flex items-center justify-center">
                <i class="fas fa-microchip text-xl text-white"></i>
              </div>
              <span class="absolute -bottom-1 -right-1 w-4 h-4 ${statusColor} border-2 border-white rounded-full"></span>
            </div>
            <div class="min-w-[140px]">
              <h3 class="font-semibold text-midnight-violet-900">${escape(mcu.name)}</h3>
              <span class="text-xs text-silver-500">${escape(mcu.type)}</span>
            </div>
          </div>
          
          <div class="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 mx-6 text-sm">
            <div class="flex items-center space-x-2">
              <span class="text-xs text-silver-500 font-semibold">IP:</span>
              <span class="text-silver-700 font-mono">${escape(mcu.ipAddress)}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs text-silver-500 font-semibold">MAC:</span>
              <span class="text-silver-700 font-mono text-xs">${escape(mcu.macAddress)}</span>
            </div>
            <div class="flex items-center space-x-2">
              <i class="fas fa-map-marker-alt text-silver-400 w-4"></i>
              <span class="text-silver-700 truncate">${escape(mcu.location)}</span>
            </div>
            <div class="flex items-center space-x-2">
              <i class="fas fa-clock text-silver-400 w-4"></i>
              <span class="text-silver-700">${escape(mcu.lastSeen)}</span>
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
      </div>
    `;
  }).join('');
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

function populateTypeList(typesArray) {
  const container = document.getElementById('typeListContainer');
  if (!container) return;

  // Pokud nejsou žádná data
  if (!typesArray || !typesArray.length) {
    container.innerHTML = `
      <div class="p-8 text-center text-silver-500 bg-white/50 rounded-lg border border-dashed border-ash-grey-300">
        <i class="fas fa-tag mb-2 text-2xl opacity-20"></i>
        <p class="text-sm">Zatím nebyly definovány žádné typy.</p>
      </div>
    `;
    return;
  }

  // Funkce pro ošetření XSS (stejná jako u MCU gridu)
  const escape = (str) => String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  // Sestavení seznamu
  container.innerHTML = `
    <div class="divide-y divide-ash-grey-200 border border-ash-grey-200 rounded-lg bg-white overflow-hidden">
      ${typesArray.map(typeObj => `
        <div class="flex items-center justify-between p-4 hover:bg-ash-grey-50 transition-colors group">
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-vintage-grape-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <span class="font-medium text-midnight-violet-900">${escape(typeObj.type)}</span>
          </div>
          
          <button 
            class="delete-type-btn w-8 h-8 flex items-center justify-center rounded-lg text-silver-400 hover:text-red-500 hover:bg-red-50 transition-all" 
            data-id="${typeObj.id}" 
            title="Smazat typ"
          >
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

window.refreshTypes = async () => {
    const types = await fetchData('/type/types');
    populateTypeList(types); // zavolání naší nové funkce
};


document.addEventListener('DOMContentLoaded', async function() {
  // načtení typů //
  const types = await fetchData('/type/types');
  if (types) {
    const dedupedTypes = dedupeTypes(types);
    populateSelector("TypeSelectorSearchBar",dedupedTypes);
    populateSelector("TypeSelectorMCUForm",dedupedTypes);
    refreshTypes();
  } else {
    console.warn('Žádné typy nebyla načtena.');
  }
  // načtení MCU //
  if (window.refreshMCUs) await window.refreshMCUs();

});