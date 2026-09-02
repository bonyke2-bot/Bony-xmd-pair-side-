import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import { default as makeWASocket, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

let sock;
let qrData = null;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/pair', async (req, res) => {
  try {
    const { number } = req.body;
    if(!number) return res.status(400).json({ error: 'Enter number' });
    
    const sessionId = 'BONY-BOT_' + crypto.randomBytes(4).toString('hex');
    const { state, saveCreds } = await useMultiFileAuthState(sessionId);
    
    sock = makeWASocket({
      auth: state,
      browser: Browsers.macOS('BONY XMD'),
      printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
      const { qr } = update;
      if(qr) qrData = qr;
    });
    
    await new Promise(r => setTimeout(r, 1500));
    const code = await sock.requestPairingCode(number);
    return res.json({ code: code });
    
  } catch(e){
    res.json({ error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('BONY XMD Running on', PORT));
