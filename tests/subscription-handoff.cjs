// Offline browser regression: no Google, Shopify, or affiliate requests leave this test.
// PLAYWRIGHT_MODULE can point to the installed Playwright package; BROWSER_CHANNEL is optional.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const expectedVariants={espresso:{1:'67784669987051',2:'67784670019819',3:'67784670052587',5:'67784670085355'},watch:{1:'67784671658219',2:'67784671690987',3:'67784671723755',5:'67784671756523'}};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
 const page=await browser.newPage();let submitted;
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/cart/add'){submitted=new URLSearchParams(route.request().postData());return route.fulfill({status:204,body:''});}
  if(url.hostname==='test.invalid'&&url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')});
  if(url.hostname==='test.invalid'&&url.pathname==='/subscriptions.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'subscriptions.js'),'utf8')});
  return route.abort();
 });
 async function load(coffee,frequency,linker){
  submitted=null;await page.goto('https://test.invalid/');
  await page.locator('#subscription-coffee').selectOption(coffee);
  if(frequency)await page.locator('[name=selling_plan]').selectOption(frequency);
  if(linker)await page.locator('#subscription-selection').evaluate(f=>{const u=new URL(f.action);u.searchParams.set('_gl','1*test*encoded+value');f.action=u.href;});
 }
 let supported=0;
 for(const coffee of ['espresso','watch'])for(const bags of [1,2,3,5])for(const mode of ['monthly','fortnightly','one-time']){
  if(bags>2&&mode==='fortnightly')continue;
  const frequency=mode==='fortnightly'?'11806736619':mode==='monthly'?'11806703851':'';
  await load(coffee,frequency,true);
  const selector=mode==='one-time'?`[data-purchase="one-time"][data-bags="${bags}"]`:`.subscription-card[data-bags="${bags}"]`;
  await Promise.all([page.waitForRequest(r=>new URL(r.url()).pathname==='/cart/add'),page.locator(selector).click()]);
  assert.equal(submitted.get('quantity'),'1');assert.equal(submitted.get('id'),expectedVariants[coffee][bags]);
  assert.equal(submitted.get('selling_plan'),mode==='one-time'?null:frequency);
  const redirect=new URL(submitted.get('return_to'),'https://store.invalid');
  assert.equal(redirect.pathname,'/checkout');assert.equal(redirect.searchParams.get('_gl'),'1*test*encoded+value');supported++;
 }
 await load('espresso','11806703851',false);
 await Promise.all([page.waitForRequest(r=>new URL(r.url()).pathname==='/cart/add'),page.locator('.subscription-card[data-bags="1"]').click()]);
 assert.equal(submitted.get('return_to'),'/checkout');
 await load('','',false);await page.locator('.subscription-card[data-bags="1"]').click();assert.equal(submitted,null);
 for(const coffee of ['espresso','watch']){await load(coffee,'11806736619',true);for(const bags of [3,5])assert.equal(await page.locator(`.subscription-card[data-bags="${bags}"]`).isDisabled(),true);}
 const safety=await page.locator('#subscription-selection').evaluate(form=>{
  const original=form.action,results=[];
  for(const [action,returnTo] of [
   ['https://attacker.invalid/cart/add?_gl=example','/checkout'],
   ['http://g1gzkr-fe.myshopify.com/cart/add?_gl=example','/checkout'],
   ['https://g1gzkr-fe.myshopify.com/other?_gl=example','/checkout'],
   ['https://g1gzkr-fe.myshopify.com/cart/add?_gl=example','https://attacker.invalid/'],
   ['https://g1gzkr-fe.myshopify.com/cart/add?_gl=bad%0Avalue','/checkout'],
   ['https://g1gzkr-fe.myshopify.com/cart/add?_gl='+('a'.repeat(4097)),'/checkout'],
  ]){form.action=action;form.elements.return_to.value=returnTo;results.push(new FormData(form).get('return_to')===returnTo);}
  form.action=original;form.elements.return_to.value='/checkout';return results;
 });
 assert.ok(safety.every(Boolean));
 console.log(`PASS: ${supported} supported checkout payloads; linker encoding; no-linker fallback; missing-selection guard; 4 frequency guards; 6 redirect/tamper fallback cases. No external requests sent.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
