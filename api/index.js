import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
import pino from 'pino'
import fs from 'fs'
import makeWASocket, { useMultiFileAuthState, delay } from '@whiskeysockets/baileys'

export default async function handler(req, res) {
  const number = (req.query.number || '').replace(/[^0-9]/g, '') || '254748339103'
  const dir = '/tmp/' + number
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    const { state, saveCreds } = await useMultiFileAuthState(dir)
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ['BONY XMD', 'Chrome', '1.0'] })
    sock.ev.on('creds.update', saveCreds)
    await delay(2000)
    const code = await sock.requestPairingCode(number)

    sock.ev.on('connection.update', async (u) => {
      if (u.connection === 'open') {
        await delay(4000)
        try {
          const creds = fs.readFileSync(dir + '/creds.json', 'utf-8')
          const sessionId = Buffer.from(creds).toString('base64')
          const jid = number + '@s.whatsapp.net'
          const text = `*BONY XMD V3 CONNECTED ✅*\n\n*Admin:* 254748339103\n*Number:* ${number}\n\n*🔑 YOUR SESSION ID:*\n${sessionId}\n\n*📦 Repo:*\nhttps://github.com/bonyke2-bot/BONY-XMD\n\n*👥 Group:*\nhttps://chat.whatsapp.com/BEr0VScxfRDB82TSdo3EWT`
          await sock.sendMessage(jid, { text: text })
          await sock.sendMessage(jid, { text: sessionId })
        } catch {}
      }
    })

    return res.send(`
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{background:#070b14;color:#fff;font-family:Arial;padding:15px;text-align:center}.box{background:#141b2d;border-radius:18px;padding:25px;max-width:380px;margin:20px auto;border:1px solid #1e2a4a}.code{font-size:32px;color:#4fc3f7;letter-spacing:6px;font-weight:bold;background:#0a1020;padding:15px;border-radius:12px;margin:15px 0;border:1px dashed #4fc3f7}.btn{display:block;background:#4fc3f7;color:#000;padding:12px;border-radius:10px;text-decoration:none;margin:8px 0;font-weight:bold}</style>
    </head><body><div class="box">
    <h2>BONY XMD ✅</h2><p>Pair Code for <b>${number}</b></p>
    <div class="code">${code}</div>
    <p style="font-size:13px">Weka code WhatsApp > Linked Devices<br><b style="color:#00ff00">SESSION itatumwa WhatsApp kwako direct</b></p>
    <a class="btn" href="https://wa.me/254748339103">Admin 254748339103</a>
    <a class="btn" href="https://github.com/bonyke2-bot/BONY-XMD">Repo</a>
    <a class="btn" href="https://chat.whatsapp.com/BEr0VScxfRDB82TSdo3EWT">Support Group</a>
    </div></body></html>`)
  } catch(e){ return res.json({ error: e.message }) }
}
