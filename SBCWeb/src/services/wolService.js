const dgram = require('dgram');
const os = require('os');
const config = require('../config/config');

function getLocalAddress() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const entry of iface) {
            if (entry.family === 'IPv4' && !entry.internal) {
                return entry.address;
            }
        }
    }
    return '0.0.0.0'; // fallback – OS si vybere sám
}

function getBroadcastAddress(localAddress) {
    const parts = localAddress.split('.').map(Number);
    parts[3] = 255;
    return parts.join('.');
}

function sendMagicPacket(mac) {
    return new Promise((resolve, reject) => {
        const macHex = mac.replace(/[:\-]/g, '');
        if (macHex.length !== 12) return reject(new Error('Neplatná MAC adresa'));

        const buf = Buffer.alloc(102);
        buf.fill(0xff, 0, 6);
        for (let i = 1; i <= 16; i++) {
            Buffer.from(macHex, 'hex').copy(buf, i * 6);
        }

        const localAddress = getLocalAddress();
        const broadcastAddress = getBroadcastAddress(localAddress);

        console.log(`Odesílám z ${localAddress} na ${broadcastAddress}`);

        const socket = dgram.createSocket('udp4');
        socket.once('error', (err) => { socket.close(); reject(err); });

        socket.bind({ address: localAddress }, () => {
            socket.setBroadcast(true);
            socket.send(buf, 0, buf.length, config.wol_udp_port, broadcastAddress, () => {
                socket.close();
                resolve();
            });
        });
    });
}

module.exports = { sendMagicPacket };