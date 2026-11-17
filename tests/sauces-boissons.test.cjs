const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pricing=require('../js/daily-pricing.js');
const {quoteItem,catalog}=require('../lib/order-validation.cjs');
const find=name=>[...catalog.values()].find(p=>p.name===name);
const SAUCES=['Ketchup','Mayonnaise','Barbecue','Samouraï','Blanche','Big burger','Algérienne','Harissa','Andalouse','Curry','Moutarde','Chili thaï','Cheezy','Fromagère','Poivre'];

test('la liste des sauces est celle du client',()=>assert.deepEqual(pricing.sauceOptions,SAUCES));

test('sauces + crudités : burgers, menus burger, sandwichs, assiettes, menu enfant burger',()=>{
  for(const p of [...catalog.values()].filter(p=>['burgers','menus-burger','sandwichs','assiettes'].includes(p.category)).concat(find('Menu Enfant Cheese Burger'))){
    assert.deepEqual(pricing.customizationGroups(p).map(g=>g[0]),['sauces','vegetables'],p.name);
  }
});

test('sauces seulement : chicken, paninis, tacos, menus enfant tenders et nuggets',()=>{
  for(const p of [...catalog.values()].filter(p=>['chicken','paninis','tacos'].includes(p.category)).concat(find('Menu Enfant Nuggets'),find('Menu Enfant Tenders'))){
    assert.deepEqual(pricing.customizationGroups(p).map(g=>g[0]),['sauces'],p.name);
  }
  for(const name of ['Marguerita','Bucket A','Brownie','Coca-Cola'])assert.deepEqual(pricing.customizationGroups(find(name)),[],name);
});

test('le serveur valide les sauces (max 2) et les crudités (max 3), sans doublon',()=>{
  const burger=find('Double Cheese');
  const ok=quoteItem({productId:burger.id,quantity:1,choices:{drink:'Fanta',sauces:['Ketchup','Harissa'],vegetables:['Salade','Tomate','Oignon']}});
  assert.match(ok.options,/Sauces : Ketchup, Harissa/);assert.match(ok.options,/Crudités : Salade, Tomate, Oignon/);
  assert.equal(quoteItem({productId:burger.id,quantity:1,choices:{drink:'Fanta'}}).options.includes('Sauces : Aucune'),true);
  for(const bad of [{sauces:['Ketchup','Harissa','Curry']},{sauces:['Ketchup','Ketchup']},{sauces:['Sauce inconnue']},{sauces:'Ketchup'},{vegetables:['Salade','Tomate','Oignon','Salade']}])
    assert.throws(()=>quoteItem({productId:burger.id,quantity:1,choices:{drink:'Fanta',...bad}}),/invalide/);
  const chicken=find('Tenders');
  assert.throws(()=>quoteItem({productId:chicken.id,quantity:1,choices:{size:'0',drink:'Fanta',vegetables:['Salade']}}),/Option inconnue/);
});

test('Oasis : supplément de 2,50 € sauf dans les formules concernées ; menus et buckets choisissent leur boisson',()=>{
  const menuDaily=find('Menu Daily');
  const base={pizza1:'Reine',pizza2:'Regina'};
  const plain=quoteItem({productId:menuDaily.id,quantity:1,choices:{...base,drink1:'Coca-Cola',drink2:'Fanta'}});
  const oasis=quoteItem({productId:menuDaily.id,quantity:1,choices:{...base,drink1:'Oasis',drink2:'Oasis Pomme Cassis Framboise'}});
  assert.equal(oasis.price,plain.price+5);
  assert.throws(()=>quoteItem({productId:menuDaily.id,quantity:1,choices:{...base,drink1:'Coca-Cola'}}),/Boisson 2/);
  const bucket=find('Bucket A');
  assert.equal(quoteItem({productId:bucket.id,quantity:1,choices:{drink:'Coca-Cola 1,5 L'}}).price,bucket.price);
  assert.equal(quoteItem({productId:bucket.id,quantity:1,choices:{drink:'Oasis 2 L'}}).price,bucket.price+2.5);
  assert.throws(()=>quoteItem({productId:bucket.id,quantity:1,choices:{drink:'Coca-Cola'}}),/Boisson/);
  const burger=find('Double Cheese');
  assert.equal(quoteItem({productId:burger.id,quantity:1,choices:{drink:'Oasis'}}).price,burger.price);
});

test('chaque boisson a une vraie photo et Minute Maid n\'est plus proposé',()=>{
  const drinks=[...catalog.values()].filter(p=>p.category==='boissons');
  for(const d of drinks){assert.match(d.image,/^images\/daily\/drinks\/.+\.jpg$/);assert.ok(fs.existsSync(path.join(__dirname,'..',d.image)),d.image);}
  assert.equal(drinks.some(d=>d.name==='Minute Maid'),false);
  assert.equal(drinks.length,21);
});
