const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys")
const express = require("express")
const fs = require("fs")
const pino = require("pino")
const app = express()
let sess = {}

app.get("/", (req,res)=> res.redirect("/pair.html"))
app.get("/pair.html", (req,res)=>{
  res.send(`
  <html><head><title>BONY PAIR</title></head>
  <body style="text-align:center;font-family:Arial;padding:20px;background:#111;color:white">
  <h2>BONY-XMD PAIR CODE</h2>
  <input id="num" placeholder="2547XXXXXXXX" style="padding:12px;width:80%"><br><br>
  <button onclick="getCode()" style="padding:12px 25px;background:#25D366;color:white;border:none;font-size:16px">GET CODE</button>
  <h1 id="code" style="color:#25D366;margin-top:20px"></h1>
  <pre id="session" style="background:#222;padding:10px;word-break:break-all;text-align:left"></pre>
  <script>
  async function getCode(){
    let n=document.getElementById("num").value
    document.getElementById("code").innerText="Wait 5 sec..."
    let r=await fetch("/code?number="+n)
    let d=await r.json()
    document.getElementById("code").innerText=d.code||d.error
    if(d.code) setInterval(async()=>{
      let rr=await fetch("/session")
      let dd=await rr.json()
      if(dd.session) document.getElementById("session").innerText=dd.session
    },3000)
  }
  </script></body></html>`)
})

app.get("/code", async (req,res)=>{
  try{
    let num=(req.query.number||"").replace(/[^0-9]/g,"")
    if(fs.existsSync("./auth")) fs.rmSync("./auth",{recursive:true,force:true})
    sess={}
    const { state, saveCreds } = await useMultiFileAuthState("./auth")
    const sock = makeWASocket({ auth:{ creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"silent"})) }, logger:pino({level:"silent"}), browser:["BONY-XMD","Chrome","1.0"] })
    sock.ev.on("creds.update", saveCreds)
    sock.ev.on("connection.update", async(u)=>{
      if(u.connection==="open"){
        let c=fs.readFileSync("./auth/creds.json","utf-8")
        sess.session="BONY-XMD~"+Buffer.from(c).toString("base64")
        console.log("SESSION:", sess.session)
      }
    })
    if(!sock.authState.creds.registered){
      await delay(4000)
      let code=await sock.requestPairingCode(num)
      return res.json({code:code})
    }
  }catch(e){ res.json({error:e.message}) }
})
app.get("/session", (req,res)=> res.json(sess))
app.listen(10000, ()=>console.log("PAIR SIDE RUNNING ON 10000"))
