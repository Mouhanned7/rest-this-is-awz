const {test}=require('node:test');
const assert=require('node:assert/strict');
const {OrderEmail,smtpOptions}=require('../lib/integrations.cjs');
const {PaymentReceipt}=require('../lib/payment-receipt.cjs');
const {OwnerActions}=require('../lib/owner-actions.cjs');
const env={SMTP_EMAIL:'restaurant@gmail.com',SMTP_APP_PASSWORD:'abcd efgh ijkl mnop',SMTP_DEADLINE_MS:'80'};
const order={id:'a'.repeat(28),reference:'DC-TEST',customer:{name:'Client',email:'client@example.com',address:'40 rue Bourneil, Auxerre'},mode:'delivery',items:[{quantity:1,name:'Regina',lineTotal:10,options:'Senior'}],totalPrice:10,paymentStatus:'paid'};
// Serveur SMTP qui ne répond jamais : sendMail ne se termine pas.
const hanging=()=>{const t={closed:false,sendMail:()=>new Promise(()=>{}),close(){t.closed=true;}};return t;};

test('délais SMTP raccourcis',()=>{
  const o=smtpOptions(env);
  assert.deepEqual([o.connectionTimeout,o.greetingTimeout,o.socketTimeout,o.dnsTimeout],[5000,5000,6000,3000]);
});

test('un SMTP bloqué est abandonné après la limite et la connexion est fermée',async()=>{
  let transport;const email=new OrderEmail(env,()=>transport=hanging());
  const start=Date.now();
  await assert.rejects(email.send(order,'confirm'),e=>e.status===503);
  assert.ok(Date.now()-start<1000,'abandon rapide');assert.equal(transport.closed,true);
});

test('limite par défaut : 6 secondes',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const email=new OrderEmail({...env,SMTP_DEADLINE_MS:undefined},hanging);
  const pending=email.send(order,'paid');
  t.mock.timers.tick(5999);let settled=false;pending.catch(()=>{}).finally(()=>settled=true);await Promise.resolve();assert.equal(settled,false);
  t.mock.timers.tick(1);await assert.rejects(pending,e=>e.status===503);
});

test('reçu de paiement : SMTP bloqué → réponse « non envoyé » rapide, verrou libéré',async()=>{
  let released=0;
  const store={claim:async()=>({order,lease:'l'}),release:async()=>{released++;},complete:async()=>{throw new Error('ne doit pas être appelé');}};
  const receipt=new PaymentReceipt({store,email:new OrderEmail(env,hanging)});
  const start=Date.now();
  assert.deepEqual(await receipt.perform(order.id),{ok:true,status:'not-sent'});
  assert.ok(Date.now()-start<1000);assert.equal(released,1);
});

test('confirmation : SMTP bloqué → commande quand même clôturée, e-mail noté « non envoyé »',async()=>{
  const progress=[];
  const store={claim:async()=>({operation:{lease:'l'},order}),progress:async(id,lease,data)=>{progress.push(data);},finish:async()=>({lifecycle:'confirmed'}),release:async()=>{throw new Error('ne doit pas être appelé');}};
  const actions=new OwnerActions({store,orders:{},email:new OrderEmail(env,hanging)});
  const start=Date.now();
  assert.deepEqual(await actions.perform(order.id,'confirm','owner'),{ok:true,lifecycle:'confirmed'});
  assert.ok(Date.now()-start<1000);assert.deepEqual(progress.at(-1),{emailId:'not-sent'});
});
