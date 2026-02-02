// TODO: Implementuj sidebar toggle funkci
// Elementy:
// - sidebar: document.getElementById('sidebar')
// - mainContent: document.getElementById('mainContent')
// - toggleSidebarBtn: document.getElementById('toggleSidebarBtn')
// - overlay: document.getElementById('sidebarOverlay')


const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const toggleSidebarDesktop = document.getElementById('toggleSidebarDesktop');
const overlay = document.getElementById('sidebarOverlay');

// Sidebar toggle funkce
let sidebarVisible = false; // Sidebar je defaultně schovaný

toggleSidebarDesktop.addEventListener('click', function() {
  sidebarVisible = !sidebarVisible;
  
  // 1. Skrytí/zobrazení sidebaru
  sidebar.classList.toggle('-translate-x-full');
  
  // 2. Změna marginu main contentu
  mainContent.classList.toggle('lg:ml-64');
  mainContent.classList.toggle('lg:ml-0');
  
  // 3. Otočení šipek
  const icon = toggleSidebarDesktop.querySelector('i');
  if (sidebarVisible) {
    icon.classList.remove('fa-angles-right');
    icon.classList.add('fa-angles-left');
  } else {
    icon.classList.remove('fa-angles-left');
    icon.classList.add('fa-angles-right');
  }
});