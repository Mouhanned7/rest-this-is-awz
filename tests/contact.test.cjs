const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {ContactEmail,validateContact}=require('../lib/contact-email.cjs');
const {createServerlessApp}=require('../lib/serverless.cjs');
const env={SMTP_EMAIL:'restaurant@example.com',SMTP_APP_PASSWORD:'unit-only',CONTACT_EMAIL:'owner@example.com'};
const valid={name:'Camille',email:'camille@example.com',topic:'Une proposition',message:'Bonjour, voici une proposition pour votre restaurant.'};

test('contact validates required fields, limits, email and header injection',()=>{
  assert.deepEqual(validateContact({...valid,name:' Camille '}),valid);
  for(const invalid of [{...valid,name:'X\r\nBcc: x@y.fr'},{...valid,email:'a@b.fr\r\nBcc:x@y.fr'},{...valid,email:'incorrect'},{...valid,topic:'Unknown'},{...valid,message:'Court'},{...valid,message:'a'.repeat(4001)},{...valid,name:[]},null])assert.throws(()=>validateContact(invalid),{status:400});
});

test('contact delivers only to the configured restaurant, escapes HTML and uses reply-to',async()=>{
  let mail,closed=false;
  const sender=new ContactEmail(env,options=>{assert.equal(options.auth.user,env.SMTP_EMAIL);return {sendMail:async value=>{mail=value;return {accepted:[env.CONTACT_EMAIL],messageId:'test-id'};},close(){closed=true;}};});
  assert.deepEqual(await sender.send({...valid,name:'<Camille>',message:'<script>alert("test")</script>',to:'attacker@example.com'}),{sent:true});
  assert.equal(mail.to.address,env.CONTACT_EMAIL);assert.equal(mail.from.address,env.SMTP_EMAIL);assert.equal(mail.replyTo.address,valid.email);
  assert.doesNotMatch(mail.html,/<script>/);assert.match(mail.html,/&lt;script&gt;/);assert.match(mail.text,/<script>/);assert.equal(closed,true);
});

test('contact SMTP failures never claim successful delivery or expose provider details',async()=>{
  for(const result of [{accepted:[],messageId:'test'},new Error('private credential')]){
    let closed=false;
    const sender=new ContactEmail(env,()=>({sendMail:async()=>{if(result instanceof Error)throw result;return result;},close(){closed=true;}}));
    await assert.rejects(sender.send(valid),e=>e.status===503&&!e.message.includes('private credential'));assert.equal(closed,true);
  }
  await assert.rejects(new ContactEmail({}).send(valid),{status:503});
});

async function serve(t,options){const server=http.createServer(createServerlessApp(options)).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));return `http://127.0.0.1:${server.address().port}/api/contact`;}

test('public contact is independent of orders and rejects foreign origins; honeypot sends nothing',async t=>{
  const sent=[];
  const url=await serve(t,{env:{PUBLIC_BASE_URL:'https://daily.example'},apiOptions:{contactEmail:{send:async data=>{sent.push(data);return {sent:true};}}}});
  const post=(body,origin='https://daily.example')=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
  assert.equal((await post(valid,'https://other.example')).status,403);
  assert.equal((await post({...valid,website:'bot'})).status,200);assert.equal(sent.length,0);
  assert.equal((await post({...valid,email:'invalid'})).status,400);assert.equal(sent.length,0);
  const response=await post({...valid,to:'attacker@example.com'});assert.equal(response.status,200);assert.deepEqual(await response.json(),{sent:true});assert.deepEqual(sent,[valid]);
});

test('contact rate limit bounds email attempts',async t=>{
  let count=0;
  const url=await serve(t,{env:{},apiOptions:{contactEmail:{send:async()=>{count++;return {sent:true};}}}});
  for(let i=0;i<6;i++){
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid)});
    assert.equal(response.status,i<5?200:429);
  }
  assert.equal(count,5);
});
