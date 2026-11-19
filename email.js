const fs = require('node:fs');
const path = require('node:path');
const {ImapFlow} = require('imapflow');
const nodemailer = require('nodemailer');
const {simpleParser} = require('mailparser');
const {trustedLocalRequest} = require('./local-access');
const accountFile = path.join(__dirname, '.local/email/account.json');
const error = (message, status = 400) => Object.assign(new Error(message), {status, public: true});
const addressPattern = /^[^\s<>@,;]+@[^\s<>@,;]+$/;
function loadAccount() {
  try { return JSON.parse(fs.readFileSync(accountFile, 'utf8')); } catch { return null; }
}
function publicAccount(account = loadAccount()) {
  if (!account) return {configured: false};
  return {configured: true, address: account.address, username: account.username,
    imap: account.imap, smtp: account.smtp};
}
function validateAccount(input, previous) {
  if (!input || typeof input.address !== 'string' || !addressPattern.test(input.address)) throw error('Enter an email address');
  const account = {address: input.address, username: input.username || input.address};
  if (typeof account.username !== 'string' || /[\r\n]/.test(account.username)) throw error('Enter an account username');
  account.password = input.password || (previous?.address === input.address ? previous.password : '');
  if (typeof account.password !== 'string' || !account.password) throw error('Enter an app password or account password');
  for (const service of ['imap', 'smtp']) {
    const value = input[service];
    if (!value || typeof value.host !== 'string' || !/^(?:[a-zA-Z0-9.-]+|[a-fA-F0-9:]+)$/.test(value.host)) throw error('Enter a '+service.toUpperCase()+' hostname');
    if (!Number.isInteger(Number(value.port)) || Number(value.port)<1 || Number(value.port)>65535 || typeof value.secure !== 'boolean') throw error('Choose a valid port and TLS mode');
    account[service] = {host: value.host, port: Number(value.port), secure: value.secure};
  }
  return account;
}
function imapClient(account) {
  return new ImapFlow({...account.imap, auth:{user:account.username,pass:account.password},
    doSTARTTLS: account.imap.secure ? undefined : true, logger:false, disableAutoIdle:true,
    connectionTimeout:20000, greetingTimeout:20000, socketTimeout:30000});
}
function smtpClient(account) {
  return nodemailer.createTransport({...account.smtp, requireTLS:!account.smtp.secure,
    auth:{user:account.username,pass:account.password},logger:false,debug:false,
    connectionTimeout:20000,greetingTimeout:20000,socketTimeout:30000,
    disableFileAccess:true,disableUrlAccess:true});
}
async function withInbox(account, operation) {
  const client=imapClient(account);
  client.on('error',()=>{});
  try {
    await client.connect();
    const lock=await client.getMailboxLock('INBOX');
    try { return await operation(client); } finally { lock.release(); }
  } finally { if(client.usable)await client.logout().catch(()=>{});else client.close(); }
}
async function verifyAccount(account) {
  await withInbox(account,async()=>{});
  const transport=smtpClient(account);
  try { await transport.verify(); } finally { transport.close(); }
}
function requiredAccount() {
  const account=loadAccount();if(!account)throw error('Connect an email account in Platforms first',409);return account;
}
function uidValue(value) {
  const uid=Number(value);if(!Number.isSafeInteger(uid)||uid<1)throw error('Choose a message');return uid;
}
async function listInbox(account, before) {
  return withInbox(account,async client=>{
    const criteria=before?{uid:'1:'+String(uidValue(before)-1)}:{all:true};
    if(before&&Number(before)<=1)return {items:[],hasMore:false,before:null};
    const ids=(await client.search(criteria,{uid:true}))||[];
    const selected=ids.slice(-50);
    const items=[];
    if(selected.length)for await(const message of client.fetch(selected,{envelope:true,flags:true,internalDate:true},{uid:true})) {
      const envelope=message.envelope||{};
      items.push({uid:message.uid,subject:envelope.subject||'(No subject)',from:envelope.from||[],date:envelope.date||message.internalDate,read:message.flags.has('\\Seen')});
    }
    return {items:items.reverse(),hasMore:ids.length>50,before:selected[0]||null};
  });
}
async function parsedMessage(account, uid) {
  return withInbox(account,async client=>{
    const message=await client.fetchOne(uidValue(uid),{source:true},{uid:true});
    if(!message?.source)throw error('Message not found',404);
    return simpleParser(message.source,{skipHtmlToText:false,skipTextToHtml:true});
  });
}
function messageView(message, uid) {
  return {uid:uidValue(uid),subject:message.subject||'(No subject)',from:message.from?.value||[],
    to:message.to?.value||[],replyTo:message.replyTo?.value||message.from?.value||[],date:message.date,
    text:message.text||'',messageId:message.messageId||null,inReplyTo:message.inReplyTo||null,references:message.references||[],
    attachments:message.attachments.map((a,index)=>({index,filename:a.filename||'Attachment',contentType:a.contentType,size:a.size}))};
}
function recipients(value, required=false) {
  if(typeof value!=='string')throw error('Enter email addresses separated by commas');
  const result=value.split(',').map(s=>s.trim()).filter(Boolean);
  if((required&&!result.length)||result.some(a=>!addressPattern.test(a)))throw error('Enter email addresses separated by commas');
  return result;
}
async function sendEmail(account, input) {
  if(!input||typeof input!=='object')throw error('Enter an email message');
  const to=recipients(input.to,true),cc=recipients(input.cc||''),bcc=recipients(input.bcc||'');
  if(typeof input.subject!=='string'||/[\r\n]/.test(input.subject)||typeof input.text!=='string')throw error('Enter a subject and message');
  const attachments=[];
  if(input.attachments!==undefined&&!Array.isArray(input.attachments))throw error('Invalid attachments');
  for(const item of input.attachments||[]) {
    if(typeof item.filename!=='string'||typeof item.contentBase64!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.contentBase64))throw error('Invalid attachment');
    attachments.push({filename:item.filename,content:Buffer.from(item.contentBase64,'base64'),contentType:typeof item.contentType==='string'?item.contentType:undefined});
  }
  let inReplyTo,references;
  if(input.replyUid) {
    const parent=await parsedMessage(account,uidValue(input.replyUid));
    inReplyTo=parent.messageId;references=[...(parent.references||[]),...(parent.messageId?[parent.messageId]:[])];
  }
  const transport=smtpClient(account);
  try {
    const result=await transport.sendMail({from:account.address,to,cc,bcc,subject:input.subject,text:input.text,attachments,inReplyTo,references,disableFileAccess:true,disableUrlAccess:true});
    return {accepted:result.accepted||[],rejected:result.rejected||[],messageId:result.messageId};
  } catch {
    throw error('Delivery unknown. Check your mail before retrying.',503);
  } finally { transport.close(); }
}
async function bodyJSON(req) {
  const parts=[];for await(const part of req)parts.push(part);
  try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{throw error('Invalid request body')}
}
async function handleEmail(req,res,url) {
  if(!url.pathname.startsWith('/api/email/'))return false;
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body))};
  if(!trustedLocalRequest(req)){reply(403,{error:'Email access is restricted to this computer'});return true}
  const route=url.pathname.slice('/api/email/'.length);
  try {
    if(route==='status'&&req.method==='GET'){reply(200,publicAccount());return true}
    if(route==='configure'&&req.method==='POST') {
      const account=validateAccount(await bodyJSON(req),loadAccount());
      try{await verifyAccount(account)}catch{throw error('Email connection failed. Check server settings, app password, and TLS support.',503)}
      fs.mkdirSync(path.dirname(accountFile),{recursive:true,mode:0o700});
      const temporary=accountFile+'.tmp';fs.writeFileSync(temporary,JSON.stringify(account),{mode:0o600});fs.renameSync(temporary,accountFile);
      reply(200,publicAccount(account));return true;
    }
    if(route==='disconnect'&&req.method==='POST'){fs.rmSync(accountFile,{force:true});reply(200,{configured:false});return true}
    const account=requiredAccount();
    const expected=req.headers['x-email-account']||url.searchParams.get('account');
    if(expected&&expected!==account.address)throw error('This email account is disconnected',409);
    if(route==='inbox'&&req.method==='GET'){reply(200,await listInbox(account,url.searchParams.get('before')));return true}
    if(route==='message'&&req.method==='GET'){const uid=uidValue(url.searchParams.get('uid'));reply(200,messageView(await parsedMessage(account,uid),uid));return true}
    if(route==='read'&&req.method==='POST'){const input=await bodyJSON(req);await withInbox(account,client=>client.messageFlagsAdd(uidValue(input.uid),['\\Seen'],{uid:true}));reply(200,{read:true});return true}
    if(route==='send'&&req.method==='POST'){reply(200,await sendEmail(account,await bodyJSON(req)));return true}
    if(route==='attachment'&&req.method==='GET') {
      const message=await parsedMessage(account,uidValue(url.searchParams.get('uid'))),index=Number(url.searchParams.get('index'));
      if(!Number.isSafeInteger(index)||index<0||!message.attachments[index])throw error('Attachment not found',404);
      const attachment=message.attachments[index];
      res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(attachment.filename||'Attachment'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(attachment.content);return true;
    }
    reply(404,{error:'Unknown email action'});
  } catch(e) {reply(e.status||503,{error:e.public?e.message:'Email request failed. Check your connection and server settings.'})}
  return true;
}
module.exports={handleEmail,validateAccount,publicAccount,verifyAccount,listInbox,parsedMessage,messageView,sendEmail,recipients};
