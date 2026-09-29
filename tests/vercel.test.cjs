const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const Stripe=require('stripe');
const {createServerlessApp}=require('../lib/serverless.cjs');
const {build}=require('../scripts/build-vercel.cjs');

test('API starts when the host cannot require ESM modules from CommonJS',()=>{
  const {spawnSync}=require('node:child_process');
  const result=spawnSync(process.execPath,['--no-experimental-require-module','-e',"require('./api/index.js')"],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',timeout:20000,windowsHide:true});
  assert.equal(result.status,0,result.stderr);
});

async function serve(t,app){const server=http.createServer(app).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));return `http://127.0.0.1:${server.address().port}`;}
test('serverless entry serves API without exposing private files or starting the preview',async t=>{
  const base=await serve(t,createServerlessApp({env:{}}));
  const config=await(await fetch(base+'/api/public-config')).json();assert.equal(config.orderingEnabled,false);
  for(const route of ['/.env','/lib/firebase.cjs','/.design-backup/html.html','/api/send-email'])assert.equal((await fetch(base+route)).status,404);
});
test('Vercel adapter preserves raw Stripe signatures and Firebase-only readiness',async t=>{
  const secret='whsec_vercel_unit_test';let webhookCalls=0;
  const env={VERCEL:'1',PUBLIC_BASE_URL:'https://daily.example',ONLINE_ORDERING_ENABLED:'true',FIREBASE_PROJECT_ID:'demo-local',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',SMTP_EMAIL:'test@example.com',SMTP_APP_PASSWORD:'unit-password',STRIPE_SECRET_KEY:'sk_test_unit_only',STRIPE_WEBHOOK_SECRET:secret};
  const base=await serve(t,createServerlessApp({env,apiOptions:{service:{webhook:async event=>{assert.equal(event.id,'evt_raw_test');webhookCalls++;}}}}));
  const config=await(await fetch(base+'/api/public-config')).json();assert.equal(config.orderingEnabled,true);assert.equal(config.paymentsEnabled,true);
  const payload='{ "id": "evt_raw_test", "type": "checkout.session.completed", "data": {"object":{}} }';
  for(const [signature,status] of [['invalid',400],[Stripe.webhooks.generateTestHeaderString({payload,secret}),200]]){
    const response=await fetch(base+'/api/stripe/webhook',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':signature},body:payload});assert.equal(response.status,status);
  }
  assert.equal(webhookCalls,1);
});
test('optional retry requires a long secret, waits for one operation and rejects unconfigured services',async t=>{
  let calls=0;
  const env={CRON_SECRET:'a'.repeat(40),FIREBASE_PROJECT_ID:'demo-test',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',SMTP_EMAIL:'test@example.com',SMTP_APP_PASSWORD:'unit-password'};
  const base=await serve(t,createServerlessApp({env,retry:async options=>{assert.equal(options.limit,1);calls++;return {attempted:1,completed:1,pending:0};}}));
  const route=base+'/api/internal/retry-orders';assert.equal((await fetch(route)).status,401);assert.equal((await fetch(route,{headers:{Authorization:'Bearer wrong'}})).status,401);
  const response=await fetch(route,{headers:{Authorization:'Bearer '+env.CRON_SECRET}});assert.equal(response.status,200);assert.equal((await response.json()).completed,1);assert.equal(calls,1);
  const disabled=await serve(t,createServerlessApp({env:{}}));assert.equal((await fetch(disabled+'/api/internal/retry-orders')).status,503);
});
test('Vercel public build contains referenced local assets but no secrets, legacy JS or server sources',()=>{
  const output=build();const files=[];const walk=directory=>{for(const file of fs.readdirSync(directory,{withFileTypes:true})){const full=path.join(directory,file.name);if(file.isDirectory())walk(full);else files.push(path.relative(output,full).replaceAll('\\','/'));}};walk(output);
  for(const forbidden of ['.env','server.js','preview.cjs','package.json','CONFIGURATION.md','lib/firebase.cjs','js/main.js'])assert.equal(files.includes(forbidden),false);
  assert.deepEqual(files.filter(f=>f.startsWith('js/')).sort(),['js/daily-checkout.js','js/daily-location.js','js/daily-menu.js','js/daily-pages.js','js/daily-pricing.js','js/daily.js']);
  for(const page of ['index.html','menu.html','about.html','contact.html']){
    const html=fs.readFileSync(path.join(output,page),'utf8');for(const match of html.matchAll(/(?:src|href)="((?:js|css|images|fonts)\/[^"?#]+)(?:[?#][^"]*)?"/g))assert.ok(fs.existsSync(path.join(output,match[1])),match[1]);
    assert.doesNotMatch(html,/preview-version/);
  }
  const config=JSON.parse(fs.readFileSync(path.join(output,'../vercel.json'),'utf8'));assert.equal(config.outputDirectory,'dist');assert.equal(config.functions['api/index.js'].maxDuration,60);assert.equal(config.crons,undefined);
});
