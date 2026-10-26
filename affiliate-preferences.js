// First-party optional referral preferences; existing analytics/email choices are unchanged.
(()=>{
 const key='smc_affiliate_choice',listeners=new Set();let choice,choiceUntil=0,regionalPolicy=null,policyReady=false,serverGpc=false;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.version==='affiliate-v1'&&saved.until>Date.now()){choice=saved.allowed===true;choiceUntil=saved.until;}}catch{}
 const get=()=>navigator.globalPrivacyControl===true||serverGpc||window.Shopify?.customerPrivacy?.currentVisitorConsent?.()?.marketing==='no'?false:!policyReady?undefined:choiceUntil>Date.now()?choice:regionalPolicy==='affiliate-us-optout-v1'?true:undefined;
 const basis=()=>get()!==true?null:choiceUntil>Date.now()&&choice===true?'affiliate-v1':regionalPolicy;
 window.SMCReferralConsent={get,basis,pending:()=>!policyReady,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
 const button=document.createElement('button');button.type='button';button.className='referral-preferences';button.textContent='Referral preferences';
 const dialog=document.createElement('dialog');dialog.className='referral-dialog';dialog.setAttribute('aria-labelledby','referral-heading');
 dialog.innerHTML='<h2 id="referral-heading">YOUR REFERRAL CHOICE</h2><p>Optional partner attribution helps us credit the person who introduced you to our coffee.</p><p>For U.S. visitors, first-party referral attribution is enabled for 30 days unless you opt out. Elsewhere, we use it only if you allow it. We send only the code and website domains—no page paths, search terms or form details. We do not create a device fingerprint.</p><p>You can decline and still shop. Change this choice here at any time. Declining clears referral storage on this website and stops future referral handoffs; it cannot remove information already attached to a Shopify cart or order.</p><p>This choice covers referral attribution only. It does not change existing Google Analytics or email preferences.</p><div class="referral-actions"><button type="button" data-referral-choice="allow">ALLOW REFERRAL ATTRIBUTION</button><button type="button" data-referral-choice="decline">DECLINE / WITHDRAW</button><button type="button" data-referral-close>CLOSE</button></div><p role="status" class="referral-status"></p>';
 function status(){dialog.querySelector('.referral-status').textContent=navigator.globalPrivacyControl===true?'Global Privacy Control is on. Referral attribution stays off.':get()===true?(basis()==='affiliate-v1'?'Referral attribution explicitly allowed.':'U.S. referral attribution enabled; you can opt out.'):get()===false?'Referral attribution declined.':'Referral attribution is off until you allow it.';}
 button.addEventListener('click',()=>{status();dialog.showModal();});
 dialog.addEventListener('click',event=>{const action=event.target.closest('[data-referral-choice]');if(action){choice=action.dataset.referralChoice==='allow'&&navigator.globalPrivacyControl!==true;choiceUntil=Date.now()+30*864e5;try{localStorage.setItem(key,JSON.stringify({version:'affiliate-v1',allowed:choice,until:choiceUntil}));}catch{}listeners.forEach(fn=>fn());status();}if(event.target.closest('[data-referral-close]')){dialog.close();button.focus();}});
 addEventListener('storage',event=>{if(event.key===key){try{const saved=JSON.parse(event.newValue||'null');choice=saved?.version==='affiliate-v1'&&saved.until>Date.now()?saved.allowed===true:undefined;choiceUntil=saved?.until||0;}catch{choice=undefined;}listeners.forEach(fn=>fn());}});
 document.body.append(button,dialog);
 fetch('/api/referral-policy',{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'}).then(r=>r.ok?r.json():null).then(data=>{if(!data)return;serverGpc=data.gpc===true;policyReady=true;regionalPolicy=data?.policy==='affiliate-us-optout-v1'?data.policy:null;listeners.forEach(fn=>fn());}).catch(()=>{});
 // Referral links never interrupt shopping. Open preferences only on a visitor's request.
})();


