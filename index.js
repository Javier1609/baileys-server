const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();

app.use(express.json());

let sock;

async function iniciarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            if (shouldReconnect) iniciarWhatsApp();
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarWhatsApp();

// ENDPOINT para recibir mensajes
app.post('/send', async (req, res) => {
    const { to, message } = req.body;
    try {
        await sock.sendMessage(to + '@s.whatsapp.net', { text: message });
        return res.json({ status: 'ok' });
    } catch (err) {
        console.error('❌ Error enviando mensaje:', err);
        return res.status(500).json({ error: 'Error enviando mensaje' });
    }
});

app.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');
});
