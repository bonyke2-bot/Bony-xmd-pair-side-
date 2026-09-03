import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
import pino from 'pino'
import fs from 'fs'
import Baileys from '@whiskeysockets/baileys'
const makeWASocket = Baileys.default
const { useMultiFileAuthState, makeCacheableSignalKeyStore, delay } = Baileys

export default async function handler(req, res) {
  try {
    let number = (req.query.number || '').replace(/[^0-9]/g, '')
    if(!number) return res.json({ error: 'number missing' })
    
    // FIX 1: Random folder kila mtu, sio /tmp/number pekee
    const dir = '/tmp/' + number + '_' + Date.now()
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    
    const { state, saveCreds } = await useMultiFileAuthState(dir)
    
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu','Chrome','20.0.04'],
      printQRInTerminal: false
    })
    
    sock.ev.on('creds.update', saveCreds)
    
    await delay(3000) // FIX 2: Ngoja socket i-connect kwanza
    
    const code = await sock.requestPairingCode(number)
    
    // FIX 3: Tuma response lakini usizime socket
    res.json({ code })
    
    // Keep alive 90 seconds
    sock.ev.on('connection.update', async ({ connection }) => {
      if(connection === 'open'){
        await delay(3000)
        try{
          const creds = fs.readFileSync(dir+'/creds.json','utf-8')
          const sessionId = Buffer.from(creds).toString('base64')
          await sock.sendMessage(number+'@s.whatsapp.net', { text: sessionId })
        }catch{}
      }
    })
    
    // Keep function alive
    await delay(90000)
    try{ fs.rmSync(dir, { recursive: true, force: true }) }catch{}
    
  } catch(e){
    return res.json({ error: e.message })
  }
}
