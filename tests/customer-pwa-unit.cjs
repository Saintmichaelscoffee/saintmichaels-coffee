const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
 const handlers={}, cacheOps=[], store=new Map();
 const sandbox={URL,Request,Response,self:{location:{origin:'https://saintmichaelscoffee.com'},addEventListener:(n,f)=>handlers[n]=f},fetch:async()=>new Response('live'),caches:{open:async name=>({add:async req=>{cacheOps.push(req.url);store.set('/offline.html',new Response('offline'))},match:async p=>store.get(p)}),keys:async()=>['smc-coffee-offline-v0','another-app'],delete:async k=>cacheOps.push(k)}};
 // Node requires absolute URLs, whereas service workers resolve relative requests.
 sandbox.Request=class extends Request {constructor(url,opts){super(new URL(url,sandbox.self.location.origin),opts)}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'coffee-sw.js'),'utf8'),sandbox);
 let wait;handlers.install({waitUntil:p=>wait=p});await wait;handlers.activate({waitUntil:p=>wait=p});await wait;
 assert.deepEqual(cacheOps,['https://saintmichaelscoffee.com/offline.html','smc-coffee-offline-v0']);
 for(const [url,method,mode] of [['https://saintmichaelscoffee.com/cart','GET','navigate'],['https://saintmichaelscoffee.com/account/orders','GET','navigate'],['https://saintmichaelscoffee.com/api/submit','POST','navigate'],['https://checkout.shopify.com/','GET','navigate'],['https://saintmichaelscoffee.com/shop.html','POST','navigate'],['https://saintmichaelscoffee.com/data.json','GET','cors']]){
  let intercepted=false;handlers.fetch({request:{url,method,mode},respondWith:()=>intercepted=true});assert.equal(intercepted,false,url);
 }
 const fetchPage=async()=>{let result;handlers.fetch({request:{url:'https://saintmichaelscoffee.com/shop.html',method:'GET',mode:'navigate'},respondWith:p=>result=p});return (await result).text()};
 assert.equal(await fetchPage(),'live');sandbox.fetch=async()=>{throw Error('offline')};assert.equal(await fetchPage(),'offline');store.clear();assert.match(await fetchPage(),/Reconnect/);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));assert.equal(manifest.short_name,'SMC Coffee');assert.equal(manifest.scope,'/');for(const icon of manifest.icons)assert(fs.existsSync(path.join(root,icon.src)));
 const htmls=fs.readdirSync(root).filter(p=>p.endsWith('.html')&&p!=='offline.html');for(const name of htmls){const s=fs.readFileSync(path.join(root,name),'utf8');assert.equal((s.match(/rel="manifest"/g)||[]).length,1,name);assert(s.includes('/coffee-app.js'),name);assert(s.includes('apple-touch-icon'),name);}
 console.log(`PASS: ${htmls.length} HTML entry points, manifest assets, SW install/cleanup, six private/non-navigation bypass cases, live network, offline notice, missing-cache fallback.`);
})().catch(e=>{console.error(e);process.exit(1)});
