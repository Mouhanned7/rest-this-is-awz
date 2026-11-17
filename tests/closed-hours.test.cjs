const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pricing=require('../js/daily-pricing.js');
const {openingHours}=require('../lib/opening-hours.cjs');

test('les horaires du site et du serveur sont identiques pour chaque heure (Paris)',()=>{
  for(let hour=0;hour<24;hour++){
    const instant=new Date(Date.UTC(2026,10,17,hour-1,30)); // novembre : Paris = UTC+1
    assert.equal(pricing.isScheduledOpen(instant),openingHours(instant).open,`heure ${hour}`);
  }
  assert.equal(pricing.isScheduledOpen(new Date('2026-11-17T09:59:00Z')),false); // 10h59
  assert.equal(pricing.isScheduledOpen(new Date('2026-11-17T10:00:00Z')),true);  // 11h00
});

test('ouvert de 11h à 1h du matin, fermé de 1h à 11h',()=>{
  const at=(h,m=0)=>new Date(Date.UTC(2026,10,17,h-1,m));
  assert.equal(pricing.isScheduledOpen(at(0,59)),true);
  assert.equal(pricing.isScheduledOpen(at(1,0)),false);
  assert.equal(pricing.isScheduledOpen(at(10,59)),false);
  assert.equal(pricing.isScheduledOpen(at(11,0)),true);
});

test('le bandeau « fermé » du hero existe sur l\'accueil et la carte, masqué par défaut',()=>{
  for(const file of ['index.html','menu.html']){
    const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    assert.match(html,/<p class="hero-closed" data-closed-banner role="status" hidden>[^<]*<strong>Nous sommes fermés/,file);
    assert.match(html,/heures d’ouverture/,file);
  }
});
