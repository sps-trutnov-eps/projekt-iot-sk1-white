const dgram = require('dgram');

function sendMagicPacket(mac) {
    console.log("bagrsss")
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

        socket.bind({ address: '192.168.1.100' }, () => {
            socket.setBroadcast(true);
            socket.send(buf, 0, buf.length, 9, '192.168.1.255', () => {
                socket.close();
                resolve();
            });
        });
    });
}

module.exports = { sendMagicPacket };