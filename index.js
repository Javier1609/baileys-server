const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
  } = require('@whiskeysockets/baileys');
  
  const express = require('express');
  const qrcode = require('qrcode-terminal');
  
  const app = express();
  app.use(express.json());
  
  let sock;
  
  async function iniciarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');
  
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true
    });
  
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
  
      if (qr) qrcode.generate(qr, { small: true });
  
      if (connection === 'close') {
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Conexión cerrada. ¿Reconectar?', shouldReconnect);
        if (shouldReconnect) iniciarWhatsApp();
      }
  
      if (connection === 'open') {
        console.log('✅ ¡WhatsApp conectado!');
      }
    });
  
    sock.ev.on('creds.update', saveCreds);
  
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const m = messages[0];
      if (!m.key.fromMe && m.message?.conversation) {
        const telefono = m.key.remoteJid.replace(/@s\.whatsapp\.net/, '');
        const mensaje = m.message.conversation;
        console.log(`📥 Mensaje recibido de ${telefono}: ${mensaje}`);
      }
    });
  }
  
  iniciarWhatsApp();
  
  app.post('/send', async (req, res) => {
    const { to, message } = req.body;
    try {
      await sock.sendMessage(`${to}@s.whatsapp.net`, { text: message });
      console.log('✅ Enviado a', to);
      res.json({ status: 'enviado' });
    } catch (e) {
      console.error('❌ Error al enviar:', e);
      res.status(500).json({ error: e.toString() });
    }
  });
  
  app.listen(3000, () => {
    console.log('🌐 Servidor escuchando en http://localhost:3000');
  });
  