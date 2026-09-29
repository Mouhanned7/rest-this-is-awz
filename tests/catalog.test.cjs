const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {totals} = require('../js/daily-pricing.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync('js/daily-menu.js','utf8'),context);
const products = context.window.DAILY_MENU;
const item = (price,quantity=1,promo=true) => ({price,quantity,promo});

test('all 122 flyer products have unique IDs, real image files and valid prices',()=>{
  assert.equal(products.length,122);
  assert.equal(new Set(products.map(p=>p.id)).size,products.length);
  for(const p of products){
    assert.ok(fs.existsSync(p.image),`${p.name}: image missing`);
    assert.ok(p.price>0&&Number.isFinite(p.price));
    for(const size of p.sizes||[])assert.ok(size.price>0&&Number.isFinite(size.price));
  }
});
test('flyer pizza prices and promotional exclusions are retained',()=>{
  const pizzas=products.filter(p=>p.category==='pizzas');
  assert.equal(pizzas.length,35);
  const margherita=pizzas.find(p=>p.name==='Marguerita');
  assert.equal(JSON.stringify(margherita.sizes.map(s=>s.price)),JSON.stringify([8.5,11.5,15.5]));
  assert.equal(margherita.promo,false);
  assert.equal(JSON.stringify(pizzas.find(p=>p.name==='Norvégienne').sizes.map(s=>s.price)),JSON.stringify([10.5,18.9,24]));
});
test('pickup promotion discounts the cheapest eligible pizza',()=>{
  assert.deepEqual(totals([item(23),item(17.9),item(8.5,1,false)],'pickup'),{subtotal:49.4,discount:17.9,total:31.5,label:'À emporter : 2e pizza offerte'});
});
test('delivery two-pizza offer and three-pizza offer do not stack',()=>{
  assert.equal(totals([item(17.9,2)],'delivery').total,26.85);
  const result=totals([item(17.9,3)],'delivery');
  assert.equal(result.discount,17.9);
  assert.equal(result.total,35.8);
  assert.equal(result.label,'Livraison : 3e pizza offerte');
});
test('single pizzas, Junior pizzas, menus and burgers receive no pizza offer',()=>{
  assert.equal(totals([item(17.9)],'pickup').discount,0);
  assert.equal(totals([item(9,2,false),item(20,1,false),item(7.5,2,false)],'pickup').discount,0);
});
test('quantities participate in the offer and cent values remain exact',()=>{
  assert.equal(totals([item(17.9,4)],'pickup').total,35.8);
  assert.equal(totals([item(25.99,3,false)],'delivery').total,77.97);
  assert.equal(totals([],'pickup').total,0);
});
