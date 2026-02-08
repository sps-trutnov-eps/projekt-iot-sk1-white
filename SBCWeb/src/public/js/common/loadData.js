// načtení select elementu pro Typy MCU
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const jsonData = await response.json();
    
    if (jsonData.result && jsonData.result.length > 0) {
      return jsonData.result;
    }
    return null;

  } catch (error) {
    console.error('Chyba při načítání dat:', error);
    return null;
  }
}

function populateSelector(typesArray) {
  const selectElement = document.getElementById('typeSelector');
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

document.addEventListener('DOMContentLoaded', async function() {
  const result = await fetchData('/type/types');
  
  if (result) {
    populateSelector(result);
  } else {
    console.warn('Žádná data nebyla načtena.');
  }
});