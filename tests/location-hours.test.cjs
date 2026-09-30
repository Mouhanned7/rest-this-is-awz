const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openingHours}=require('../lib/opening-hours.cjs');
const {reverseAddress}=require('../lib/geocoding.cjs');
const {detect}=require('../js/daily-location.js');
const {OrderService}=require('../lib/order-service.cjs');
const {catalog}=require('../lib/order-validation.cjs');

test('Paris opening hours are 11:00 inclusive to 13:00 exclusive, in winter and summer',()=>{
  for(const [iso,open] of [
    ['2026-09-25T08:59:59Z',false],['2026-09-25T09:00:00Z',true],
    ['2026-09-25T10:59:59Z',true],['2026-09-25T11:00:00Z',false],
    ['2026-09-25T22:30:00Z',false],['2026-09-25T23:00:00Z',false],
    ['2026-01-25T09:59:59Z',false],['2026-01-25T10:00:00Z',true],
    ['2026-01-25T11:59:59Z',true],['2026-01-25T12:00:00Z',false],
    ['2026-03-29T09:00:00Z',true],['2026-03-29T11:00:00Z',false],
    ['2026-10-25T10:00:00Z',true],['2026-10-25T12:00:00Z',false],
  ])assert.equal(openingHours(new Date(iso)).open,open,iso);
});
test('closed restaurant rejects orders and existing checkout without calling Stripe',async()=>{
  let writes=0,calls=0,now=new Date('2026-09-25T23:00:00Z');
  const service=new OrderService({store:{create:async()=>writes++},stripe:{checkout:{sessions:{create:async()=>calls++,retrieve:async()=>calls++}}},now:()=>now});
  await assert.rejects(service.create({},'a'.repeat(64)),/restaurant est fermé/);
  service.authorized=async()=>({id:'a'.repeat(28),paymentStatus:'pending',paymentMethod:'online',stripeSessionId:'cs_existing'});
  await assert.rejects(service.checkout('id','token'),/restaurant est fermé/);
  assert.equal(writes,0);assert.equal(calls,0);
});
test('GPS failure retries with network location while denial does not retry',async()=>{
  const options=[];let retried=false;
  const result=await detect({geolocation:{getCurrentPosition(ok,fail,opt){options.push(opt);options.length===1?fail({code:3}):ok({coords:{latitude:47.8,longitude:3.57,accuracy:45}});}},onRetry:()=>retried=true});
  assert.equal(retried,true);assert.equal(result.latitude,47.8);assert.equal(options[0].enableHighAccuracy,true);assert.equal(options[1].enableHighAccuracy,false);
  let calls=0;await assert.rejects(detect({geolocation:{getCurrentPosition(ok,fail){calls++;fail({code:1});}}}),/réglages du site/);assert.equal(calls,1);
});
test('GPS rejects insecure contexts, unavailable browsers and invalid coordinates',async()=>{
  await assert.rejects(detect({secure:false}),/HTTPS/);await assert.rejects(detect({}),/indisponible/);
  await assert.rejects(detect({geolocation:{getCurrentPosition(ok){ok({coords:{latitude:200,longitude:0,accuracy:5}});}}}),/non exploitable/);
});
test('French reverse geocoding works without Google key and falls back when Google fails',async()=>{
  const urls=[];
  const fetcher=async url=>{urls.push(url);return {ok:true,json:async()=>url.hostname==='maps.googleapis.com'?{status:'REQUEST_DENIED'}:{features:[{properties:{label:'Rue de test, Auxerre'},geometry:{coordinates:[3.57,47.8]}}]}};};
  const first=await reverseAddress(47.8,3.57,{env:{},fetcher});assert.equal(first.address,'Rue de test, Auxerre');assert.equal(urls[0].hostname,'data.geopf.fr');
  urls.length=0;const fallback=await reverseAddress(47.8,3.57,{env:{GOOGLE_MAPS_SERVER_API_KEY:'unit-only'},fetcher});assert.equal(fallback.address,first.address);assert.equal(urls.length,2);
});
test('reverse geocoding never invents an address abroad or when the service fails',async()=>{
  let calls=0;const fetcher=async()=>{calls++;throw new Error('offline');};
  assert.equal((await reverseAddress(36.8,10.2,{env:{},fetcher})).address,null);assert.equal(calls,0);
  assert.equal((await reverseAddress(47.8,3.57,{env:{},fetcher})).address,null);
  const distant=await reverseAddress(47.8,3.57,{env:{},fetcher:async()=>({ok:true,json:async()=>({features:[{properties:{label:'Wrong town'},geometry:{coordinates:[2.35,48.85]}}]})})});assert.equal(distant.address,null);
});
