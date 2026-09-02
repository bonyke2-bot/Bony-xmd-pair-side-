const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.post('/api/pair', async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: 'Number required' });

  const cleanNumber = number.replace(/[^0-9]/g, '');
  const sessionPath = `/tmp/${cleanNumber}`;
  
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
      await delay(1500);
      const code = await sock.requestPairingCode(cleanNumber);
      return res.json({ code: `BONY-BOT ${code}` });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate code. Try again.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pair.html'));
});

module.exports = app;
