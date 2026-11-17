const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {searchCatalog}=require('./catalog');
const root=__dirname,types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.gif':'image/gif'};
http.createServer(async(req,res)=>{let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Invalid request')}
if(url.pathname==='/api/catalog'){try{const result=await searchCatalog(url.searchParams.get('type'),url.searchParams.get('q'));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result))}catch(e){res.writeHead(e.status||503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.status?e.message:'Database unavailable. Try again when network access is available.'}))}return}
let p;try{p=path.join(root,decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname))}catch{res.writeHead(400);return res.end('Invalid path')}if(!p.startsWith(root+path.sep)||path.relative(root,p).split(path.sep).some(part=>part.startsWith('.'))){res.writeHead(403);return res.end()}
fs.readFile(p,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(p)]||'text/plain'});res.end(err?'Not found':data)})}).listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('App running on port '+(process.env.PORT||3000)));
