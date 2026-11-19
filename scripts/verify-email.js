// Isolated SMTP/IMAP integration fixture; never contacts an external mail server.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),tls=require('node:tls'),net=require('node:net');
const {spawnSync,spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.local/email-test'),accountFile=path.join(root,'.local/email/account.json');
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
const dockerArgs=[...(process.env.NAV_DOCKER_SOCKET?['--host='+process.env.NAV_DOCKER_SOCKET]:process.platform==='linux'?['--host=unix:///var/run/docker.sock']:[])];
function docker(args){const p=spawnSync('docker',[...dockerArgs,...args],{env,encoding:'utf8'});if(p.status!==0)throw Error('Email fixture Docker command failed');return p.stdout.trim()}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function api(route,data){const r=await fetch('http://127.0.0.1:3001/api/email/'+route,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const b=await r.json();if(!r.ok)throw Error(b.error||'Fixture request failed');return b}
async function main(){
 if(fs.existsSync(accountFile))throw Error('Disconnect email before running this isolated test');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const key=path.join(dir,'key.pem'),cert=path.join(dir,'cert.pem');
 const generated=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-days','1'],{stdio:'ignore'});if(generated.status)throw Error('Fixture TLS certificate generation failed');
 const password=crypto.randomBytes(24).toString('hex'),address='fixture@nav.test';let container,server;const proxies=[];
 try{
  container=docker(['run','--rm','-d','--name','nav-email-test-'+crypto.randomBytes(4).toString('hex'),'-p','127.0.0.1:33025:3025','-p','127.0.0.1:33143:3143','-e','GREENMAIL_OPTS=-Dgreenmail.setup.test.smtp -Dgreenmail.setup.test.imap -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users=fixture:'+password+'@nav.test','greenmail/standalone@sha256:d6db42a4fc258fec0948b1ae7b579fd06947cc92087c162ec0597972a6c36850']);
  for(const [secure,plain]of [[33993,33143],[33465,33025]]){const proxy=tls.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},socket=>{const upstream=net.connect(plain,'127.0.0.1');socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>upstream.destroy());upstream.on('close',()=>socket.destroy());socket.pipe(upstream).pipe(socket)});await new Promise(r=>proxy.listen(secure,'127.0.0.1',r));proxies.push(proxy)}
  server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'3001',MATRIX_ACCESS_TOKEN:'',NODE_EXTRA_CA_CERTS:cert},stdio:'ignore'});
  for(let i=0;i<40;i++){try{await api('status');break}catch{}await wait(250)}
  const account={address,username:'fixture',password,imap:{host:'127.0.0.1',port:33993,secure:true},smtp:{host:'127.0.0.1',port:33465,secure:true}};
  let connected=false;for(let i=0;i<30;i++){try{await api('configure',account);connected=true;break}catch{await wait(500)}}if(!connected)throw Error('Fixture mail server did not become ready');
  const status=await api('status');if(JSON.stringify(status).includes(password))throw Error('Email credential leaked');
  const bytes=Buffer.from([0,255,1,128,42]);
  const send=await api('send',{to:address,subject:'Mail fixture',text:'Local fixture content',attachments:[{filename:'arbitrary.fixture',contentType:'application/octet-stream',contentBase64:bytes.toString('base64')}]});if(send.accepted.length!==1)throw Error('SMTP did not accept fixture');
  let inbox;for(let i=0;i<20;i++){inbox=await api('inbox');if(inbox.items.length)break;await wait(250)}
  const item=inbox.items.find(m=>m.subject==='Mail fixture');if(!item||item.read)throw Error('Inbox metadata missing or mail was marked read automatically');
  const message=await api('message?uid='+item.uid);if(!message.text.includes('Local fixture content')||message.attachments[0].filename!=='arbitrary.fixture')throw Error('Message or attachment parsing failed');
  if((await api('inbox')).items.find(m=>m.uid===item.uid).read)throw Error('Opening email marked it read');
  const attachment=Buffer.from(await (await fetch('http://127.0.0.1:3001/api/email/attachment?uid='+item.uid+'&index=0')).arrayBuffer());if(!attachment.equals(bytes))throw Error('Attachment bytes changed');
  await api('read',{uid:item.uid});if(!(await api('inbox')).items.find(m=>m.uid===item.uid).read)throw Error('Explicit mark-read failed');
  await api('send',{to:address,subject:'Re: Mail fixture',text:'Fixture reply',replyUid:item.uid});
  const replyItem=(await api('inbox')).items.find(m=>m.subject==='Re: Mail fixture');
  if(!replyItem||(await api('message?uid='+replyItem.uid)).inReplyTo!==message.messageId)throw Error('Reply threading headers were not preserved');
  console.log('PASS: real TLS IMAP/SMTP login, SMTP send, inbox read without implicit Seen, exact arbitrary attachment bytes, explicit mark-read, and threaded reply');
  if(process.argv.includes('--keep')){console.log('Fixture ready for browser testing on port 3001. Stop this process to remove the account and fixture.');await new Promise(resolve=>{process.once('SIGTERM',resolve);process.once('SIGINT',resolve)})}
 }finally{server?.kill();fs.rmSync(accountFile,{force:true});for(const proxy of proxies)proxy.close();if(container)docker(['stop',container])}
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1)});
