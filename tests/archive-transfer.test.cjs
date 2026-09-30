const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ArchiveTransfer,archiveDigest}=require('../lib/archive-transfer.cjs');
const id='a'.repeat(28);
function fixture(){
  const docs=new Map(),snapshot=key=>({exists:docs.has(key),data:()=>docs.get(key)});
  const collection=name=>({doc:id=>({key:`${name}/${id}`,get:async()=>snapshot(`${name}/${id}`)}),where:(field,op,value)=>({limit:()=>({query:true,name,field,value})})});
  const db={collection,runTransaction:async fn=>{const deletes=[];const result=await fn({get:async ref=>ref.query?{docs:[...docs].filter(([key,data])=>key.startsWith(ref.name+'/')&&data[ref.field]===ref.value).map(([key])=>({ref:{key}})),size:[...docs].filter(([key,data])=>key.startsWith(ref.name+'/')&&data[ref.field]===ref.value).length}:snapshot(ref.key),delete:ref=>deletes.push(ref.key)});deletes.forEach(key=>docs.delete(key));return result;}};
  class Transfer extends ArchiveTransfer{get db(){return db;}}
  const order={id,lifecycle:'confirmed',paymentStatus:'paid',emailId:'smtp-accepted',totalPrice:17.9};
  docs.set('dailyOrderArchive/'+id,order);docs.set('dailyOrderSecrets/'+id,{tokenHash:'hash'});
  docs.set('dailyStripeEvents/evt1',{orderId:id});docs.set('dailyPaymentEmails/'+id,{emailId:'receipt'});
  return {docs,order,transfer:new Transfer()};
}
test('acknowledged exact archive removes all related records but preserves another order',async()=>{
  const {docs,order,transfer}=fixture();docs.set('dailyOrders/other',{id:'other'});
  assert.deepEqual(await transfer.acknowledge(id,archiveDigest(order)),{purged:true});
  assert.deepEqual([...docs.keys()],['dailyOrders/other']);
  assert.deepEqual(await transfer.acknowledge(id,archiveDigest(order)),{purged:true});
});
test('active, changed, unconfirmed and in-flight archives are retained',async()=>{
  for(const kind of ['active','changed','unconfirmed','inflight']){
    const {docs,order,transfer}=fixture();let digest=archiveDigest(order);
    if(kind==='active')docs.set('dailyOrders/'+id,order);
    if(kind==='changed')digest='0'.repeat(64);
    if(kind==='unconfirmed')delete order.emailId;
    if(kind==='inflight')docs.set('dailyPaymentEmails/'+id,{leaseUntil:Date.now()+90000});
    const count=docs.size;await assert.rejects(transfer.acknowledge(id,digest));assert.equal(docs.size,count);
  }
});
test('Stripe metadata is preserved before deletion and provider failure keeps archive intact',async()=>{
  const {docs,order,transfer}=fixture();order.stripeSessionId='cs_example';let metadata;
  transfer.stripe={checkout:{sessions:{update:async(session,body)=>{metadata=body.metadata;throw Error('offline');}}}};
  await assert.rejects(transfer.acknowledge(id,archiveDigest(order)),/offline/);assert.ok(docs.has('dailyOrderArchive/'+id));
  transfer.stripe.checkout.sessions.update=async(session,body)=>{metadata=body.metadata;};
  await transfer.acknowledge(id,archiveDigest(order));assert.equal(metadata.customerTokenHash,'hash');assert.equal(metadata.dailyLifecycle,'confirmed');assert.equal(docs.size,0);
});
test('archive digest is stable for Firestore timestamps and key ordering',()=>{
  const date=new Date('2026-09-30T12:00:00Z');
  assert.equal(archiveDigest({b:{toDate:()=>date},a:1}),archiveDigest({a:1,b:date.toISOString()}));
});
