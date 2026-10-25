(()=>{
const form=document.getElementById('subscription-selection');if(!form)return;
const variants={espresso:{1:'67784669987051',2:'67784670019819',3:'67784670052587',5:'67784670085355'},watch:{1:'67784671658219',2:'67784671690987',3:'67784671723755',5:'67784671756523'}};
const coffee=document.getElementById('subscription-coffee'),plan=form.elements.selling_plan,error=document.getElementById('subscription-error');let busy=false;
function updateBagImages(){
const image=coffee.value==='espresso'?'answer-the-call-front-20261016.webp':coffee.value==='watch'?'stand-watch-front-20261016.webp':null;
document.querySelectorAll('.subscription-bags').forEach(stage=>{stage.classList.toggle('has-coffee',!!image);stage.querySelectorAll('img').forEach(img=>{if(image&&img.getAttribute('src')!==image)img.src=image;});});
}
function updateAvailability(){
form.querySelectorAll('.subscription-card').forEach(button=>{
const limited=Number(button.dataset.bags)>2,unavailable=limited&&plan.value==='11806736619';
button.disabled=busy||unavailable;
button.querySelector('.subscribe-checkout-label').textContent=unavailable?'MONTHLY DELIVERY ONLY':'SUBSCRIBE & CHECKOUT';
});
}
plan.addEventListener('change',updateAvailability);addEventListener('pageshow',updateAvailability);
coffee.addEventListener('change',updateBagImages);addEventListener('pageshow',updateBagImages);
form.addEventListener('change',()=>{error.hidden=true;coffee.removeAttribute('aria-invalid');plan.removeAttribute('aria-invalid');});
form.addEventListener('submit',event=>{
if(busy){event.preventDefault();return;}
const button=event.submitter,bags=button?.dataset.bags,oneTime=button?.dataset.purchase==='one-time';
plan.disabled=false;
if(!oneTime&&Number(bags)>2&&plan.value==='11806736619'){event.preventDefault();error.textContent='3- and 5-bag subscriptions are currently available with monthly delivery only. Choose monthly, or select a 1- or 2-bag subscription.';error.hidden=false;plan.focus();return;}
const missing=!coffee.value?coffee:!oneTime&&!plan.value?plan:null;
if(missing||!variants[coffee.value]?.[bags]){event.preventDefault();error.textContent=missing===coffee?'Choose your coffee before selecting a bag card.':'Choose your delivery frequency before selecting a subscription card.';error.hidden=false;missing?.setAttribute('aria-invalid','true');missing?.focus();return;}
form.elements.id.value=variants[coffee.value][bags];plan.disabled=oneTime;form.dataset.bags=bags;
busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
});
addEventListener('pageshow',()=>{busy=false;plan.disabled=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);updateAvailability()});
})();