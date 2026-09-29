const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../js/daily-checkout.js'),'utf8');
async function checkoutReturn(statuses,{hasAttempt=true}={}){
  const elements=new Map(),timers=new Map();let timerId=0;
  function element(){return {open:false,innerHTML:'',setAttribute(){},addEventListener(){},showModal(){this.open=true;},querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};}
  const dialog=element();const attempt={orderId:'order-test',token:'private-token',savedAt:Date.now()};
  const sandbox={URLSearchParams,URL,Intl,Date,AbortSignal,console,history:{replaceState(){}},location:{search:'?payment=success&orderId=order-test',pathname:'/',hash:''},sessionStorage:{getItem:()=>hasAttempt?JSON.stringify(attempt):null,setItem(){},removeItem(){}},window:{DailyCart:{toast(){}}},document:{createElement:name=>name==='dialog'?dialog:element(),body:{append(){}},getElementById:()=>null,addEventListener(){}},setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),fetch:async(url,options)=>{
    if(url.endsWith('/public-config'))return {ok:true,json:async()=>({})};
    assert.equal(options.headers.Authorization,'Bearer private-token');
    const state=statuses.shift();if(state instanceof Error)throw state;
    return {ok:true,json:async()=>({id:'order-test',reference:'DC-TEST',mode:'pickup',paymentMethod:'online',lifecycle:'active',totalPrice:20,paymentStatus:state})};
  }};
  vm.runInNewContext(code,sandbox);await new Promise(resolve=>setImmediate(resolve));
  return {dialog,elements,async poll(){const first=timers.entries().next().value;assert.ok(first);timers.delete(first[0]);await first[1]();await new Promise(resolve=>setImmediate(resolve));}};
}
test('return URL cannot show success until server confirms the payment',async()=>{
  const view=await checkoutReturn(['pending','paid']);assert.equal(view.dialog.open,true);assert.doesNotMatch(view.dialog.innerHTML,/Paiement <em>réussi/);assert.match(view.dialog.innerHTML,/En attente de la confirmation/);
  await view.poll();assert.match(view.dialog.innerHTML,/Paiement <em>réussi/);assert.match(view.dialog.innerHTML,/Votre paiement est confirmé/);assert.match(view.dialog.innerHTML,/Continuer/);
});
test('temporary status failure keeps verification open and retries without claiming payment',async()=>{
  const view=await checkoutReturn([new Error('offline'),'paid']);assert.equal(view.dialog.open,true);assert.doesNotMatch(view.dialog.innerHTML,/Paiement <em>réussi/);assert.match(view.elements.get('#order-feedback').textContent,/Vérification momentanément indisponible/);await view.poll();assert.match(view.dialog.innerHTML,/Paiement <em>réussi/);
});
test('forged success URL without the saved order token does not open a success popup',async()=>{
  const view=await checkoutReturn([],{hasAttempt:false});assert.equal(view.dialog.open,false);assert.doesNotMatch(view.dialog.innerHTML,/réussi/);
});
