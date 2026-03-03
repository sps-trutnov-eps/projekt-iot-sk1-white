// common/loadDataMCUs.js
import { applyFilters } from '../pages/mcus/filterManager.js'; 

export async function fetchMcu(mcuId) {
    if (!mcuId) return null;

    try {
        const response = await fetch('/mcu/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mcuId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server vrátil chybu');
        }

        return await response.json();
    } catch (error) {
        console.error("Chyba při fetchování MCU:", error);
        return null;
    }
}

export async function fetchData(url) {
  try {
    const response = await fetch(url);
    const jsonData = await response.json();
    return jsonData.result || [];
  } catch (error) {
    console.error('Chyba při načítání dat:', error);
    return null;
  }
}

// ... [funkce populateSelector zůstává beze změny] ...
export function populateSelector(selectorId, typesArray) {
  const selectElement = document.getElementById(selectorId);
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
    if (seen.has(id)) return; 
    seen.add(id);

    const option = document.createElement('option');
    option.value = id;
    option.textContent = item.type ?? String(item);
    selectElement.appendChild(option);
  });
}

// Funkce pro skeleton načítání MCU karet
export function showMcuLoadingState() {
  const grid = document.getElementById('mcuGrid');
  if (!grid) return;
  
  // Vygenerujeme 3 skeleton karty pod sebou
  grid.innerHTML = Array(3).fill(`
      <div class="mcu-card bg-white rounded-lg shadow-sm border border-ash-grey-200 mb-4 animate-pulse"> 
        <div class="flex items-center p-4">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-ash-grey-200 rounded-xl"></div>
            <div class="min-w-[140px] space-y-2">
              <div class="h-4 bg-ash-grey-200 rounded w-24"></div>
              <div class="h-3 bg-ash-grey-100 rounded w-16"></div>
            </div>
          </div>
          <div class="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 mx-6">
            <div class="h-4 bg-ash-grey-100 rounded w-20"></div>
            <div class="h-4 bg-ash-grey-100 rounded w-32 hidden lg:block"></div>
            <div class="h-4 bg-ash-grey-100 rounded w-16"></div>
            <div class="h-4 bg-ash-grey-100 rounded w-20"></div>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-9 h-9 bg-ash-grey-100 rounded-lg"></div>
            <div class="w-9 h-9 bg-ash-grey-100 rounded-lg"></div>
          </div>
        </div>
      </div>
  `).join('');
}

export function renderMCUGrid(mcusArray) {
  const grid = document.getElementById('mcuGrid');
  if (!grid) return;

  // Prázdný stav s INBOX ikonou
  if (!mcusArray || !mcusArray.length) {
    grid.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-24 h-24 bg-ash-grey-100 rounded-full flex items-center justify-center mb-5 text-ash-grey-400 shadow-inner">
                <i class="fas fa-inbox text-4xl"></i>
            </div>
            <h2 class="text-xl font-bold text-midnight-violet-900">Zatím tu nic není</h2>
            <p class="text-ash-grey-500 mt-2 max-w-sm">Nebylo nalezeno žádné MCU zařízení. Přidejte své první zařízení kliknutím na tlačítko v levém menu.</p>
        </div>
    `;
    return;
  }

  const now = new Date();

  grid.innerHTML = mcusArray.map(mcu => {
    const escape = (str) => String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));

    const typeName = window.typeMap && window.typeMap[mcu.type] 
        ? window.typeMap[mcu.type] 
        : mcu.type;

    // LOGIKA TŘÍ STAVŮ
    const statusVal = mcu.isOnline;
    
    let dataStatus = 'offline';
    let statusDisplay = 'Offline';
    let timeColorClass = 'text-red-500 font-semibold';
    let statusColor = 'bg-red-500';
    let pulseEffect = '';

    if (statusVal === 1 || statusVal === true) {
        dataStatus = 'online';
        statusDisplay = 'Online';
        timeColorClass = 'text-green-600 font-medium';
        statusColor = 'bg-green-400';
        pulseEffect = 'animate-pulse';
    } else if (statusVal === 2) {
        dataStatus = 'frozen'; 
        statusDisplay = 'Passive'; 
        timeColorClass = 'text-yellow-600 font-medium'; 
        statusColor = 'bg-yellow-400'; 
        pulseEffect = '';
    }

    let dbTime = mcu.lastSeen;
    let formattedDateStr = 'Nikdy';

    if (dbTime) {
      if (typeof dbTime === 'string') {
        dbTime = dbTime.replace(' ', 'T');
        if (!dbTime.endsWith('Z')) dbTime += 'Z';
      }
      
      const lastSeenDate = new Date(dbTime);
      const isToday = lastSeenDate.toDateString() === now.toDateString();

      if (!isNaN(lastSeenDate.getTime())) {
        if (isToday) {
          formattedDateStr = lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
          formattedDateStr = lastSeenDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) + ' ' + 
                            lastSeenDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        }
      }
    }

    let lastSeenDisplay = (statusVal === 1 || statusVal === 2) ? statusDisplay : formattedDateStr;

    return `
      <div class="mcu-card cursor-pointer bg-white rounded-lg shadow-sm border border-ash-grey-200 hover:shadow-md transition-shadow mb-4" 
           data-id="${mcu.id}" 
           data-status="${dataStatus}"
           data-type="${escape(mcu.type)}"> 
        <div class="flex items-center p-4">
          <div class="flex items-center space-x-4">
            <div class="relative">
              <div class="w-12 h-12 bg-gradient-to-br from-midnight-violet-700 to-vintage-grape-600 rounded-xl flex items-center justify-center">
                <i class="fas fa-microchip text-xl text-white"></i>
              </div>
              <span class="status-dot absolute -bottom-1 -right-1 w-4 h-4 ${statusColor} ${pulseEffect} border-2 border-white rounded-full"></span>
            </div>
            <div class="min-w-[140px]">
              <h3 class="font-semibold text-midnight-violet-900">${escape(mcu.name)}</h3>
              <span class="text-xs text-silver-500">${escape(typeName)}</span>
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
              <i class="fas fa-clock ${dataStatus === 'offline' ? 'text-red-400' : 'text-silver-400'} w-4"></i>
              <span class="last-seen-text ${timeColorClass} text-xs uppercase">${lastSeenDisplay}</span>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button class="edit-mcu-btn w-9 h-9 text-silver-600 hover:bg-ash-grey-100 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Upravit">
              <i class="fas fa-pen text-sm"></i>
            </button>
            <button class="delete-mcu-btn w-9 h-9 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition" data-id="${mcu.id}" title="Smazat">
              <i class="fas fa-trash text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  if (typeof applyFilters === 'function') {
      applyFilters();
  }
}

export async function refreshMCUs() {
    // Ukázat skeleton před načtením dat
    showMcuLoadingState(); 
    
    const mcus = await fetchData('/mcu/mcus');
    renderMCUGrid(mcus || []); // Ošetření pro null (zobrazí se INBOX)
    
    if (typeof applyFilters === 'function') {
        applyFilters();
    }
}


export function dedupeTypes(typesArray) {
  const seen = new Set();
  return typesArray.filter(item => {
    const id = item.id ?? item._id ?? item.type ?? String(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function populateTypeList(typesArray) {
  const container = document.getElementById('typeListContainer');
  if (!container) return;

  if (!typesArray || !typesArray.length) {
    container.innerHTML = `
      <div class="p-8 text-center text-silver-500 bg-white/50 rounded-lg border border-dashed border-ash-grey-300">
        <i class="fas fa-tag mb-2 text-2xl opacity-20"></i>
        <p class="text-sm">Zatím nebyly definovány žádné typy.</p>
      </div>
    `;
    return;
  }

  const escape = (str) => String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

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

export async function refreshTypes() {
    const types = await fetchData('/type/types');
    populateTypeList(types); 
    const dedupedTypes = dedupeTypes(types);
    populateSelector("TypeSelectorSearchBar", dedupedTypes);
    populateSelector("TypeSelectorMCUForm", dedupedTypes);
}

export async function initDataLoad() {
  const types = await fetchData('/type/types');
  if (types) {
    const dedupedTypes = dedupeTypes(types);
    populateSelector("TypeSelectorSearchBar", dedupedTypes);
    populateSelector("TypeSelectorMCUForm", dedupedTypes);
    populateSelector("editTypeSelector", dedupedTypes);
    await refreshTypes();
  } else {
    console.warn('Žádné typy nebyla načtena.');
  }
  
  await refreshMCUs();
}