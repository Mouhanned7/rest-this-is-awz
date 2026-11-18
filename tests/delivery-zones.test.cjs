const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const pricing=require('../js/daily-pricing.js');
const {validateOrder,catalog}=require('../lib/order-validation.cjs');
const pizza=[...catalog.values()].find(p=>p.name==='Regina'&&p.category==='pizzas'); // Méga = 23 €
const order=({zone,address,quantity=1,size='2'})=>({requestId:crypto.randomUUID(),mode:'delivery',paymentMethod:'online',
  items:[{productId:pizza.id,quantity,choices:{size}}],customer:{name:'Test',email:'test@example.com',phone:'0612345678',address,zone}});

test('les 21 communes et leurs minimums sont ceux du restaurant',()=>{
  const m=Object.fromEntries(pricing.deliveryZones.map(z=>[z.name,z.minimum]));
  assert.deepEqual(m,{'Auxerre':18,'Saint-Georges-sur-Baulche':20,'Villefargeau':25,'Vallan':25,'Chevannes':30,'Augy':30,'Perrigny':30,
    'Champs-sur-Yonne':35,'Venoy':35,'Quenne':35,"Gy-l'Évêque":35,'Appoigny':38,'Les Chaudins':42.5,'Escolives-Sainte-Camille':45,
    'Vincelles':45,'Escamps':45,'Chitry':50,'Migé':50,'Lindry':50,'Chemilly-sur-Yonne':55,'Seignelay':60});
});

test('détection automatique de la commune dans l\'adresse',()=>{
  const d=a=>pricing.detectDeliveryZone(a)?.name||null;
  assert.equal(d('12 rue de Paris, 89000 Auxerre'),'Auxerre');
  assert.equal(d("3 route d'Auxerre, 89240 Chevannes"),'Chevannes');      // la ville après la rue gagne
  assert.equal(d('12 rue de Chevannes, 89000 AUXERRE'),'Auxerre');
  assert.equal(d('5 rue des Vignes 89580 Mige'),'Migé');                  // sans accent
  assert.equal(d('10 Grande Rue, Escolives Ste Camille'),'Escolives-Sainte-Camille');
  assert.equal(d('1 rue A, St Georges sur Baulche'),'Saint-Georges-sur-Baulche');
  assert.equal(d('2 rue B, 89380'),'Appoigny');                           // code postal propre à une commune
  assert.equal(d('4 rue C, 89000'),null);                                 // 89000 : Auxerre, Perrigny ou Saint-Georges
  assert.equal(d('8 rue D, 89240'),null);                                 // plusieurs communes en 89240
  assert.equal(d('1 rue E, 21000 Dijon'),null);
});

test('le serveur applique le minimum de la commune',()=>{
  assert.equal(validateOrder(order({zone:'auxerre',address:'12 rue de Paris, 89000 Auxerre'})).customer.deliveryZone.name,'Auxerre');
  assert.throws(()=>validateOrder(order({zone:'seignelay',address:'8 rue D, 89250 Seignelay'})),/minimum de livraison pour Seignelay est de 60,00/);
  assert.equal(validateOrder(order({zone:'seignelay',address:'8 rue D, 89250 Seignelay',quantity:4})).customer.deliveryZone.minimum,60);
  assert.throws(()=>validateOrder(order({zone:'les-chaudins',address:'rue X, Les Chaudins'})),/42,50/);
});

test('choisir Auxerre avec une adresse à Migé ne baisse pas le minimum',()=>{
  assert.throws(()=>validateOrder(order({zone:'auxerre',address:'5 rue des Vignes, 89580 Migé'})),/Migé est de 50,00/);
});

test('commune inconnue ou absente : la commande est refusée avec un message clair',()=>{
  assert.throws(()=>validateOrder(order({zone:'dijon',address:'1 rue E, 21000 Dijon'})),/Commune de livraison inconnue/);
  assert.throws(()=>validateOrder(order({zone:'',address:'1 rue E, 21000 Dijon'})),/Choisissez votre commune/);
});

test('sans commune écrite dans l\'adresse, elle est ajoutée pour le livreur',()=>{
  const o=validateOrder(order({zone:'perrigny',address:'4 rue C',quantity:2}));
  assert.equal(o.customer.address,'4 rue C, 89000 Perrigny');
  assert.equal(validateOrder(order({zone:'auxerre',address:'12 rue de Paris, 89000 Auxerre'})).customer.address,'12 rue de Paris, 89000 Auxerre');
});

test('à emporter : aucun minimum ni commune',()=>{
  const o=validateOrder({...order({}),mode:'pickup',items:[{productId:pizza.id,quantity:1,choices:{size:'0'}}]});
  assert.equal(o.customer.deliveryZone,null);
});
