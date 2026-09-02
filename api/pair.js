import makeWASocket, { useSingleFileAuthState, Browsers, fetchLatestBaileysVersion, delay } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'GET') {
    return res.status(200).send(`<!DOCTYPE html><html><head><title>BONY XMD PAIR</title><style>body{background:#000;color:#0f0;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;margin:0} .box{background:#111;padding:30px;border-radius:10px;border:1px solid #0f0;width:90%;max-width:400px;text-align:center} input,button{padding:12px;width:100%;margin:10px 0;background:#000;color:#0f0;border:1px solid #0f0;border-radius:8px;box-sizing:border-box} button{font-weight:bold;cursor:pointer}</style></head><body><div class="box"><h2>🔥 BONY XMD PAIR 🔥</h2><input id="num" placeholder="254748339103"><button onclick="p()">⚡ Get Code</button><h3 id="r"></h3></div><script>async function p(){document.getElementById('r').innerText='Generating...';let n=document.getElementById('num').value;let x=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:n})});let d=await x.json();document.getElementById('r').innerText=d.code||d.error}</script></body></html>`);
  }

  if (req.method === 'POST') {
    const { number } = req.body;
    if(!number) return res.status(400).json({error: "Number required"});
    
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const { state, saveCreds } = useSingleFileAuthState(`/tmp/${cleanNumber}.json`);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'fatal' }),
      browser: Browsers.macOS('Desktop')
    });

    sock.ev.on('creds.update', saveCreds);

    try {
      await delay(2000);
      if(!sock.authState.creds.registered){
        const code = await sock.requestPairingCode(cleanNumber);
        await sock.ws.close();
        return res.json({ code: `BONY-BOT ${code}` });
      }
    } catch (e) {
      return res.status(500).json({ error: e.message || "Failed to get code" });
    }
  }
}
