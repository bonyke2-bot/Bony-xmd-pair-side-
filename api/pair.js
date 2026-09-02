const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  let { number, server } = req.body;
  if (!number) return res.status(400).json({ error: 'Number required' });
  
  // CLEAN NUMBER - THIS FIXES "WRONG NUMBER"
  number = number.replace(/[^0-9]/g, '');
  if (number.length < 10) return res.json({ error: 'Wrong number format. Use: 254748339103' });

  const sessionId = `/tmp/session_${number}_${Date.now()}`; // Vercel only allows /tmp
  if(!fs.existsSync(sessionId)) fs.mkdirSync(sessionId, { recursive: true });

  try {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionId);
    
    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'), // Use Mac to avoid ban
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
    });

    sock.ev.on('creds.update', saveCreds);

    let sent = false;
    sock.ev.on('connection.update', async (update) => {
      const { connection } = update;
      
      if(connection === 'open' && !sent){
        sent = true;
        await delay(4000); // Wait for WA to be ready
        const code = await sock.requestPairingCode(number);
        const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
        res.status(200).json({ code: formattedCode });
        await delay(8000);
        sock.ws.close();
        fs.rmSync(sessionId, { recursive: true, force: true }); // Cleanup
      }
    })

    setTimeout(() => {
      if(!sent) {
        res.status(200).json({ error: 'Timeout.
