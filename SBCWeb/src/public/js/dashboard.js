// Dashboard SPA functionality
console.log('Dashboard inicializován');

// State management
const state = {
  sidebarOpen: window.innerWidth >= 1024,
  currentView: 'dashboard',
  selectedSensor: null,
  timeRange: '24h',
  mcus: [],
  sensors: []
};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const mainContent = document.getElementById('mainContent');
const logoutBtn = document.getElementById('logout');
const addMCUBtn = document.getElementById('addMCU');
const addSensorBtn = document.getElementById('addSensor');
const sensorSelector = document.getElementById('sensorSelector');

// Toggle Sidebar
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  
  if (state.sidebarOpen) {
    sidebar.classList.remove('-translate-x-full');
    if (window.innerWidth < 1024) {
      sidebarOverlay.classList.remove('hidden');
    }
  } else {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
  }
}

// Close Sidebar (mobile)
function closeSidebar() {
  state.sidebarOpen = false;
  sidebar.classList.add('-translate-x-full');
  sidebarOverlay.classList.add('hidden');
}

// Event Listeners
toggleSidebarBtn?.addEventListener('click', toggleSidebar);
closeSidebarBtn?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// Handle window resize
window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024) {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
    state.sidebarOpen = true;
  } else {
    if (!state.sidebarOpen) {
      sidebar.classList.add('-translate-x-full');
    }
  }
});

// Logout
logoutBtn?.addEventListener('click', () => {
  if (confirm('Opravdu se chcete odhlásit?')) {
    window.location.href = '/';
  }
});

// Add MCU Modal
addMCUBtn?.addEventListener('click', () => {
  const name = prompt('Zadejte název MCU:');
  if (name) {
    addMCU(name);
  }
});

// Add Sensor Modal
addSensorBtn?.addEventListener('click', () => {
  const name = prompt('Zadejte název senzoru:');
  if (name) {
    addSensor(name);
  }
});

// Sensor Selector Change
sensorSelector?.addEventListener('change', (e) => {
  state.selectedSensor = e.target.value;
  if (state.selectedSensor) {
    loadSensorChart(state.selectedSensor, state.timeRange);
  }
});

// Time Range Buttons
document.querySelectorAll('.timerange-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const timeRange = e.target.dataset.timerange;
    state.timeRange = timeRange;
    
    // Update button styles
    document.querySelectorAll('.timerange-btn').forEach(b => {
      b.classList.remove('bg-vintage-grape-100', 'text-vintage-grape-800');
      b.classList.add('text-silver-600', 'hover:bg-ash-grey-100');
    });
    e.target.classList.add('bg-vintage-grape-100', 'text-vintage-grape-800');
    e.target.classList.remove('text-silver-600', 'hover:bg-ash-grey-100');
    
    // Reload chart if sensor is selected
    if (state.selectedSensor) {
      loadSensorChart(state.selectedSensor, timeRange);
    }
  });
});

// Functions for MCU management
function addMCU(name) {
  const mcuList = document.getElementById('mcuList');
  const mcuItem = document.createElement('div');
  mcuItem.className = 'mcu-item';
  mcuItem.innerHTML = `
    <button class="w-full flex items-center justify-between px-4 py-2 rounded-lg text-ash-grey-300 hover:bg-midnight-violet-800 transition group">
      <div class="flex items-center space-x-3">
        <i class="fas fa-microchip text-vintage-grape-400"></i>
        <span>${name}</span>
      </div>
      <div class="flex items-center space-x-2">
        <span class="w-2 h-2 bg-green-400 rounded-full"></span>
        <i class="fas fa-chevron-down text-xs"></i>
      </div>
    </button>
  `;
  mcuList.appendChild(mcuItem);
  
  showNotification('MCU added successfully', 'success');
}

function addSensor(name) {
  showNotification('Sensor add functionality - to be implemented with MCU selection', 'info');
}

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };
  
  notification.className = `fixed top-20 right-6 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300`;
  notification.textContent = message;
  notification.style.transform = 'translateX(400px)';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// MCU item click handlers (expand/collapse)
document.addEventListener('click', (e) => {
  const mcuButton = e.target.closest('.mcu-item > button');
  if (mcuButton) {
    const mcuItem = mcuButton.parentElement;
    const sensorList = mcuItem.querySelector('.sensor-list');
    const chevron = mcuButton.querySelector('.fa-chevron-down');
    
    if (sensorList) {
      sensorList.classList.toggle('hidden');
      chevron?.classList.toggle('rotate-180');
    }
  }
});

// Fetch all sensors for selector
async function fetchSensorList() {
  try {
    const response = await fetch('/api/sensors/list');
    if (response.ok) {
      const data = await response.json();
      state.sensors = data;
      populateSensorSelector(data);
    }
  } catch (error) {
    console.error('Error fetching sensor list:', error);
    sensorSelector.innerHTML = '<option value="">No sensors available</option>';
  }
}

// Populate sensor selector dropdown
function populateSensorSelector(sensors) {
  if (!sensorSelector) return;
  
  if (!sensors || sensors.length === 0) {
    sensorSelector.innerHTML = '<option value="">No sensors available</option>';
    return;
  }
  
  sensorSelector.innerHTML = '<option value="">Select a sensor...</option>';
  sensors.forEach(sensor => {
    const option = document.createElement('option');
    option.value = sensor.id || sensor.name;
    option.textContent = `${sensor.name} (${sensor.type}) - ${sensor.mcu}`;
    sensorSelector.appendChild(option);
  });
}

// Load sensor chart data
async function loadSensorChart(sensorId, timeRange) {
  const chartArea = document.getElementById('chartArea');
  if (!chartArea) return;
  
  chartArea.innerHTML = '<div class="flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin text-3xl text-vintage-grape-500"></i></div>';
  
  try {
    const response = await fetch(`/api/sensors/${sensorId}/data?range=${timeRange}`);
    if (response.ok) {
      const data = await response.json();
      renderChart(data);
    } else {
      chartArea.innerHTML = '<p class="text-silver-500">Error loading chart data</p>';
    }
  } catch (error) {
    console.error('Error loading chart:', error);
    chartArea.innerHTML = '<p class="text-silver-500">No data available for selected sensor</p>';
  }
}

// Render chart (placeholder - ready for chart library integration)
function renderChart(data) {
  const chartArea = document.getElementById('chartArea');
  if (!chartArea) return;
  
  // TODO: Integrate with Chart.js, ApexCharts, or similar
  chartArea.innerHTML = `
    <div class="w-full h-full flex flex-col items-center justify-center">
      <i class="fas fa-chart-area text-6xl text-vintage-grape-300 mb-4"></i>
      <p class="text-silver-600">Chart rendering ready</p>
      <p class="text-sm text-silver-500 mt-2">Data points: ${data.length || 0}</p>
    </div>
  `;
}

// Fetch sensor data for table
async function fetchSensorData() {
  try {
    const response = await fetch('/api/sensors');
    if (response.ok) {
      const data = await response.json();
      updateSensorTable(data);
      updateStats(data);
    }
  } catch (error) {
    console.error('Error fetching sensor data:', error);
  }
}

// Update stats cards
function updateStats(sensors) {
  const activeMCUs = new Set(sensors.filter(s => s.status === 'active').map(s => s.mcu)).size;
  const connectedSensors = sensors.filter(s => s.status === 'active').length;
  
  document.getElementById('statActiveMCUs').textContent = activeMCUs || '0';
  document.getElementById('statConnectedSensors').textContent = connectedSensors || '0';
  document.getElementById('statDataPoints').textContent = '-';
  document.getElementById('statAlerts').textContent = '0';
}

// Update sensor table
function updateSensorTable(sensors) {
  const tbody = document.getElementById('sensorTable');
  if (!tbody) return;
  
  if (!sensors || sensors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-silver-500 text-sm">No sensor data available</td></tr>';
    return;
  }
  
  tbody.innerHTML = sensors.map(sensor => `
    <tr class="border-b border-ash-grey-100 hover:bg-ash-grey-50">
      <td class="py-3 px-4 text-sm text-silver-800">${sensor.name}</td>
      <td class="py-3 px-4 text-sm text-silver-600">${sensor.mcu}</td>
      <td class="py-3 px-4 text-sm text-silver-600">${sensor.type}</td>
      <td class="py-3 px-4 text-sm font-medium text-midnight-violet-900">${sensor.value}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-1 text-xs ${sensor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} rounded-full">
          ${sensor.status === 'active' ? 'Active' : 'Warning'}
        </span>
      </td>
      <td class="py-3 px-4 text-sm text-silver-600">${sensor.lastUpdate}</td>
    </tr>
  `).join('');
}

// Navigation handling (SPA)
function navigateTo(view) {
  state.currentView = view;
  
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active', 'bg-vintage-grape-800', 'text-ash-grey-50');
  });
  
  const activeItem = document.querySelector(`[data-view="${view}"]`);
  if (activeItem) {
    activeItem.classList.add('active', 'bg-vintage-grape-800', 'text-ash-grey-50');
  }
  
  console.log(`Navigating to: ${view}`);
}

// Auto-refresh data every 5 seconds
setInterval(() => {
  fetchSensorData();
}, 5000);

// Initial data load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard loaded');
  
  // Set initial sidebar state
  if (window.innerWidth < 1024) {
    sidebar.classList.add('-translate-x-full');
    state.sidebarOpen = false;
  }
  
  // Load initial data
  fetchSensorList();
  fetchSensorData();
});
