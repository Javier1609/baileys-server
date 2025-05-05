const express = require("express");
const qrcode = require("qrcode");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@adiwajshing/baileys");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

let sock;
let currentQR = "";

async function iniciarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = await qrcode.toDataURL(qr); // Convierte el QR en imagen base64
      console.log("🔄 Nuevo QR generado");
    }

    if (connection === "open") {
      console.log("✅ ¡WhatsApp conectado!");
      currentQR = ""; // Elimina el QR una vez conectado
    }

    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) iniciarWhatsApp();
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Endpoint para ver el QR en imagen
app.get("/qr", (req, res) => {
  if (!currentQR) return res.send("✅ Ya estás conectado a WhatsApp.");
  res.send(`
    <h2>Escanea el código QR con WhatsApp</h2>
    <img src="${currentQR}" />
  `);
});

// Endpoint para enviar mensaje
app.post("/send", async (req, res) => {
  const { to, message } = req.body;
  if (!sock) return res.status(500).json({ error: "No hay conexión con WhatsApp" });

  try {
    await sock.sendMessage(to + "@s.whatsapp.net", { text: message });
    res.json({ status: "enviado" });
  } catch (e) {
    res.status(500).json({ status: "fallido", error: e.toString() });
  }
});

iniciarWhatsApp();

app.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp en puerto ${PORT}`);
});
