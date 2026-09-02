const express = require('express');
const path = require('path');
const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.post('/pair', async (req, res) => {
  let { number, server } = req.body;
  if (!number) return res.status(400).json({ error: 'Number required' });
  
  // FIXES "WRONG NUMBER" - removes + spaces () 
  number = number.replace(/[^0-9]/g, '');
  if (number.length < 10) return res.json({ error: 'Wrong number format. Use: 254748339103' });

  console.log(`Pairing on ${server} for ${number}`);
  const sessionId = `session_${number}`;
  if(!fs.existsSync(sessionId)) fs.mkdirSync(sessionId);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionId);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('BONY-XMD')
    });

    sock.ev.on('creds.update', saveCreds);

    let sent = false;
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if(connection === 'open' && !sent){
        sent = true;
        const code = await sock.requestPairingCode(number);
        const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
        res.json({ code: formattedCode });
        await delay(5000);
        sock.ws.close();
      }
    })

    setTimeout(() => {
      if(!sent) {
        res.json({ error: 'Timeout. WhatsApp did not respond. Try again' });
        sock.ws.close();
      }
    }, 20000);

  } catch (err) {
    console.log(err);
    res.json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BONY XMD Running on ${PORT}`));
