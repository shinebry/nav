const fs=require('node:fs'),path=require('node:path');
const {createSourceHTTP}=require('./source-http');
const {XMLParser}=require('fast-xml-parser');
const {trustedLocalRequest}=require('./local-access');
const fail=(message,status=400)=>Object.assign(new Error(message),{status,public:true});
const entityID=value=>{if(!/^Q[1-9]\d*$/.test(value||''))throw fail('Choose a Wikidata profile');return value};
const value=(entity,property)=>(entity.claims?.[property]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value).filter(v=>v!==undefined);
const first=(entity,property)=>value(entity,property)[0];
const plain=text=>String(text||'').replace(/<[^>]*>/g,'').trim();
const httpURL=input=>{try{const url=new URL(input);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null}catch{return null}};
function recommendation(record,officialLinks){const evidence=record?.evidence,url=httpURL(evidence?.url);if(!url||evidence?.verified!==true||!plain(evidence.quote)||!record.title)return null;const target=new URL(url);const official=officialLinks.some(link=>{try{const base=new URL(link);return base.hostname===target.hostname&&(target.pathname===base.pathname||target.pathname.startsWith(base.pathname.replace(/\/$/,'')+'/'))}catch{return false}});if(!official)return null;return {id:record.id||url,title:plain(record.title),kind:record.kind||'other',image:httpURL(record.image),url:httpURL(record.url),evidence:{url,quote:plain(evidence.quote),date:evidence.date||null},provider:'Public recommendation'}}
function createSourceData(options={}){
 const http=options.http||createSourceHTTP();
 async function get(url,xml=false){if(options.get)return options.get(url,xml);return xml?(await http.load(url)).text:http.json(url)}
 async function entity(id){const data=await get('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:entityID(id),format:'json',languages:'en',props:'labels|descriptions|claims|sitelinks'}));const result=data.entities?.[id];if(!result||result.missing!==undefined)throw fail('Public profile not found',404);return result}
 const commons=file=>file?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file):null;
 function accounts(e){const links=[];for(const [property,prefix]of [['P2397','https://www.youtube.com/channel/'],['P2002','https://x.com/'],['P2003','https://www.instagram.com/'],['P2013','https://www.facebook.com/'],['P1902','https://open.spotify.com/artist/'],['P434','https://musicbrainz.org/artist/']])for(const id of value(e,property))if(typeof id==='string')links.push(prefix+encodeURIComponent(id));for(const url of value(e,'P856'))if(httpURL(url))links.push(httpURL(url));return links}
 async function credits(id){entityID(id);const query=`SELECT DISTINCT ?work ?workLabel ?role ?date ?image ?evidence ?mediaClass WHERE { VALUES (?predicate ?target ?role) { (p:P50 ps:P50 "Author") (p:P57 ps:P57 "Director") (p:P58 ps:P58 "Screenwriter") (p:P162 ps:P162 "Producer") (p:P161 ps:P161 "Cast") (p:P86 ps:P86 "Composer") (p:P676 ps:P676 "Lyricist") (p:P767 ps:P767 "Contributor") } ?work ?predicate ?statement . ?statement ?target wd:${id} ; prov:wasDerivedFrom ?reference . ?reference pr:P854 ?evidence . ?work wdt:P31/wdt:P279* ?mediaClass . VALUES ?mediaClass { wd:Q571 wd:Q11424 wd:Q15416 wd:Q482994 wd:Q7366 } OPTIONAL { ?work wdt:P577 ?date } OPTIONAL { ?work wdt:P18 ?image } SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } } ORDER BY DESC(?date) LIMIT 150`;
 const data=await get('https://query.wikidata.org/sparql?'+new URLSearchParams({format:'json',query}));const seen=new Set();return (data.results?.bindings||[]).flatMap(row=>{const role=row.role?.value,url=httpURL(row.work?.value),proof=httpURL(row.evidence?.value);if(!url||!proof||!role)return [];const key=url+':'+role;if(seen.has(key))return [];seen.add(key);return [{id:key,title:plain(row.workLabel?.value),role,date:row.date?.value?.slice(0,4)||'',image:httpURL(row.image?.value),url,evidence:{url:proof,record:url},kind:row.mediaClass?.value?.endsWith('/Q571')&&role==='Author'?'books':/\/(Q11424|Q15416)$/.test(row.mediaClass?.value||'')&&['Director','Screenwriter','Producer'].includes(role)?'films':'features'}]})}
 function curated(id,links){let records;try{records=JSON.parse(fs.readFileSync(options.recommendationsFile||path.join(__dirname,'.local/source-recommendations.json'),'utf8'))}catch{return []}return (Array.isArray(records[id])?records[id]:[]).map(row=>recommendation(row,links)).filter(Boolean)}
 async function profile(id){const e=await entity(id),links=accounts(e),errors=[];let works=[];try{works=await credits(id)}catch{errors.push('Public credits unavailable')}const recommendations=curated(id,links),sections=['about'];if(typeof first(e,'P2397')==='string')sections.push('videos');if(typeof first(e,'P434')==='string')sections.push('music');if(/^OL\d+A$/.test(first(e,'P648')||''))sections.push('books');for(const kind of ['features','books','films'])if(works.some(w=>w.kind===kind)&&!sections.includes(kind))sections.push(kind);if(recommendations.length)sections.push('recommendations');return {id,type:value(e,'P31').some(type=>type.id==='Q5')?'Person':'Thing',name:e.labels?.en?.value||id,portrait:commons(first(e,'P18')||first(e,'P154')),banner:commons(first(e,'P948')),sections,links,record:'https://www.wikidata.org/wiki/'+id,errors}}
 async function about(id){const e=await entity(id),title=e.sitelinks?.enwiki?.title;let biography=e.descriptions?.en?.value||'',biographyURL='https://www.wikidata.org/wiki/'+id;if(title){try{const data=await get('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title));biography=plain(data.extract)||biography;biographyURL=httpURL(data.content_urls?.desktop?.page)||biographyURL}catch{}}
 const facts=[],properties=[['Occupation','P106'],['Country','P27'],['Birthplace','P19'],['Known for','P800'],['Awards','P166']],ids=[...new Set(properties.flatMap(([,property])=>value(e,property).map(v=>v.id).filter(Boolean)))];let labels={};if(ids.length){try{const data=await get('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),languages:'en',props:'labels',format:'json'}));labels=data.entities||{}}catch{}}
 for(const [label,property]of properties){const values=value(e,property).map(v=>labels[v.id]?.labels?.en?.value).filter(Boolean);if(values.length)facts.push({label,value:values.join(', '),url:'https://www.wikidata.org/wiki/'+id+'#'+property})}const born=first(e,'P569');if(born?.time&&born.precision>=9)facts.push({label:'Born',value:born.time.replace(/^\+/, '').slice(0,born.precision>=11?10:4),url:'https://www.wikidata.org/wiki/'+id+'#P569'});return {biography,biographyURL,facts,links:accounts(e),record:'https://www.wikidata.org/wiki/'+id}}
 async function section(id,kind){
  entityID(id);
  if(kind==='about')return about(id);
  if(['features','films','books'].includes(kind)){
   if(kind==='books'){
    const e=await entity(id),author=first(e,'P648');
    if(/^OL\d+A$/.test(author||'')){
     const data=await get('https://openlibrary.org/authors/'+author+'/works.json?limit=100');
     return {items:(data.entries||[]).filter(book=>book.authors?.some(a=>a.author?.key==='/authors/'+author)).map(book=>({id:book.key,title:plain(book.title),kind:'books',role:'Author',url:'https://openlibrary.org'+book.key,date:book.first_publish_date||'',image:book.covers?.[0]?'https://covers.openlibrary.org/b/id/'+book.covers[0]+'-M.jpg':null,evidence:{url:'https://openlibrary.org'+book.key}}))};
    }
   }
   return {items:(await credits(id)).filter(work=>work.kind===kind)};
  }
  const e=await entity(id);
  if(kind==='recommendations')return {items:curated(id,accounts(e))};
  if(kind==='music'){
   const mbid=first(e,'P434');if(!/^[a-f\d-]{36}$/i.test(mbid||''))return {items:[]};
   const data=await get('https://musicbrainz.org/ws/2/release-group?'+new URLSearchParams({artist:mbid,fmt:'json',limit:'100'}));
   return {items:(data['release-groups']||[]).map(release=>({id:release.id,title:plain(release.title),date:release['first-release-date']||'',kind:'music',role:release['primary-type']||'Release',url:'https://musicbrainz.org/release-group/'+release.id,evidence:{url:'https://musicbrainz.org/release-group/'+release.id}}))};
  }
  if(kind==='videos'){
   const channel=first(e,'P2397');if(!/^UC[\w-]{22}$/.test(channel||''))return {items:[]};
   const xml=await get('https://www.youtube.com/feeds/videos.xml?channel_id='+encodeURIComponent(channel),true),feed=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(xml).feed;
   const entries=Array.isArray(feed?.entry)?feed.entry:feed?.entry?[feed.entry]:[];
   return {items:entries.filter(video=>video['yt:channelId']===channel).map(video=>({id:video['yt:videoId'],title:plain(video.title),kind:'videos',date:video.published,url:'https://www.youtube.com/watch?v='+encodeURIComponent(video['yt:videoId']),image:httpURL(video['media:group']?.['media:thumbnail']?.['@_url']),evidence:{url:'https://www.youtube.com/channel/'+channel}}))};
  }
  throw fail('Unknown source section');
 }

 async function lookup(query){if(!query?.trim())throw fail('Enter a name');const data=await get('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbsearchentities',search:query.trim(),language:'en',limit:'10',format:'json'}));return {items:(data.search||[]).map(e=>({id:e.id,name:e.label,description:e.description||'',url:'https://www.wikidata.org/wiki/'+e.id}))}}
 return {profile,about,section,lookup,entity,accounts};
}
const sourceData=createSourceData();
async function handleSources(req,res,url){if(!url.pathname.startsWith('/api/sources/'))return false;const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body))};if(!trustedLocalRequest(req)){reply(403,{error:'Source access is restricted to this computer'});return true}try{if(req.method!=='GET')throw fail('Use GET',405);const route=url.pathname.slice(13);if(route==='lookup')reply(200,await sourceData.lookup(url.searchParams.get('q')));else if(route==='profile')reply(200,await sourceData.profile(url.searchParams.get('id')));else if(route==='section')reply(200,await sourceData.section(entityID(url.searchParams.get('id')),url.searchParams.get('section')));else throw fail('Unknown source action',404)}catch(error){reply(error.status||502,{error:error.public?error.message:'Public source data unavailable. Try again when the database is reachable.'})}return true}
module.exports={handleSources,createSourceData,recommendation,entityID};
