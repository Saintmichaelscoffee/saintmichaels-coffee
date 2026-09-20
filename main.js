document.addEventListener('DOMContentLoaded',function(){
  document.addEventListener('click',function(e){
    var c=e.target.closest('.cart');
    if(c){var l=c.textContent;c.textContent='Added';setTimeout(function(){c.textContent=l},1600);}
  });
  var f=document.getElementById('su');
  if(f)f.addEventListener('submit',function(e){
    e.preventDefault();var b=f.querySelector('button');b.textContent='Welcome';f.reset();
    setTimeout(function(){b.textContent='Join'},2400);
  });
});
