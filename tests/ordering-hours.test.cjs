const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const {createOrderingHours}=require('../lib/ordering-hours.cjs');
const {OrderService}=require('../lib/order-service.cjs');
const {createApi}=require('../lib/api.cjs');
const {catalog}=require('../lib/order-validation.cjs');
const night=new Date('2026-09-30T20:00:00Z');
test('only boolean true overrides hours; absent settings and read failures use regular hours',async()=>{
  for(const value of [false,undefined,null,'true',1]){
    const getOpening=createOrderingHours({readSettings:async()=>({allowOutsideHours:value})});
    assert.equal((await getOpening(night)).open,false);
    assert.equal((await getOpening(new Date('2026-09-30T10:00:00Z'))).open,true);
  }
  const getOpening=createOrderingHours({readSettings:async()=>{throw Error('offline');}});
  assert.equal((await getOpening(night)).open,false);
});
test('OFF blocks forged overrides; ON admits orders; switching OFF rechecks before Checkout',async()=>{
  let enabled=false,saved,calls=0;
  const getOpening=createOrderingHours({readSettings:async()=>({allowOutsideHours:enabled})});
  const store={create:async(id,order,secret)=>saved={order,secret},get:async()=>saved,setSession:async()=>{}};
  const stripe={checkout:{sessions:{create:async()=>{calls++;return {id:'cs_live_fixture',status:'open',url:'https://checkout.stripe.com/example'};}}}};
  const service=new OrderService({store,stripe,baseUrl:'https://daily.example',now:()=>night,getOpening});
  const pizza=[...catalog.values()].find(p=>p.name==='Regina'&&p.category==='pizzas');
  const body={requestId:crypto.randomUUID(),allowOutsideHours:true,mode:'pickup',paymentMethod:'online',items:[{productId:pizza.id,quantity:1,choices:{size:'1'}}],customer:{name:'Test',email:'test@example.com',phone:'0612345678'}};
  const token='a'.repeat(64);
  await assert.rejects(service.create(body,token),/fermé/);assert.equal(saved,undefined);
  enabled=true;const order=await service.create(body,token);
  assert.equal(order.outsideOpeningHours,true);assert.equal(saved.order.openingOverride,true);
  assert.match(order.openingWarning,/acceptée/);assert.doesNotMatch(order.openingWarning,/fermé/);
  enabled=false;await assert.rejects(service.checkout(order.id,token),/fermé/);assert.equal(calls,0);
  enabled=true;assert.match((await service.checkout(order.id,token)).url,/checkout.stripe.com/);assert.equal(calls,1);
});
test('public config reflects each switch change without publishing private settings',async t=>{
  let enabled=false;
  const policy=createOrderingHours({readSettings:async()=>({allowOutsideHours:enabled,privateNote:'not public'})});
  const app=express();app.use('/api',createApi({env:{},getOpening:()=>policy(night)}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/public-config`;
  for(const value of [false,true,false]){enabled=value;const r=await fetch(url);const config=await r.json();assert.equal(config.opening.open,value);assert.equal(config.opening.allowOutsideHours,value);assert.equal(config.opening.scheduledOpen,false);assert.equal(config.opening.privateNote,undefined);assert.equal(r.headers.get('cache-control'),'no-store');}
});
