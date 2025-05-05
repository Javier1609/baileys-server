const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const express = require('express');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth'); // Carpeta para sesión persistente

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('🔑 Escanea este QR para iniciar sesión:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('🔌 Conexión cerrada. ¿Reconectar?', shouldReconnect);
            if (shouldReconnect) {
                iniciarBot();
            }
        }

        if (connection === 'open') {
            console.log('✅ ¡WhatsApp conectado!');
        }
    });

    // Endpoint para enviar mensaje
    app.post('/send', async (req, res) => {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'Falta número o mensaje' });
        }

        try {
            const numero = to.startsWith('34') ? to : `34${to}`; // Añadir prefijo si no está
            await sock.sendMessage(`${numero}@s.whatsapp.net`, { text: message });
            console.log('📤 Mensaje enviado a:', numero);
            res.status(200).json({ status: 'enviado' });
        } catch (err) {
            console.error('❌ Error al enviar mensaje:', err);
            res.status(500).json({ error: 'Error enviando mensaje' });
        }
    });

    app.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
}

iniciarBot();
