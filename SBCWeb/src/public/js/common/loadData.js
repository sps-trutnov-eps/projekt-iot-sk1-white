
//
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      return data;
    }
  } catch (error) {
    console.error('Chyba při načítání dat:', error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  fetchData('/api/types').then(function(result){
    if (result) {
      populateSelector(result);
    }
  }).catch(function(err){
    console.error('populate error', err);
  });
});