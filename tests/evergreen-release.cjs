// Local release audit. No analytics, signup, cart or checkout traffic is sent externally.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const output=process.env.RELEASE_AUDIT_OUTPUT||path.join(os.tmpdir(),'smc-evergreen-release');fs.mkdirSync(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg','.webmanifest':'application/manifest+json'};
function localFile(url){const pathname=decodeURIComponent(new URL(url).pathname);const file=path.join(root,pathname==='/'?'index.html':pathname);return file.startsWith(root+path.sep)?file:null;}
const server=http.createServer((req,res)=>{const file=localFile('http://localhost'+req.url);if(!file){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);});});
const forbidden=/wait\s*list|pre[\s-]?orders?|pre[\s-]?launch|target launch|November\s+16|December\s+1|2026-11-16|2026-12-01|launching soon|join the list|first cup list|launch updates|early access/i;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const results=[];
 try{
  for(const [viewport,width,height] of [['desktop',1440,1000],['mobile',390,844],['small-mobile',320,700]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();let signupRequests=0;const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://**/*',route=>{const u=new URL(route.request().url());if(['saintmichaelscoffee.com','www.saintmichaelscoffee.com'].includes(u.hostname)){const file=localFile(u.href);if(file&&fs.existsSync(file))return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}if(/klaviyo|subscriptions\//.test(u.href))signupRequests++;return route.abort();});
   for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.html')&&(!process.env.RELEASE_AUDIT_FILTER||n===process.env.RELEASE_AUDIT_FILTER))){
    const before=errors.length;await page.goto(base+'/'+file,{waitUntil:'domcontentloaded'});
    const body=await page.locator('body').innerText();assert(!forbidden.test(body),file+': deprecated visible copy');
    const metadata=await page.locator('meta[content]').evaluateAll(elements=>elements.map(e=>e.content).join('\n'));assert(!forbidden.test(metadata),file+': deprecated metadata');
    const schemas=await page.locator('script[type="application/ld+json"]').allTextContents();for(const text of schemas){JSON.parse(text);assert(!forbidden.test(text),file+': deprecated structured data');}
    assert.equal(await page.locator('#waitlist-signup,script[src*="waitlist.js"],script[src*="static.klaviyo.com/onsite"]').count(),0,file+': signup flow still loaded');
    assert.equal(await page.locator('a[href*="coffee-community"]').count(),0,file+': dead signup link');
    const overflow=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1||(e.clientWidth>0&&e.children.length===0&&e.scrollWidth>e.clientWidth+1)).slice(0,8).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,100),scroll:e.scrollWidth,client:e.clientWidth}))}));
    assert(!overflow.overflow,`${file} ${viewport}: horizontal overflow ${JSON.stringify(overflow.offenders)}`);
    if(file==='index.html'){
     assert.equal(await page.locator('#home-anthem').getAttribute('aria-label'),'Saint Michaels Coffee Mission Anthem');
     assert.equal(await page.locator('#subscription-selection').getAttribute('action'),'https://g1gzkr-fe.myshopify.com/cart/add');
     assert.equal(await page.locator('.waitlist-band').count(),0);
     assert((await page.locator('.preorder-price').allTextContents()).join(' ').includes('$22.99'));
     assert((await page.locator('.preorder-price').allTextContents()).join(' ').includes('$23.49'));
    }
    if(file==='shop.html'){
     assert.equal(await page.getByRole('link',{name:'Choose Options',exact:true}).count(),2);
     await page.getByRole('button',{name:'Back',exact:true}).first().click();
     await page.waitForFunction(()=>document.querySelector('#answer-the-call-product-image').getAttribute('src')==='answer-the-call-back-20261016.webp');
     assert.equal(await page.locator('#answer-the-call-product-image').getAttribute('src'),'answer-the-call-back-20261016.webp');
     assert.equal(await page.locator('[data-morning-fuel-poll]').count(),1);
    }
    if(file==='service-discount.html'){
     assert.equal(await page.locator('#service-signup').count(),1);
     assert(body.includes('10% OFF')&&body.includes('15% OFF'));
    }
    if(['index.html','shop.html','about.html','blog.html'].includes(file)&&viewport!=='small-mobile')await page.screenshot({path:path.join(output,file.replace('.html','')+'-'+viewport+'.png'),animations:'disabled',fullPage:false});
    assert.equal(errors.length,before,file+': runtime errors '+errors.slice(before).join('; '));
    results.push({page:file,viewport,visibleCopy:'clean',metadata:'clean',structuredData:'valid',waitlist:'removed',overflow:false,runtimeErrors:errors.slice(before)});
   }
   assert.equal(signupRequests,0,'Removed waitlist/popup must make no Klaviyo requests');await context.close();
  }
  fs.writeFileSync(path.join(output,'evergreen-results.json'),JSON.stringify(results,null,2));console.log(`PASS: ${results.length} page/viewport audits. No external commerce, analytics or signup writes sent. Evidence: ${output}`);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
