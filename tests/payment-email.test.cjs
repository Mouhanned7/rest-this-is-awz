const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {PaymentReceipt,ReceiptStore}=require('../lib/payment-receipt.cjs');
const {OrderEmail}=require('../lib/integrations.cjs');
const {createApi}=require('../lib/api.cjs');
const {HttpError}=require('../lib/order-validation.cjs');
const id='a'.repeat(28);
class TestStore extends ReceiptStore {
  constructor(){super();this.rows=new Map([['dailyOrders/'+id,{id,paymentStatus:'paid',lifecycle:'active'}]]);this.queue=Promise.resolve();}
  get db(){return {collection:name=>({doc:key=>({key:name+'/'+key})}),runTransaction:fn=>{
    const task=this.queue.then(async()=>{const writes=[];const r=await fn({get:async ref=>({exists:this.rows.has(ref.key),data:()=>this.rows.get(ref.key)}),set:(ref,data)=>writes.push(()=>this.rows.set(ref.key,data)),update:(ref,data)=>writes.push(()=>this.rows.set(ref.key,{...this.rows.get(ref.key),...data}))});writes.forEach(w=>w());return r;});this.queue=task.catch(()=>{});return task;
  }};}
}
test('mobile payment receipt is separate from owner confirmation and deduplicated across phones',async()=>{
  const store=new TestStore();let sends=0;const service=new PaymentReceipt({store,email:{send:async(order,action)=>{assert.equal(action,'paid');sends++;return 'smtp-id';}}});
  const calls=await Promise.allSettled([service.perform(id),service.perform(id)]);
  assert.ok(calls.some(c=>c.status==='fulfilled'));assert.equal(sends,1);
  await service.perform(id);assert.equal(sends,1);
  assert.equal(store.rows.get('dailyOrders/'+id).lifecycle,'active');
  assert.equal(store.rows.get('dailyOrders/'+id).paymentEmailStatus,'accepted');
});
test('unpaid orders cannot receive a receipt; SMTP failure stays retryable',async()=>{
  const store=new TestStore();let sends=0,fail=true;
  const service=new PaymentReceipt({store,email:{send:async()=>{sends++;if(fail)throw new Error('SMTP unavailable');return 'id';}}});
  store.rows.get('dailyOrders/'+id).paymentStatus='pending';await assert.rejects(service.perform(id),e=>e.status===409);assert.equal(sends,0);
  store.rows.get('dailyOrders/'+id).paymentStatus='paid';await assert.rejects(service.perform(id),/SMTP unavailable/);
  assert.equal(store.rows.get('dailyPaymentEmails/'+id).leaseUntil,0);assert.equal(store.rows.get('dailyOrders/'+id).paymentEmailStatus,undefined);
  fail=false;await service.perform(id);assert.equal(sends,2);assert.equal(store.rows.get('dailyOrders/'+id).paymentEmailStatus,'accepted');
});
test('receipt includes paid wording without falsely confirming preparation',async()=>{
  let message;
  const email=new OrderEmail({SMTP_EMAIL:'shop@gmail.com',SMTP_APP_PASSWORD:'test-pass'},()=>({sendMail:async m=>{message=m;return {messageId:m.messageId,accepted:['client@example.com']};},close(){}}));
  await email.send({id,reference:'DC-TEST',paymentStatus:'paid',lifecycle:'active',mode:'pickup',totalPrice:20,customer:{name:'Client',email:'client@example.com'},items:[]},'paid');
  assert.match(message.subject,/Paiement reçu/);assert.match(message.text,/attend maintenant la confirmation/);assert.doesNotMatch(message.text,/annulée|a été confirmée/);
});
test('receipt endpoint requires the mobile owner role',async t=>{
  let sends=0;const app=express();app.use('/api',createApi({env:{SMTP_EMAIL:'shop@gmail.com',SMTP_APP_PASSWORD:'test'},paymentReceipt:{perform:async()=>{sends++;return {ok:true,status:'accepted'};}},verifyAdmin:async token=>{if(token!=='owner')throw new HttpError(403,'Accès refusé');return 'uid';}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
  const url=`http://127.0.0.1:${server.address().port}/api/admin/orders/${id}/payment-email`;
  assert.equal((await fetch(url,{method:'POST'})).status,403);assert.equal(sends,0);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer owner'}})).status,200);assert.equal(sends,1);
});
