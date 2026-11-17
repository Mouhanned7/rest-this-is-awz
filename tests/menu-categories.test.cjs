const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {quoteItem,catalog} = require('../lib/order-validation.cjs');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync('js/daily-menu.js','utf8'),context);
const products = context.window.DAILY_MENU;
const categories = context.window.DAILY_CATEGORIES.map(c=>c[0]);
// Array.from : les tableaux créés dans le contexte isolé de la carte ne sont pas comparables tels quels.
const names = category => Array.from(products.filter(p=>p.category===category).map(p=>p.name));

test('pizza menus, burger menus and buckets have their own categories, placed as requested',()=>{
  assert.deepEqual(names('menus-pizza'),['Menu Daily','Menu Couple','Menu Royal','Menu Gourmand']);
  assert.deepEqual(names('menus-burger'),['Menu M1','Menu M2','Menu M3','Menu M4','Menu M5','Menu M6']);
  assert.deepEqual(names('buckets'),['Bucket A','Bucket B','Bucket C','Bucket D','Bucket E','Bucket F','Bucket G']);
  assert.equal(categories.indexOf('menus-pizza'),categories.indexOf('pizzas')+1);
  assert.equal(categories.indexOf('menus-burger'),categories.indexOf('burgers')+1);
  for(const p of products)assert.ok(categories.includes(p.category),`${p.name}: unknown category ${p.category}`);
});
test('only the three kids menus remain in the kids category and the fries portion is homemade',()=>{
  assert.deepEqual(names('menus'),['Menu Enfant Cheese Burger','Menu Enfant Nuggets','Menu Enfant Tenders']);
  assert.ok(products.some(p=>p.name==='Barquette de frites maison'));
  assert.ok(!products.some(p=>p.name==='Barquette de frites'));
});
test('existing product identifiers did not move when categories changed',()=>{
  const id = name => products.find(p=>p.name===name).id;
  assert.equal(id('Menu Daily'),'daily-85');assert.equal(id('Bucket A'),'daily-89');assert.equal(id('Menu M1'),'daily-96');
  assert.equal(id('Menu Enfant Cheese Burger'),'daily-102');assert.equal(id('Barquette de frites maison'),'daily-106');
});
test('kids menus ask only for a drink: no type choice and no fries option',()=>{
  for(const name of ['Menu Enfant Cheese Burger','Menu Enfant Nuggets','Menu Enfant Tenders']){
    const kid=[...catalog.values()].find(p=>p.name===name);
    assert.equal(quoteItem({productId:kid.id,quantity:1,choices:{drink:'Fanta'}}).price,7);
    assert.throws(()=>quoteItem({productId:kid.id,quantity:1,choices:{drink:'Fanta',noFries:'on'}}),/Option inconnue/);
    assert.throws(()=>quoteItem({productId:kid.id,quantity:1,choices:{drink:'Fanta',kids:'4 Nuggets'}}),/Option inconnue/);
    assert.throws(()=>quoteItem({productId:kid.id,quantity:1,choices:{}}));
  }
});
