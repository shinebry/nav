// Opt-in live check. Creates a local fixture account and talks only to local bots.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {MatrixClient,SimpleFsStorageProvider,RustSdkCryptoStorageProvider,LogService} = require('matrix-bot-sdk');
const {StoreType} = require('@matrix-org/matrix-sdk-crypto-nodejs');
LogService.setLogger({trace(){},debug(){},info(){},warn(){},error(){}});
const root=path.resolve(__dirname,'..');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const app='http://127.0.0.1:'+(process.env.PORT||3000);
async function api(route, data) {
  const response=await fetch(app+'/api/matrix/'+route,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(60000)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'App request failed');
  return result;
}
async function until(read,check,label) {
  for(let i=0;i<40;i++){const value=await read();if(check(value))return value;await delay(500)}
  throw Error(label+' timed out');
}
async function main() {
  if(process.env.MATRIX_HOMESERVER!=='http://127.0.0.1:8008'||process.env.MATRIX_USER_ID!=='@personal:nav.local')throw Error('Run only against the generated local personal homeserver');
  const suffix=crypto.randomBytes(5).toString('hex'),username='messaging-test-'+suffix,password=crypto.randomBytes(24).toString('base64url');
  const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
  const args=[...(process.env.NAV_DOCKER_SOCKET?['--host='+process.env.NAV_DOCKER_SOCKET]:process.platform==='linux'?['--host=unix:///var/run/docker.sock']:[]),'compose','--env-file','.local/compose.env','-f','compose.yaml','exec','-T','synapse','register_new_matrix_user','-c','/data/homeserver.yaml','-u',username,'-p',password,'--no-admin'];
  if(spawnSync('docker',args,{cwd:root,env,encoding:'utf8'}).status!==0)throw Error('Local fixture registration failed');
  const login=await fetch(process.env.MATRIX_HOMESERVER+'/_matrix/client/v3/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'m.login.password',identifier:{type:'m.id.user',user:username},password})});
  const auth=await login.json();if(!auth.access_token)throw Error('Fixture login failed');
  const dir=path.join(root,'.local','messaging-test-'+suffix);fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const peer=new MatrixClient(process.env.MATRIX_HOMESERVER,auth.access_token,new SimpleFsStorageProvider(path.join(dir,'sync.json')),new RustSdkCryptoStorageProvider(path.join(dir,'crypto'),StoreType.Sqlite));
  let failure;peer.start().catch(e=>{failure=e});
  try {
    await until(async()=>{if(failure)throw Error('Fixture crypto failed');return peer.crypto.isReady&&peer.storage.getSyncToken()},Boolean,'Fixture initialization');
    const user=process.env.MATRIX_USER_ID;
    const alias='#test-'+suffix+':nav.local';
    const invited=await peer.createRoom({name:'Matrix alias verification',room_alias_name:'test-'+suffix,invite:[user],preset:'trusted_private_chat',initial_state:[{type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2'}}]});
    const joined=await api('conversations',{target:alias});if(joined.id!==invited)throw Error('Wrong alias room');
    const direct=await api('conversations',{target:auth.user_id});
    const again=await api('conversations',{target:auth.user_id});if(again.id!==direct.id)throw Error('Duplicate direct chat created');
    await peer.joinRoom(direct.id);
    await until(()=>peer.getRoomState(direct.id),state=>state.some(e=>e.type==='m.room.encryption'),'Room encryption');
    await delay(1500);
    const expected='Native Matrix fixture '+suffix;
    const received=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Fixture did not decrypt sent message')),20000);peer.on('room.message',(room,event)=>{if(room===direct.id&&event.content?.body===expected){clearTimeout(timer);resolve(event)}})});
    const sent=await api('messages?'+new URLSearchParams({chat:direct.id}),{text:expected});
    const raw=await peer.doRequest('GET','/_matrix/client/v3/rooms/'+encodeURIComponent(direct.id)+'/event/'+encodeURIComponent(sent.eventID));
    if(raw.type!=='m.room.encrypted'||!raw.content.ciphertext)throw Error('Outgoing message was not encrypted');
    await received;
    await peer.sendText(direct.id,'Fixture reply '+suffix);
    await until(()=>api('messages?'+new URLSearchParams({chat:direct.id})),data=>data.items.some(m=>m.text==='Fixture reply '+suffix),'Incoming decrypted reply');
    console.log('PASS: native Matrix alias join, direct-chat reuse, encrypted send, peer decryption, and incoming history');
    for(const id of ['slack','steam','teams']) {
      const room=await api('bridges/'+id+'/open',{});
      const messages=await until(()=>api('messages?'+new URLSearchParams({chat:room.id})),data=>data.items.some(m=>!m.isSender&&!m.encryptedUnavailable&&/login/i.test(m.text)),id+' encrypted bot reply');
      if(!messages.items.some(m=>!m.isSender&&/login/i.test(m.text)))throw Error(id+' help missing login');
      console.log('PASS: '+id+' standalone bot joined and replied to encrypted help; no platform account login attempted');
    }
  } finally {
    peer.stop();
    await peer.doRequest('POST','/_matrix/client/v3/logout',{},{});
  }
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1)});
