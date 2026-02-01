// Sidebar functionality
console.log('Dashboard inicializován');

// State management
const state = {
  sidebarOpen: window.innerWidth >= 1024
};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const logoutBtn = document.getElementById('logout');

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


// Initial sidebar state
document.addEventListener('DOMContentLoaded', () => {
  console.log('Sidebar loaded');
  
  if (window.innerWidth < 1024) {
    sidebar.classList.add('-translate-x-full');
    state.sidebarOpen = false;
  }
});
