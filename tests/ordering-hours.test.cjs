const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const {createOrderingHours}=require('../lib/ordering-hours.cjs');
const {OrderService}=require('../lib/order-service.cjs');
const {createApi}=require('../lib/api.cjs');
const {catalog}=require('../lib/order-validation.cjs');
const night=new Date('2026-09-30T02:00:00Z');   // 04h à Paris : fermé
const day=new Date('2026-09-30T10:00:00Z');     // 12h à Paris : ouvert
test('ouvert dans les horaires, fermé sinon : aucun réglage ne force l\'ouverture',async()=>{
  const getOpening=createOrderingHours({readSettings:async()=>({allowOutsideHours:true})});
  assert.equal((await getOpening(night)).open,false);
  assert.equal((await getOpening(day)).open,true);
  assert.match((await getOpening(night)).message,/fermé/);
});
test('une commande hors horaires est refusée, même avec un champ allowOutsideHours forgé',async()=>{
  let saved,calls=0,now=night;
  const getOpening=createOrderingHours();
  const store={create:async(id,order,secret)=>saved={order,secret},get:async()=>saved,setSession:async()=>{}};
  const stripe={checkout:{sessions:{create:async()=>{calls++;return {id:'cs_live_fixture',status:'open',url:'https://checkout.stripe.com/example'};}}}};
  const service=new OrderService({store,stripe,baseUrl:'https://daily.example',now:()=>now,getOpening});
  const pizza=[...catalog.values()].find(p=>p.name==='Regina'&&p.category==='pizzas');
  const body={requestId:crypto.randomUUID(),allowOutsideHours:true,mode:'pickup',paymentMethod:'online',items:[{productId:pizza.id,quantity:1,choices:{size:'1'}}],customer:{name:'Test',email:'test@example.com',phone:'0612345678'}};
  const token='a'.repeat(64);
  await assert.rejects(service.create(body,token),/fermé/);assert.equal(saved,undefined);assert.equal(calls,0);
  now=day;const order=await service.create(body,token);
  assert.equal(order.outsideOpeningHours,false);
  now=night;await assert.rejects(service.checkout(order.id,token),/fermé/);assert.equal(calls,0);
  now=day;assert.match((await service.checkout(order.id,token)).url,/checkout.stripe.com/);assert.equal(calls,1);
});
test('la configuration publique suit uniquement les horaires et ne publie pas de réglage privé',async t=>{
  let now=night;
  const policy=createOrderingHours({readSettings:async()=>({allowOutsideHours:true,privateNote:'not public'})});
  const app=express();app.use('/api',createApi({env:{},getOpening:()=>policy(now)}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/public-config`;
  for(const [instant,open] of [[night,false],[day,true],[night,false]]){now=instant;const config=await (await fetch(url)).json();assert.equal(config.opening.open,open);assert.equal(config.opening.allowOutsideHours,false);assert.equal(JSON.stringify(config).includes('privateNote'),false);}
});
