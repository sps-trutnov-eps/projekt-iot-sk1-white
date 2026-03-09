export function getMcuId() {
    return window.location.pathname.split('/').pop();
}

export function getSensorStyle(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('temp'))                          return { icon: 'fa-thermometer-half', color: 'text-vintage-grape-600' };
    if (t.includes('hum'))                           return { icon: 'fa-tint',             color: 'text-blue-500'          };
    if (t.includes('press'))                         return { icon: 'fa-tachometer-alt',   color: 'text-emerald-500'       };
    if (t.includes('volt'))                          return { icon: 'fa-bolt',             color: 'text-yellow-500'        };
    if (t.includes('curr') || t.includes('current')) return { icon: 'fa-plug',             color: 'text-orange-500'        };
    if (t.includes('power'))                         return { icon: 'fa-fire',             color: 'text-red-500'           };
    if (t.includes('energy'))                        return { icon: 'fa-leaf',             color: 'text-green-500'         };
    if (t.includes('fan')  || t.includes('rpm'))     return { icon: 'fa-fan',              color: 'text-cyan-500'          };
    if (t.includes('co2'))                           return { icon: 'fa-wind',             color: 'text-gray-500'          };
    if (t.includes('signal') || t.includes('rssi'))  return { icon: 'fa-wifi',             color: 'text-midnight-violet-500' };
    return { icon: 'fa-chart-line', color: 'text-gray-400' };
}

export function translateType(type) {
    const types = { 'temperature': 'Teplota', 'humidity': 'Vlhkost', 'pressure': 'Tlak', 'voltage': 'Napětí', 'generic': 'Ostatní' };
    return types[type] || type;
}