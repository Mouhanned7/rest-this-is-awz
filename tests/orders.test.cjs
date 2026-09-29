const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const Stripe=require('stripe');
const {catalog,validateOrder,quoteItem,HttpError}=require('../lib/order-validation.cjs');
const {OrderService}=require('../lib/order-service.cjs');
const {ActionStore}=require('../lib/action-store.cjs');
const {OwnerActions}=require('../lib/owner-actions.cjs');
const {createApi}=require('../lib/api.cjs');
const pizza=[...catalog.values()].find(p=>p.name==='Regina'&&p.category==='pizzas');
function body(overrides={}){return {requestId:crypto.randomUUID(),mode:'pickup',paymentMethod:'online',items:[{productId:pizza.id,quantity:1,choices:{size:'1',note:''}}],customer:{name:'Test client',email:'test@example.com',phone:'06 12 34 56 78'},...overrides};}
// Exercise the production Firestore transaction methods against an isolated in-memory DB.
class TestStore extends ActionStore {
  constructor(){super();this.docs=new Map();this.queue=Promise.resolve();this.fake={collection:name=>({doc:id=>({key:`${name}/${id}`,get:async()=>this.snapshot(`${name}/${id}`)})}),runTransaction:fn=>{
    const run=this.queue.then(async()=>{const writes=[];const result=await fn({get:async ref=>this.snapshot(ref.key),create:(ref,data)=>writes.push(()=>this.docs.set(ref.key,data)),set:(ref,data)=>writes.push(()=>this.docs.set(ref.key,data)),delete:ref=>writes.push(()=>this.docs.delete(ref.key)),update:(ref,data)=>writes.push(()=>this.docs.set(ref.key,{...this.docs.get(ref.key),...data}))});writes.forEach(fn=>fn());return result;});this.queue=run.catch(()=>{});return run;
  }};}
  snapshot(key){return {exists:this.docs.has(key),data:()=>this.docs.get(key)};}
  get db(){return this.fake;}
}
function setup(){const store=new TestStore();let calls=0;const sessions=new Map();const stripe={checkout:{sessions:{create:async(data,options)=>{calls++;const id='cs_test_'+options.idempotencyKey;const session=sessions.get(id)||{id,url:'https://checkout.stripe.com/c/pay/test',status:'open',payment_status:'unpaid',amount_total:data.line_items[0].price_data.unit_amount,currency:'eur',client_reference_id:data.client_reference_id,metadata:data.metadata};sessions.set(id,session);return session;},retrieve:async id=>sessions.get(id)}}};return {store,stripe,sessions,get calls(){return calls;},service:new OrderService({store,stripe,baseUrl:'https://daily.example'})};}
test('French numbers accept spaces and +33 but reject foreign, truncated and oversized inputs',()=>{
  for(const phone of ['0612345678','06 12 34 56 78','01.23.45.67.89','+33 6 12 34 56 78']){const input=body();input.customer.phone=phone;assert.doesNotThrow(()=>validateOrder(input));}
  for(const phone of ['+21612345678','+441234567890','061234567','06123456789','+330612345678','06123abcde','0000000000']){const input=body();input.customer.phone=phone;assert.throws(()=>validateOrder(input),/français/);}
});
test('server ignores supplied prices, status and discounts; normalizes contact details',()=>{
  const input=body({totalPrice:.01,paymentStatus:'paid'});input.items[0].price=.01;
  const order=validateOrder(input);assert.equal(order.amountTotal,1790);assert.equal(order.customer.phone,'0612345678');assert.equal(order.paymentStatus,undefined);
});
test('unknown products, quantities, omitted choices, forged options and bad coordinates are rejected',()=>{
  for(const item of [{productId:'fake',quantity:1,choices:{}},{productId:pizza.id,quantity:-1,choices:{size:'1'}},{productId:pizza.id,quantity:1},{productId:pizza.id,quantity:1,choices:{size:'5'}},{productId:pizza.id,quantity:1,choices:{size:'1',discount:999}}])assert.throws(()=>validateOrder(body({items:[item]})),/./);
  const input=body({mode:'delivery'});input.items[0].quantity=2;input.customer.address='40 rue Bourneil, Auxerre';input.customer.location={latitude:500,longitude:3,accuracy:20};assert.throws(()=>validateOrder(input),/GPS/);
});
test('delivery minimum applies after pizza promotion and coordinates survive validation',()=>{
  const input=body({mode:'delivery'});input.customer.address='40 rue Bourneil, Auxerre';assert.throws(()=>validateOrder(input),/minimum/);
  input.items[0].quantity=2;input.customer.location={latitude:47.8,longitude:3.57,accuracy:12.5};const order=validateOrder(input);assert.equal(order.totalPrice,26.85);assert.equal(order.customer.location.accuracy,13);assert.match(order.customer.location.mapsUrl,/47.8,3.57/);
});
test('tacos extras and quantities are priced exclusively from catalogue',()=>{
  const taco=[...catalog.values()].find(p=>p.choice==='tacos');
  const item=quoteItem({productId:taco.id,quantity:2,choices:{size:'0',meat1:'Tenders',gratin:'Cheddar',extra:'Cheddar +1,00 €',additionalMeat:'Kebab',drink:'Coca-Cola',note:''}});
  assert.equal(item.price,taco.sizes[0].price+5.5);assert.equal(item.lineTotal,item.price*2);
});
test('retried creation uses one order; foreign tokens and changed payloads cannot access it',async()=>{
  const {service,store}=setup(),input=body(),token='a'.repeat(64);const first=await service.create(input,token);const second=await service.create(input,token);assert.equal(first.id,second.id);assert.equal(store.docs.size,2);
  await assert.rejects(service.status(first.id,'b'.repeat(64)),/introuvable/);
  await assert.rejects(service.create({...input,note:'Changed'},token),/autre commande/);
  const status=await service.status(first.id,token);assert.equal(status.customer,undefined);assert.equal(status.paymentStatus,'pending');
});
test('Checkout is reused and return URL cannot mark an order paid',async()=>{
  const fixture=setup(),input=body(),token='c'.repeat(64),order=await fixture.service.create(input,token);
  await fixture.service.checkout(order.id,token);await fixture.service.checkout(order.id,token);assert.equal(fixture.calls,1);
  assert.equal((await fixture.service.status(order.id,token)).paymentStatus,'pending');
});
test('webhook confirms matched payment once, rejects tampering and cannot regress paid status',async()=>{
  const {service,store,sessions}=setup(),token='d'.repeat(64),order=await service.create(body(),token);await service.checkout(order.id,token);
  const session={...[...sessions.values()][0],payment_status:'paid',payment_intent:'pi_test'};
  const event={id:'evt_ok',type:'checkout.session.completed',data:{object:session}};
  await assert.rejects(service.webhook({...event,data:{object:{...session,amount_total:1}}}),/incohérent/);
  await assert.rejects(service.webhook({...event,data:{object:{...session,id:'cs_other'}}}),/incohérente/);
  await service.webhook(event);await service.webhook(event);assert.equal((await service.status(order.id,token)).paymentStatus,'paid');
  await service.webhook({id:'evt_expired',type:'checkout.session.expired',data:{object:{...session,payment_status:'unpaid'}}});assert.equal((await service.status(order.id,token)).paymentStatus,'paid');assert.equal([...store.docs.keys()].filter(k=>k.startsWith('dailyStripeEvents/evt_ok')).length,1);
});
test('pay-at-collection orders cannot start online checkout',async()=>{
  const {service}=setup(),token='e'.repeat(64),order=await service.create(body({paymentMethod:'on_collection'}),token);await assert.rejects(service.checkout(order.id,token),/retrait/);
});
function ownerFixture(fixture){let emails=0;const email={send:async()=>{emails++;return 'email_test';}};return {email,get emails(){return emails;},get deletions(){return [...fixture.store.docs.keys()].filter(k=>k.startsWith('dailyOrderArchive/')).length;},actions:new OwnerActions({store:fixture.store,orders:fixture.service,email})};}
test('owner confirmation requires paid status, sends one email and removes active order; retry stays closed',async()=>{
  const fixture=setup(),owner=ownerFixture(fixture),token='1'.repeat(64),input=body(),order=await fixture.service.create(input,token);
  await assert.rejects(owner.actions.perform(order.id,'confirm','admin'),/payée/);
  fixture.store.docs.get('dailyOrders/'+order.id).paymentStatus='paid';
  await owner.actions.perform(order.id,'confirm','admin');await owner.actions.perform(order.id,'confirm','admin');
  assert.equal(owner.emails,1);assert.equal(owner.deletions,1);assert.equal(fixture.store.docs.has('dailyOrders/'+order.id),false);
  assert.equal((await fixture.service.status(order.id,token)).lifecycle,'confirmed');
  await fixture.service.create(input,token);assert.equal(fixture.store.docs.has('dailyOrders/'+order.id),false);
  await assert.rejects(fixture.service.checkout(order.id,token),/clôturée/);
});
test('unpaid cancellation expires Stripe first and rejects a payment completed during the race',async()=>{
  const fixture=setup(),owner=ownerFixture(fixture),token='2'.repeat(64),order=await fixture.service.create(body(),token);
  fixture.stripe.checkout.sessions.expire=async id=>{const session=fixture.sessions.get(id);session.status='expired';return session;};
  await owner.actions.perform(order.id,'cancel','admin');assert.equal([...fixture.sessions.values()][0].status,'expired');assert.equal(owner.emails,1);assert.equal(owner.deletions,1);assert.equal((await fixture.service.status(order.id,token)).lifecycle,'cancelled');
  const second=await fixture.service.create(body(),token);await fixture.service.checkout(second.id,token);const session=[...fixture.sessions.values()].find(s=>s.metadata.orderId===second.id);session.status='complete';session.payment_status='paid';
  await assert.rejects(owner.actions.perform(second.id,'cancel','admin'),/Paiement reçu/);assert.equal(owner.emails,1);assert.equal(owner.deletions,1);assert.equal((await fixture.store.get(second.id)).order.lifecycle,'active');
});
test('failed Firestore archival keeps retry state and does not resend the confirmed email',async()=>{
  const fixture=setup(),owner=ownerFixture(fixture),token='3'.repeat(64),order=await fixture.service.create(body({paymentMethod:'on_collection'}),token);
  const original=fixture.store.finish.bind(fixture.store);fixture.store.finish=async()=>{throw new Error('offline');};
  await assert.rejects(owner.actions.perform(order.id,'cancel','admin'),/offline/);assert.equal(owner.emails,1);assert.equal(fixture.store.docs.has('dailyOrders/'+order.id),true);
  fixture.store.finish=original;await owner.actions.perform(order.id,'cancel','admin');assert.equal(owner.emails,1);assert.equal(owner.deletions,1);
});
test('failed email keeps the active order and prevents deletion; concurrent owner actions are locked',async()=>{
  const fixture=setup(),owner=ownerFixture(fixture),token='4'.repeat(64),order=await fixture.service.create(body({paymentMethod:'on_collection'}),token);
  owner.email.send=async()=>{throw new Error('mail offline');};await assert.rejects(owner.actions.perform(order.id,'cancel','admin'),/mail offline/);assert.equal(owner.deletions,0);assert.equal(fixture.store.docs.has('dailyOrders/'+order.id),true);
  const claim=await fixture.store.claim(order.id,'cancel','admin');await assert.rejects(owner.actions.perform(order.id,'cancel','admin'),/en cours/);await fixture.store.release(order.id,claim.operation.lease);
});
test('payment arriving after a server restart releases an unfinished cancellation',async()=>{
  const fixture=setup(),owner=ownerFixture(fixture),token='5'.repeat(64),order=await fixture.service.create(body(),token);
  const claim=await fixture.store.claim(order.id,'cancel','admin');await fixture.store.release(order.id,claim.operation.lease);
  fixture.store.docs.get('dailyOrders/'+order.id).paymentStatus='paid';
  await assert.rejects(owner.actions.perform(order.id,'cancel','admin'),/paiement a été confirmé/);
  assert.equal(fixture.store.docs.has('dailyOperations/'+order.id),false);
  await owner.actions.perform(order.id,'confirm','admin');assert.equal(owner.emails,1);assert.equal(owner.deletions,1);
});

test('SMTP failure can be retried later and only accepted mail permits archival',async()=>{
  const fixture=setup(),owner=ownerFixture(fixture),order=await fixture.service.create(body({paymentMethod:'on_collection'}),'6'.repeat(64));
  const send=owner.email.send;owner.email.send=async()=>{throw new Error('SMTP unavailable');};
  await assert.rejects(owner.actions.perform(order.id,'cancel','admin'),/SMTP unavailable/);
  assert.equal(owner.deletions,0);
  fixture.store.docs.get('dailyOperations/'+order.id).emailAttemptAt=Date.now()-48*3600000;
  owner.email.send=send;await owner.actions.perform(order.id,'cancel','admin');
  assert.equal(owner.emails,1);assert.equal(owner.deletions,1);
});
test('HTTP API verifies raw Stripe signatures, rejects forged events and enforces origin',async t=>{
  const fixture=setup(),token='f'.repeat(64),order=await fixture.service.create(body(),token);await fixture.service.checkout(order.id,token);
  const secret='whsec_local_unit_test_only';const env={ONLINE_ORDERING_ENABLED:'true',FIREBASE_PROJECT_ID:'demo-unit',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',STRIPE_SECRET_KEY:'sk_test_unit_only',STRIPE_WEBHOOK_SECRET:secret,PUBLIC_BASE_URL:'https://daily.example'};
  const app=express();app.use('/api',createApi({env,service:fixture.service}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}/api`;
  const post=(path,value,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof value==='string'?value:JSON.stringify(value)});
  assert.equal((await post('/orders',body(),{Origin:'https://evil.example'})).status,403);
  assert.equal((await fetch(base+'/orders/'+order.id)).status,404);
  const payload=JSON.stringify({id:'evt_http',type:'checkout.session.completed',data:{object:{...[...fixture.sessions.values()][0],payment_status:'paid'}}});
  assert.equal((await post('/stripe/webhook',payload,{'stripe-signature':'forged'})).status,400);
  const signature=Stripe.webhooks.generateTestHeaderString({payload,secret});assert.equal((await post('/stripe/webhook',payload,{'stripe-signature':signature})).status,200);
  assert.equal((await fixture.service.status(order.id,token)).paymentStatus,'paid');
  const config=await(await fetch(base+'/public-config')).json();assert.deepEqual(Object.keys(config).sort(),['opening','orderingEnabled','paymentsEnabled','testMode']);
});
test('owner endpoint rejects unauthenticated and non-admin accounts before any side effect',async t=>{
  let actions=0;
  const env={SMTP_EMAIL:'test@example.com',SMTP_APP_PASSWORD:'unit-password'};
  const app=express();app.use('/api',createApi({env,ownerActions:{perform:async(id,action,actor)=>{actions++;return {ok:true,actor,action};}},verifyAdmin:async token=>{if(!token)throw new HttpError(401,'Reconnectez-vous.');if(token!=='admin-test')throw new HttpError(403,'Accès responsable requis.');return 'admin-id';}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));const url=`http://127.0.0.1:${server.address().port}/api/admin/orders/${'a'.repeat(28)}/action`;
  for(const [token,status] of [['',401],['customer-test',403],['admin-test',200]]){const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'confirm'})});assert.equal(res.status,status);}
  assert.equal(actions,1);
});
