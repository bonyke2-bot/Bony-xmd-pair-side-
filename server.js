app.post('/pair', async (req, res) => {
  const { number } = req.body;
  if (!number) return res.json({ error: 'Number required' });

  try {
    const sessionId = `session_${number}`; // unique folder per number
    const { state, saveCreds } = await useMultiFileAuthState(sessionId);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('BONY-XMD')
    });

    sock.ev.on('creds.update', saveCreds);

    await delay(2000);
    
    const code = await sock.requestPairingCode(number);
    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

    res.json({ code: formattedCode });

    setTimeout(() => sock.ws.close(), 10000);

  } catch (err) {
    console.log(err);
    res.json({ error: err.message });
  }
});
