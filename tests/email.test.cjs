const {test}=require('node:test');
const assert=require('node:assert/strict');
const {OrderEmail,emailConfigured,smtpOptions}=require('../lib/integrations.cjs');
const env={SMTP_EMAIL:'restaurant@gmail.com',SMTP_APP_PASSWORD:'abcd efgh ijkl mnop'};
const order={id:'a'.repeat(28),reference:'DAILY-TEST',customer:{name:'Client',email:'client@example.com',address:'40 rue Bourneil, Auxerre'},mode:'delivery',items:[{quantity:2,name:'Regina',lineTotal:20,options:'Senior'}],totalPrice:20,note:'Sonnez'};

test('email + app password configure Gmail; other SMTP requires encrypted ports',()=>{
  assert.equal(emailConfigured({}),false);assert.equal(emailConfigured(env),true);
  assert.equal(emailConfigured({...env,SMTP_PORT:'25'}),false);
  assert.equal(emailConfigured({...env,SMTP_EMAIL:'invalid'}),false);
  const gmail=smtpOptions(env);assert.equal(gmail.host,'smtp.gmail.com');assert.equal(gmail.port,465);assert.equal(gmail.secure,true);assert.equal(gmail.auth.pass,'abcdefghijklmnop');
  const other=smtpOptions({...env,SMTP_HOST:'smtp.example.com',SMTP_PORT:'587'});assert.equal(other.secure,false);assert.equal(other.requireTLS,true);assert.equal(other.auth.pass,env.SMTP_APP_PASSWORD);
});

test('SMTP confirmations and cancellations include details and stable IDs, await acceptance and close',async()=>{
  const messages=[];let closed=0;
  const email=new OrderEmail(env,options=>{assert.equal(options.auth.user,env.SMTP_EMAIL);return {sendMail:async message=>{messages.push(message);return {accepted:[order.customer.email],messageId:message.messageId};},close:()=>closed++};});
  const first=await email.send(order,'confirm');assert.equal(await email.send(order,'confirm'),first);
  const cancelled=await email.send(order,'cancel');assert.notEqual(first,cancelled);assert.equal(closed,3);
  assert.equal(messages[0].from.address,env.SMTP_EMAIL);assert.equal(messages[0].to.address,order.customer.email);
  assert.match(messages[0].text,/payée a été confirmée/);assert.match(messages[0].text,/2 × Regina/);assert.match(messages[0].text,/40 rue Bourneil/);assert.match(messages[0].text,/Sonnez/);
  assert.match(messages[2].text,/non payée a été annulée/);assert.match(messages[2].subject,/Commande annulée/);
  assert.match(messages[0].html,/<html lang="fr">/);assert.match(messages[0].html,/Total payé/);
  assert.match(messages[0].html,/tel:\+33386311717/);assert.equal(messages[0].replyTo.address,env.SMTP_EMAIL);
});

test('HTML email escapes customer content, retains the plain text and differentiates all statuses',async()=>{
  const {orderEmailContent}=require('../lib/email-template.cjs');
  const untrusted={...order,pizzaDiscount:2,customer:{...order.customer,name:'<img src=x onerror=alert(1)>',address:'Rue <script>test</script> & cour'},note:'<a href="https://evil.test">ouvrir</a>\nCode 123',items:[{quantity:1,name:'Pizza <b>test</b>',options:'Senior & extra\nSans olives',lineTotal:20}]};
  for(const action of ['confirm','cancel','paid']){
    const content=orderEmailContent(untrusted,action);
    assert.doesNotMatch(content.html,/<script|<img|https:\/\/evil.test">/);
    assert.match(content.html,/&lt;img/);assert.match(content.html,/Senior &amp; extra<br>Sans olives/);
    assert.match(content.html,/Rue &lt;script&gt;test/);assert.match(content.html,/Remise incluse/);
    assert.match(content.text,/Code 123/);assert.match(content.html,/@media\(max-width:600px\)/);
    if(action==='cancel'){assert.doesNotMatch(content.html,/Total payé/);assert.match(content.html,/aucun montant à régler/);}
    if(action==='paid'){assert.match(content.html,/attend maintenant la confirmation/);assert.doesNotMatch(content.html,/a été confirmée/);}
  }
  const pickup=orderEmailContent({...order,mode:'pickup',lifecycle:'confirmed'},'paid');
  assert.match(pickup.html,/Retrait au restaurant/);assert.match(pickup.html,/a été confirmée/);
});

test('rejection, uncertain response and SMTP errors never count as accepted or reveal credentials',async()=>{
  for(const result of [{accepted:[],messageId:'id'},{accepted:['someone@example.com'],messageId:'id'},{accepted:[order.customer.email]}]){
    let closed=false;const email=new OrderEmail(env,()=>({sendMail:async()=>result,close:()=>{closed=true;}}));
    await assert.rejects(email.send(order,'confirm'),error=>error.status===503);assert.equal(closed,true);
  }
  const email=new OrderEmail(env,()=>({sendMail:async()=>{throw new Error(env.SMTP_APP_PASSWORD);},close:()=>{}}));
  await assert.rejects(email.send(order,'cancel'),error=>error.status===503&&!error.message.includes(env.SMTP_APP_PASSWORD));
  await assert.rejects(new OrderEmail({}).send(order,'confirm'),error=>error.status===503);
});
