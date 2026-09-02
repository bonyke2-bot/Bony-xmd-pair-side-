const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

export default async function handler(req, res) {
  // Serve the HTML page
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BONY XMD PAIR</title>
<style>
body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
.box{background:#1a1a1a;padding:30px;border-radius:15px;width:90%;max-width:400px;text-align:center;border:1px solid #00ff88}
input{width:100%;padding:12px;margin:10px 0;background:#0a0a0a;border:1px solid #00ff88;color:#fff;border-radius:8px;box-sizing:border-box}
button{width:100%;padding:12px;background:#00ff88;color:#000;border:none;border-radius:8px;font-weight:bold;cursor:pointer}
#result{margin-top:15px;font-size:18px;color:#00ff88;word-break:break-word}
</style>
</head>
<body>
<div class="box">
<h2>🔥 BONY XMD PAIR 🔥</h2>
<input type="text" id="number" placeholder="254748339103">
<button onclick="pair()">⚡ Generate Session</button>
<div id="result"></div>
</div>
<script>
async function pair(){
const num = document.getElementById('number').value;
document.getElementById('result').innerText = 'Generating...';
const r = await fetch('/api/pair', {method: 'POST',headers: {'Content-Type': 'application/json'},body: JSON.stringify({number: num})});
const data = await r.json();
document.getElementById('result').innerText = data.code || data.error;
}
</script>
</body>
</html>
    `);
  }

  // Handle pairing code request
  if (req.method === 'POST') {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Number required' });

    const cleanNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = `/tmp/${cleanNumber}-${Date.now()}`;
    
    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome')
      });

      sock.ev.on('creds.update', saveCreds);

      if (!sock.authState.creds.registered) {
        await delay(2000);
        const code = await sock.requestPairingCode(cleanNumber);
        await sock.logout(); // close connection
        return res.json({ code: `BONY-BOT ${code}` });
      }

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed. Try again in 10s' });
    }
  }
}
