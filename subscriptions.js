(()=>{
const form=document.getElementById('subscription-selection');if(!form)return;
const variants={espresso:'67784669987051',watch:'67784671658219'};const bagCounts=new Set(['1','2','3','4','5']);
const coffee=document.getElementById('subscription-coffee'),plan=form.elements.selling_plan,error=document.getElementById('subscription-error');let busy=false;
// Shopify redirects cart/add to return_to without preserving the action query.
// Carry Google's existing, short-lived linker through that redirect; create no IDs.
form.addEventListener('formdata',event=>{
try{
const action=new URL(form.action,location.href),linker=action.searchParams.get('_gl');
if(action.origin!=='https://g1gzkr-fe.myshopify.com'||action.pathname!=='/cart/add'||event.formData.get('return_to')!=='/checkout')return;
if(linker&&linker.length<=4096&&!/[\u0000-\u0020\u007f]/.test(linker)){
const checkout=new URL('/checkout',action);checkout.searchParams.set('_gl',linker);event.formData.set('return_to',checkout.pathname+checkout.search);
}
}catch{/* Missing or malformed decoration leaves the original checkout path unchanged. */}
});
const checkout=form.querySelector('.subscription-checkout'),summary=document.getElementById('subscription-summary');
function updateSelection(){
const selected=form.querySelector('[name="subscription_choice"]:checked');
plan.value=selected?.dataset.plan||'';
checkout.dataset.bags=selected?.dataset.bags||'';
const name=coffee.options[coffee.selectedIndex]?.textContent;
summary.textContent=selected?`${coffee.value?name:'Choose your coffee'} · ${selected.dataset.bags} ${selected.dataset.bags==='1'?'bag':'bags'} ${plan.value==='11806703851'?'once a month':'every 2 weeks'}. Renews automatically.`:'Choose your coffee and subscription above.';
}
// Product links select only coffee, never a recurring schedule or an order.
const requestedCoffee=new URLSearchParams(location.search).get('coffee');
if(Object.hasOwn(variants,requestedCoffee))coffee.value=requestedCoffee;
form.addEventListener('change',()=>{error.hidden=true;coffee.removeAttribute('aria-invalid');updateSelection();});
form.addEventListener('submit',event=>{
if(busy){event.preventDefault();return;}
const button=event.submitter,oneTime=button?.dataset.purchase==='one-time';
updateSelection();
const bags=button?.dataset.bags;
const validPlan=plan.value==='11806703851'||(plan.value==='11806736619'&&Number(bags)<=2);
if(!variants[coffee.value]||!bagCounts.has(bags)||(!oneTime&&!validPlan)){
event.preventDefault();error.textContent=!variants[coffee.value]?'Choose your coffee before continuing.':'Choose a bag quantity and delivery schedule before continuing.';error.hidden=false;
if(!variants[coffee.value]){coffee.setAttribute('aria-invalid','true');coffee.focus();}else form.querySelector('[name="subscription_choice"]').focus();return;
}
form.elements.id.value=variants[coffee.value];form.elements.quantity.value=bags;plan.disabled=oneTime;form.dataset.bags=bags;
busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
});
addEventListener('pageshow',()=>{busy=false;plan.disabled=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);updateSelection();});
updateSelection();
})();
