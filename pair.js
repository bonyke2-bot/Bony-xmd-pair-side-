const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys")
const express = require("express")
const fs = require("fs")
const pino = require("pino")
const app = express()
app.use(require("cors")())
let sess = {}

app.get("/", (req,res)=> res.redirect("/pair.html"))
app.get("/pair.html", (req,res)=>{
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>BONY PAIR</title></head><body style="text-align:center;font-family:sans-serif;background:#0a0a0a;color:white;padding:20px"><h2 style="color:#25D366">BONY-XMD PAIR</h2><input id="num" placeholder="2547XXXXXXXX" style="padding:15px;width:85%;border-radius:10px;border:none"><br><br><button onclick="getCode()" style="padding:15px 30px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:bold">GET PAIR CODE</button><h1 id="code" style="color:#25D366;margin-top:20px;letter-spacing:5px;font-size:32px"></h1><p id="info" style="color:yellow"></p><pre id="session" style="background:#1a1a1a;padding:15px;word-break:break-all;text-align:left;color:#0f0;font-size:9px;border-radius:10px;max-height:200px;overflow:auto"></pre><script>async function getCode(){let n=document.getElementById("num").value.trim();if(!n)return alert("Enter 254...");document.getElementById("code").innerText="...";document.getElementById("info").innerText="Generating... 10 sec";try{let r=await fetch("/code?number="+n);let d=await r.json();if(d.code){document.getElementById("code").innerText=d.code;document.getElementById("info").innerText="CODE READY! WhatsApp > Linked Devices > Link with phone number (20sec only!)";checkSession()}else{document.getElementById("info").innerText="Error: "+(d.error||"try again")}}catch(e){document.getElementById("info").innerText="Network error, retry"}}function checkSession(){let i=setInterval(async()=>{let rr=await fetch("/session");let dd=await rr.json();if(dd.session){document.getElementById("session").innerText=dd.session;document.getElementById("info").innerText="SUCCESS! Copy SESSION above!";clearInterval(i)}},3000)}</script></body></html>`)
})

app.get("/code", async (req,res)=>{
  let num = (req.query.number||"").replace(/[^0-9]/g,"")
  console.log(">> CODE REQUEST:", num)
  try{
    if(fs.existsSync("./auth")) fs.rmSync("./auth",{recursive:true,force:true})
    sess={}
    const { state, saveCreds } = await useMultiFileAuthState("./auth")
    const sock = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"silent"})) },
      logger: pino({level:"silent"}),
      printQRInTerminal: false,
      browser: Browsers.macOS("Chrome"),
      syncFullHistory: false
    })
    sock.ev.on("creds.update", saveCreds)
    sock.ev.on("connection.update", async(u)=>{
      if(u.connection==="open"){
        await delay(2000)
        let creds = fs.readFileSync("./auth/creds.json","utf-8")
        sess.session = "BONY-XMD~"+Buffer.from(creds).toString("base64")
        console.log("\n=== SESSION CREATED ===\n", sess.session.slice(0,100)+"...\n")
      }
    })
    await delay(5000)
    if(!sock.authState.creds.registered){
      let code = await sock.requestPairingCode(num)
      console.log("PAIR CODE:", code)
      return res.json({code})
    } else {
      return res.json({error:"Already registered, delete auth folder"})
    }
  }catch(e){
    console.log("ERROR:", e.message)
    res.json({error:e.message})
  }
})
app.get("/session", (req,res)=> res.json(sess))
app.listen(process.env.PORT||10000, ()=>console.log("RUNNING ON "+(process.env.PORT||10000)))
