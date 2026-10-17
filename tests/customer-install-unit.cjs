const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const events={},button={hidden:true,addEventListener:(n,f)=>button[n]=f},status={textContent:''};let standalone=false,calls=0;
 const navigator={serviceWorker:{register:async()=>{calls++}}};
 const window={navigator,isSecureContext:true,matchMedia:()=>({matches:standalone}),addEventListener:(n,f)=>events[n]=f};
 const document={readyState:'complete',querySelector:s=>s==='[data-coffee-install]'?button:status};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../coffee-app.js'),'utf8'),{window,navigator,document});
 assert(button.hidden);events.load();assert.equal(calls,1);
 for(const outcome of ['dismissed','accepted']){
 let promptCalls=0,prevented=false;
 events.beforeinstallprompt({preventDefault:()=>prevented=true,prompt:async()=>promptCalls++,userChoice:Promise.resolve({outcome})});
 assert(prevented);assert(!button.hidden);await button.click({currentTarget:button});assert(button.hidden);assert.equal(promptCalls,1);await button.click({currentTarget:button});assert.equal(promptCalls,1);assert.match(status.textContent,outcome==='accepted'?/Installation requested/:/No problem/);
 }
 events.appinstalled();assert(button.hidden);assert.match(status.textContent,/Added/);
 standalone=true;events.beforeinstallprompt({preventDefault(){}});assert(button.hidden);
 console.log('PASS: registration, hidden default, native prompt capture, accepted/dismissed/repeated clicks, installed and standalone states.');
})().catch(e=>{console.error(e);process.exit(1)});
