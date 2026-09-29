const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');
const code=fs.readFileSync(require('node:path').join(__dirname,'../js/daily-checkout.js'),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
async function page({closed=false,accept=true,createdClosed=closed,geolocation}={}){
  const events={},dialogEvents={},elements=new Map(),orders=[];let confirms=0,alerts=0;
  const element=()=>({value:'',textContent:'',disabled:false,hidden:true,setAttribute(){},addEventListener(){},isConnected:true});
  const form={querySelector:s=>el(s)},el=s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s);};
  const dialog={open:false,innerHTML:'',setAttribute(){},addEventListener:(name,fn)=>dialogEvents[name]=fn,showModal(){this.open=true;},close(){this.open=false;dialogEvents.close?.();},querySelector:s=>s==='#checkout-form'?form:el(s)};
  const fields={name:'Test',email:'client@example.com',phone:'0612345678',address:'Adresse saisie',paymentMethod:'on_collection'};
  const snapshot={mode:'delivery',items:[{productId:'test',quantity:1,choices:{}}]};
  const window={isSecureContext:true,DailyLocation:require('../js/daily-location.js'),confirm:()=>{confirms++;return accept;},alert:()=>alerts++,DailyCart:{snapshot:()=>snapshot,total:()=>20,clearIfUnchanged(){},toast(){}}};
  const sandbox={URLSearchParams,URL,Intl,Date,AbortSignal,console,crypto:crypto.webcrypto,navigator:{geolocation},window,location:{search:'',pathname:'/',hash:''},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},FormData:class{constructor(){return Object.entries(fields);}},document:{createElement:name=>name==='dialog'?dialog:element(),body:{append(){}},getElementById:id=>id==='cart-dialog'?{close(){}}:element(),addEventListener:(name,fn)=>events[name]=fn},setTimeout:()=>1,clearTimeout(){},fetch:async(url,options)=>{
    let data;
    if(url.endsWith('/public-config'))data={orderingEnabled:true,paymentsEnabled:false,opening:{open:!closed,message:'Restaurant fermé. Réouverture à 11 h.'}};
    else if(url.endsWith('/location/reverse'))data={address:'Adresse GPS proposée'};
    else if(url.endsWith('/orders')){orders.push(JSON.parse(options.body));data={id:'test',reference:'TEST',paymentMethod:'on_collection',paymentStatus:'pending',lifecycle:'active',outsideOpeningHours:createdClosed,openingWarning:'Restaurant fermé. Réouverture à 11 h.'};}
    else throw new Error(url);
    return {ok:true,json:async()=>data};
  }};
  vm.runInNewContext(code,sandbox);await tick();
  const click=async id=>{events.click({target:{closest:s=>s===id}});await tick();};
  await click('#begin-checkout');
  return {dialog,orders,el,click,get confirms(){return confirms;},get alerts(){return alerts;},async submit(){dialogEvents.submit({preventDefault(){},target:{...form,id:'checkout-form'}});await tick();}};
}
test('outside opening hours declining the alert creates no order; acceptance displays the warning',async()=>{
  const decline=await page({closed:true,accept:false});assert.match(decline.dialog.innerHTML,/Restaurant fermé/);await decline.submit();assert.equal(decline.confirms,1);assert.equal(decline.orders.length,0);assert.equal(decline.el('[type="submit"]').disabled,false);
  const accept=await page({closed:true});await accept.submit();assert.equal(accept.confirms,1);assert.equal(accept.orders.length,1);assert.match(accept.dialog.innerHTML,/Restaurant fermé/);
  const boundary=await page({closed:false,createdClosed:true});await boundary.submit();assert.equal(boundary.alerts,1);
});
test('GPS preserves a typed address and shows its Google Maps link',async()=>{
  const ui=await page({geolocation:{getCurrentPosition(ok){ok({coords:{latitude:47.8,longitude:3.57,accuracy:10}});}}});
  ui.el('[name="address"]').value='Adresse saisie';await ui.click('#detect-position');
  assert.equal(ui.el('[name="address"]').value,'Adresse saisie');assert.match(ui.el('#customer-map').href,/47.8,3.57/);assert.equal(ui.el('#customer-map').hidden,false);
  assert.match(ui.el('#location-feedback').textContent,/conservée/);await ui.submit();assert.equal(ui.orders[0].customer.location.latitude,47.8);
});
test('GPS fills an empty address but a cleared pending location never comes back',async()=>{
  const ui=await page({geolocation:{getCurrentPosition(ok){ok({coords:{latitude:47.8,longitude:3.57,accuracy:10}});}}});await ui.click('#detect-position');assert.equal(ui.el('[name="address"]').value,'Adresse GPS proposée');
  let resolve;const pending=await page({geolocation:{getCurrentPosition(ok){resolve=ok;}}});await pending.click('#detect-position');await pending.click('#clear-position');resolve({coords:{latitude:47.8,longitude:3.57,accuracy:10}});await tick();await pending.submit();assert.equal(pending.orders[0].customer.location,null);
});
