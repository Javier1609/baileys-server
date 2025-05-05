const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const express = require('express')
const qrcode = require('qrcode-terminal')
const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3000

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) qrcode.generate(qr, { small: true })

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) {
                console.log('🔁 Reintentando conexión...')
                startBot()
            }
        } else if (connection === 'open') {
            console.log('✅ ¡WhatsApp conectado!')
        }
    })

    app.post('/send', async (req, res) => {
        const { to, message } = req.body
        try {
            await sock.sendMessage(to + '@s.whatsapp.net', { text: message })
            res.json({ status: 'enviado' })
        } catch (err) {
            console.error('❌ Error enviando mensaje:', err)
            res.status(500).json({ status: 'fallido' })
        }
    })
}

startBot()

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`)
})
