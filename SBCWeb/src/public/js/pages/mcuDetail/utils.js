export function getMcuId() {
    return window.location.pathname.split('/').pop();
}

export function getSensorStyle(type) {
    const t = type.toLowerCase();
    if (t.includes('temp') || t.includes('teplota')) return { icon: 'fa-thermometer-half', color: 'text-vintage-grape-600' };
    if (t.includes('hum') || t.includes('vlhkost')) return { icon: 'fa-tint', color: 'text-blue-500' };
    if (t.includes('press') || t.includes('tlak')) return { icon: 'fa-tachometer-alt', color: 'text-emerald-500' };
    if (t.includes('co2') || t.includes('air')) return { icon: 'fa-wind', color: 'text-gray-600' };
    if (t.includes('light') || t.includes('světlo') || t.includes('lux')) return { icon: 'fa-sun', color: 'text-amber-500' };
    if (t.includes('volt') || t.includes('napětí') || t.includes('batt')) return { icon: 'fa-bolt', color: 'text-yellow-600' };
    if (t.includes('rssi') || t.includes('signal') || t.includes('wifi')) return { icon: 'fa-wifi', color: 'text-midnight-violet-900' };
    return { icon: 'fa-chart-line', color: 'text-gray-400' };
}

export function translateType(type) {
    const types = { 'temperature': 'Teplota', 'humidity': 'Vlhkost', 'pressure': 'Tlak', 'voltage': 'Napětí', 'generic': 'Ostatní' };
    return types[type] || type;
}