const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openingHours}=require('../lib/opening-hours.cjs');
const {reverseAddress}=require('../lib/geocoding.cjs');
const {detect}=require('../js/daily-location.js');
const {OrderService}=require('../lib/order-service.cjs');
const {catalog}=require('../lib/order-validation.cjs');

test('Paris opening hours cover midnight, exact boundaries, winter and summer time',()=>{
  for(const [iso,open] of [
    ['2026-09-24T22:59:59Z',true],['2026-09-24T23:00:00Z',false],
    ['2026-09-25T08:59:59Z',false],['2026-09-25T09:00:00Z',true],
    ['2026-01-24T23:59:59Z',true],['2026-01-25T00:00:00Z',false],
    ['2026-01-25T09:59:59Z',false],['2026-01-25T10:00:00Z',true],
    ['2026-03-29T01:30:00Z',false],['2026-10-25T01:30:00Z',false],
  ])assert.equal(openingHours(new Date(iso)).open,open,iso);
});
test('after-hours flag comes from server clock and is retained when retrying after reopening',async()=>{
  let saved,now=new Date('2026-09-25T00:00:00Z');
  const service=new OrderService({store:{create:async(id,order,secret)=>saved??=( {order,secret} )},now:()=>now});
  const pizza=[...catalog.values()].find(p=>p.name==='Regina'&&p.category==='pizzas');
  const body={requestId:require('node:crypto').randomUUID(),mode:'pickup',paymentMethod:'on_collection',items:[{productId:pizza.id,quantity:1,choices:{size:'1',note:''}}],customer:{name:'Test',email:'client@example.com',phone:'0612345678'},outsideOpeningHours:false};
  const first=await service.create(body,'a'.repeat(64));assert.equal(first.outsideOpeningHours,true);assert.match(first.openingWarning,/réouverture/);
  now=new Date('2026-09-25T12:00:00Z');const retried=await service.create(body,'a'.repeat(64));assert.equal(retried.outsideOpeningHours,true);assert.equal(retried.createdAt,first.createdAt);
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
