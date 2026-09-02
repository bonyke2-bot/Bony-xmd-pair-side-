import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
import pino from 'pino'
import fs from 'fs'
import Baileys from '@whiskeysockets/baileys'
const makeWASocket = Baileys.default
const { useMultiFileAuthState, delay } = Baileys

export default async function handler(req, res) {
  const number = (req.query.number || req.body?.number || '').toString().replace(/[^0-9]/g, '') || '254748339103'
  const dir = '/tmp/' + number
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    const { state, saveCreds } = await useMultiFileAuthState(dir)
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ['BONY XMD','Chrome','1.0'] })
    sock.ev.on('creds.update', saveCreds)
    await delay(2000)
    const code = await sock.requestPairingCode(number)

    sock.ev.on('connection.update', async (u) => {
      if (u.connection === 'open') {
        await delay(3000)
        try {
          const creds = fs.readFileSync(dir + '/creds.json','utf-8')
          const sessionId = Buffer.from(creds).toString('base64')
          const jid = number + '@s.whatsapp.net'
          const txt = `*BONY XMD V3 ✅*\n\n*Admin:* 254748339103\n*Number:* ${number}\n\n*SESSION ID:*\n${sessionId}\n\n*Repo:*\nhttps://github.com/bonyke2-bot/BONY-XMD\n\n*Group:*\nhttps://chat.whatsapp.com/BEr0VScxfRDB82TSdo3EWT`
          await sock.sendMessage(jid, { text: txt })
        } catch{}
      }
    })

    return res.json({ code, message: "Enter this code in WhatsApp > Linked Devices" })
  } catch(e){ return res.status(500).json({ error: e.message }) }
}
