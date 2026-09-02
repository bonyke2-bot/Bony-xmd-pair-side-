import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto
}
import pino from 'pino'
import fs from 'fs'
import makeWASocket, { useMultiFileAuthState, delay } from '@whiskeysockets/baileys'

export default async function handler(req, res) {
  let number = (req.query.number || '').replace(/[^0-9]/g, '')
  if (!number) {
    return res.status(200).send('<h1>BONY V2 VERCEL ✅</h1><p>No crypto error. Use /?number=2547XXXXXXXX</p>')
  }
  try {
    let dir = '/tmp/' + number
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    let { state, saveCreds } = await useMultiFileAuthState(dir)
    let sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ['BONY', 'Chrome', '1.0'] })
    sock.ev.on('creds.update', saveCreds)
    await delay(3000)
    let code = await sock.requestPairingCode(number)
    return res.json({ code: code })
  } catch (e) {
    return res.json({ error: e.message })
  }
}
