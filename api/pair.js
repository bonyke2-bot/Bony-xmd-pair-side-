const { default: makeWASocket, useSingleFileAuthState, Browsers, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'GET') {
    return res.status(200).send(`
<!DOCTYPE html><html><head><title>BONY XMD PAIR</title>
<style>body{background:#000;color:#0f0;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh} .box{background:#111;padding:30px;border-radius:10px;border:1px solid #0f0} input,button{padding:10px;width:100%;margin:5px 0;background:#000;color:#0f0;border:1px solid #0f0}</style>
</head><body><div class="box"><h2>BONY XMD PAIR</h2>
<input id="num" placeholder="2547XXXXXXXX"><button onclick="p()">Get Code</button><h3 id="r"></h3></div>
<script>async function p(){document.getElementById('r').innerText='Wait...';
let n=document.getElementById('num').value;let x=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:n})});
let d=await x.json();document.getElementById('r').innerText=d.code||d.error}</script></body></html>`);
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
      printQRInTerminal: false,
      logger: { level: 'fatal' },
      browser: Browsers.macOS('Desktop')
    });

    sock.ev.on('creds.update', saveCreds);

    try {
      await delay(1000);
      if(!sock.authState.creds.registered){
        const code = await sock.requestPairingCode(cleanNumber);
        await sock.logout();
        return res.json({ code: `BONY-BOT ${code}` });
      }
    } catch (e) {
      return res.status(500).json({ error: e.message || "Failed to get code" });
    }
  }
}
