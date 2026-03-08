const dgram = require('dgram');

function sendMagicPacket(mac) {
    return new Promise((resolve, reject) => {
        const macHex = mac.replace(/[:\-]/g, '');
        if (macHex.length !== 12) return reject(new Error('Neplatná MAC adresa'));

        const buf = Buffer.alloc(102);
        buf.fill(0xff, 0, 6);
        for (let i = 1; i <= 16; i++) {
            Buffer.from(macHex, 'hex').copy(buf, i * 6);
        }

        const socket = dgram.createSocket('udp4');
        socket.once('error', (err) => { socket.close(); reject(err); });

        socket.bind(() => {
            socket.setBroadcast(true);
            socket.send(buf, 0, buf.length, 9, '255.255.255.255', () => {
                socket.close();
                resolve();
            });
        });
    });
}

module.exports = { sendMagicPacket };