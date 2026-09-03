import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
import pino from 'pino'
import fs from 'fs'
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, delay } from '@whiskeysockets/baileys'

export default async function handler(req, res) {
  try {
    let number = (req.query.number || '').replace(/[^0-9]/g, '')
    if(!number) return res.json({ error: 'number missing' })
    
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
    await delay(3000)
    
    const code = await sock.requestPairingCode(number)
    res.json({ code })
    
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
    
    await delay(90000)
    try{ fs.rmSync(dir, { recursive: true, force: true }) }catch{}
    
  } catch(e){
    return res.json({ error: e.message })
  }
}
