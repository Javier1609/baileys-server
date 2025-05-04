const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const { state, saveState } = useSingleFileAuthState('./auth_info.json'); // IMPORTANTE

const app = express();
app.use(express.json());

async function startSocket() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true // MUY IMPORTANTE
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('✅ ¡WhatsApp conectado!');
    } else if (connection === 'close') {
      console.log('❌ Conexión cerrada. ¿Reconectar?', update);
      startSocket(); // intenta reconectar
    }
  });

  app.post('/send', async (req, res) => {
    const { to, message } = req.body;
    try {
      await sock.sendMessage(to + '@s.whatsapp.net', { text: message });
      res.send({ status: 'enviado' });
    } catch (e) {
      console.error('Error al enviar:', e);
      res.status(500).send({ status: 'error', error: e.toString() });
    }
  });

  app.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');
  });
}

startSocket();
