// Isolated browser: no collectors, cart, forms or affiliate writes reach a server.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{
 const page=await browser.newPage();let attempts=0;
 await page.route('**/*',r=>{attempts++;return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'});});
 await page.goto('https://saintmichaelscoffee.com/?ref=LISI&_gl=keep-me&customer_name=Fixture&phone=2025550109&utm_source=newsletter&utm_medium=email&utm_campaign=launch_2026');
 await page.setContent('<head></head><body><a href="https://g1gzkr-fe.myshopify.com/products/coffee?ref=LISI&_gl=keep-me">Pre-order</a></body>');
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'nav-menu.js'),'utf8')});
 const original=await page.evaluate(()=>location.href);
 const result=await page.evaluate(()=>{
  const m=window.SMCAnalyticsMetadata;
  return {context:m.context(),clickId:m.cleanURL('https://saintmichaelscoffee.com/?gclid=opaque-Click_ID&gbraid=valid-code&email=no',{campaigns:true}),external:m.cleanURL('https://example.test/customer/Fixture?phone=2025550109#email'),bad:m.cleanURL('javascript:alert(1)'),privatePath:m.cleanURL('https://saintmichaelscoffee.com/account/Fixture'),badCampaign:m.cleanURL('https://saintmichaelscoffee.com/?utm_source=a%40example.test&utm_campaign=2025550109',{campaigns:true}),commands:window.dataLayer.map(x=>Array.from(x)),href:document.querySelector('a').href};
 });
 assert.equal(result.context.page_location,'https://saintmichaelscoffee.com/?utm_source=newsletter&utm_medium=email&utm_campaign=launch_2026');
 assert.equal(result.external,'https://example.test/');assert.equal(result.bad,'');
 assert.equal(result.clickId,'https://saintmichaelscoffee.com/?gclid=opaque-Click_ID&gbraid=valid-code');
 assert.equal(result.privatePath,'https://saintmichaelscoffee.com/');assert.equal(result.badCampaign,'https://saintmichaelscoffee.com/');
 assert.equal(await page.evaluate(()=>SMCAnalyticsMetadata.cleanURL('https://saintmichaelscoffee.com/PrivacyAuditFixture.html')),'https://saintmichaelscoffee.com/');
 assert.equal(await page.evaluate(()=>SMCAnalyticsMetadata.cleanURL('https://saintmichaelscoffee.com/shop.html?phone=2025550109')),'https://saintmichaelscoffee.com/shop.html');
 assert(original.includes('ref=LISI'));assert(result.href.includes('_gl=keep-me'));
 assert.equal(result.commands.filter(x=>x[0]==='config').length,1);
 assert.equal(result.commands.filter(x=>x[0]==='consent').length,0);
 await page.locator('a').evaluate(a=>a.addEventListener('click',e=>e.preventDefault()));await page.locator('a').click();
 const event=await page.evaluate(()=>Array.from(window.dataLayer.at(-1)));
 assert.equal(event[1],'preorder_click');assert.equal(event[2].page_location,result.context.page_location);
 console.log('PASS: sanitized page/referrer and intent metadata; known routes; safe campaigns/click IDs; unchanged shopping URLs; one GA config; no consent commands. All requests intercepted.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
