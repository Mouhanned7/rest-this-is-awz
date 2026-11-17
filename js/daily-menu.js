/* Carte transcrite des deux flyers Daily Chicken Pizza fournis par le client.
   Prix en euros. Les photos d'ambiance sont des suggestions de présentation. */
(() => {
  const products = [];
  const add = (category, name, price, description, image, extra = {}) => {
    products.push({ id: `daily-${products.length + 1}`, category, name, price, description, image, ...extra });
  };
  const pizzaRows = [
    ['Marguerita', 'Tomate, mozzarella, origan.', 'images/daily/optimized/1-a016e3.webp', [8.5,11.5,15.5]],
    ['Végétarienne', 'Tomate, mozzarella, poivrons, champignons, tomates fraîches, olives.', 'images/daily/optimized/9-6481c9.webp'],
    ['Regina', 'Tomate, mozzarella, chorizo, champignons, olives.', 'images/daily/optimized/3-jmbon-pizza-3d7102.webp'],
    ['4 Fromages', 'Tomate, mozzarella, chèvre, brie, grana padano.', 'images/daily/optimized/7-50d04f.webp'],
    ['Reine', 'Tomate, mozzarella, jambon, champignons.', 'images/daily/optimized/pizza-napolitaine-a8e88a.webp'],
    ['Mexicaine', 'Tomate, mozzarella, pepperoni, merguez, poivrons, olives.', 'images/daily/optimized/mexicaine-pizza-5d91b9.webp'],
    ['Calzone', 'Tomate, mozzarella, œuf. Au choix : jambon, thon ou viande hachée.', 'images/daily/optimized/3-bea903.webp', null, 'calzone'],
    ['Pêcheur', 'Tomate, mozzarella, thon, poivrons, œuf, olives.', 'images/daily/optimized/pizza-neptune-c94a6c.webp'],
    ['Campione', 'Tomate, mozzarella, viande hachée, champignons, œuf.', 'images/daily/optimized/campion-pizza-011348.webp'],
    ['Spicy', 'Tomate, mozzarella, pepperoni, poulet rôti, poivrons, piments, sauce chili thaï.', 'images/daily/optimized/texas-pizza-082083.webp'],
    ['Paysanne', 'Tomate, mozzarella, lardons, œuf.', 'images/daily/optimized/7-50d04f.webp'],
    ['Royale', 'Tomate, mozzarella, viande hachée, merguez, œuf.', 'images/daily/optimized/8-ac5b05.webp'],
    ['Moussaka', 'Tomate, mozzarella, viande hachée, aubergines, tomates fraîches, champignons, olives.', 'images/daily/optimized/9-6481c9.webp'],
    ['Bolognaise', 'Tomate, mozzarella, viande hachée, pommes de terre, oignons.', 'images/daily/optimized/10-a06b6e.webp'],
    ['4 Jambons', 'Tomate, mozzarella, jambon, pepperoni, chorizo, lardons.', 'images/daily/optimized/3-jmbon-pizza-3d7102.webp'],
    ['Hawaïenne', 'Tomate, mozzarella, jambon, ananas.', 'images/daily/optimized/hawai-pizza-4b1914.webp'],
    ['4 Saisons', 'Tomate, mozzarella, jambon, poivrons, champignons, artichauts, olives.', 'images/daily/optimized/11-76c7fe.webp'],
    ['Fruits de mer', 'Tomate, mozzarella, cocktail de fruits de mer, ail, persil.', 'images/daily/optimized/666-ab2ddf.webp'],
    ['Orientale', 'Tomate, mozzarella, merguez, champignons, poivrons, œuf, olives.', 'images/daily/optimized/13-0c5c58.webp'],
    ['Gourmande', 'Tomate, mozzarella, merguez, jambon, viande hachée, cheddar.', 'images/daily/optimized/14-e442c9.webp'],
    ['Raclette', 'Tomate, mozzarella, jambon, raclette, pommes de terre.', 'images/daily/optimized/15-48a525.webp'],
    ['Cheese Burger', 'Tomate, mozzarella, viande hachée, cheddar, cornichons.', 'images/daily/optimized/16-5e115a.webp'],
    ['Buffalo', 'Sauce barbecue, mozzarella, viande hachée, poivrons, oignons.', 'images/daily/optimized/texas-pizza-082083.webp'],
    ['Savoyarde', 'Crème fraîche, mozzarella, jambon, oignons, pommes de terre.', 'images/daily/optimized/17-3635f5.webp'],
    ['Indienne', 'Crème fraîche, mozzarella, sauce curry, tikka, oignons, pommes de terre.', 'images/daily/optimized/18-f45347.webp'],
    ['5 Fromages', 'Crème fraîche, mozzarella, chèvre, brie, bleu, grana padano.', 'images/daily/optimized/6-44f5f4.webp'],
    ['Tartiflette', 'Crème fraîche, mozzarella, tartiflette, lardons, oignons, pommes de terre.', 'images/daily/optimized/12-4f82c6.webp'],
    ['Américaine', 'Crème fraîche, mozzarella, poulet fumé, pommes de terre.', 'images/daily/optimized/chiken-pizza-9c7d51.webp'],
    ['Chèvre miel', 'Crème fraîche, mozzarella, jambon, chèvre, miel.', 'images/daily/optimized/caramello-pizza-73b348.webp'],
    ['Milano', 'Crème fraîche, mozzarella, lardons, pommes de terre, œuf.', 'images/daily/optimized/milano-pizza-9cf510.webp'],
    ['Chicago', 'Crème fraîche, mozzarella, viande hachée, bacon, cheddar.', 'images/daily/optimized/777-0fe29f.webp'],
    ['Chèvre', 'Crème fraîche, mozzarella, chèvre, grana padano, olives.', 'images/daily/optimized/7-50d04f.webp'],
    ['Chicken', 'Crème fraîche, mozzarella, poulet fumé, tikka, pommes de terre.', 'images/daily/optimized/chiken-pizza-9c7d51.webp'],
    ['Western', 'Crème fraîche, mozzarella, tikka, poivrons, champignons.', 'images/daily/optimized/pizza-fermiere-8ab090.webp'],
    ['Norvégienne', 'Crème fraîche, mozzarella, saumon fumé.', 'images/daily/optimized/norvegienne-pizza-b5aedc.webp', [10.5,18.9,24]]
  ];
  pizzaRows.forEach(([name, description, image, prices, choice]) => add('pizzas', name, (prices || [9,17.9,23])[0], description, image, {
    sizes: ['Junior','Senior','Méga'].map((name,i) => ({name,price:(prices || [9,17.9,23])[i]})),
    base: description.startsWith('Crème') ? 'Crème fraîche' : description.startsWith('Sauce') ? 'Barbecue' : 'Tomate',
    choice, promo: name !== 'Marguerita', badge: name === 'Marguerita' ? 'Le grand classique' : name === 'Chicken' ? 'Team chicken' : ''
  }));
  [
    ['Cheese Burger',6.5,'1 steak, fromage.','images/daily/optimized/f2-6e2217.webp'],
    ['Double Cheese',7.5,'2 steaks, 2 fromages.','images/daily/optimized/b1-1a932d.webp'],
    ['Steak Chèvre',7,'Steak, chèvre, miel, moutarde.','images/daily/optimized/chti-burguer-9a3bf4.webp'],
    ['Chicken Burger',6.5,'Poulet pané.','images/daily/optimized/b3-2b32f9.webp'],
    ['Mega Burger',11.5,'2 steaks 180 g, œuf, bacon, fromage.','images/daily/optimized/bigy-burguer-cba3b6.webp'],
    ['Tower Burger',9,'1 steak 100 g, poulet, fromage.','images/daily/optimized/burger-tenders-d2cb54.webp'],
    ['Giant Burger',9,'Pain viennois, 2 steaks 100 g, œuf, fromage.','images/daily/optimized/b6-830448.webp'],
    ['Maxi Chicken',8,'Poulet pané, galette de pommes de terre, fromage.','images/daily/optimized/b3-2b32f9.webp'],
    ['Le Big',9,'1 steak 180 g, fromage.','images/daily/optimized/burger-96416c.webp'],
    ['Triple Cheese Bacon',9.5,'3 steaks, bacon, fromage.','images/daily/optimized/b1-1a932d.webp'],
    ['Hummer 2',9,'3 steaks, fromage, pain toasté.','images/daily/optimized/b9-258d5b.webp'],
    ['Hummer 3',10,'4 steaks, fromage, pain toasté.','images/daily/optimized/b10-8882b4.webp'],
    ['Twin Cheese',9.5,'2 Cheese Burgers.','images/daily/optimized/double-burger-d75259.webp'],
    ['Twin Mix',9.5,'1 Cheese Burger et 1 Chicken Burger.','images/daily/optimized/double-burger-d75259.webp'],
    ['Twin Chicken',9.5,'2 Chicken Burgers.','images/daily/optimized/b3-2b32f9.webp']
  ].forEach(([n,p,d,i]) => add('burgers',n,p,d,i,{meal:true,badge:n==='Double Cheese'?'Double plaisir':''}));
  [
    ['Tenders','Blanc de poulet croustillant.','images/daily/optimized/chicken-0a6487.webp',[[4,7],[6,8],[8,9]]],
    ['Nuggets','Bouchées de poulet pané.','images/daily/optimized/n1-3cacc8.webp',[[6,6.5],[9,7.5],[12,8.5]]],
    ['Wings','Ailes de poulet épicées.','images/daily/optimized/chicken-wings-5f260c.webp',[[6,8],[9,9],[12,10]]],
    ['Pilons','Cuisses de poulet croustillantes.','images/daily/optimized/chicken-0a6487.webp',[[3,8],[4,9],[5,10.5]]]
  ].forEach(([n,d,i,s]) => add('chicken',n,s[0][1],d,i,{meal:true,sizes:s.map(([count,price])=>({name:`${count} pièces`,price})),badge:n==='Tenders'?'Croustillant':''}));
  add('tacos','Le Tacos',9,'Frites et sauce fromagère maison. Composez votre tacos avec vos viandes préférées.','images/daily/optimized/t2-e01d5f.webp',{choice:'tacos',meal:true,sizes:[{name:'M · 1 viande',price:9,meats:1},{name:'L · 2 viandes',price:10,meats:2},{name:'XL · 3 viandes',price:12.5,meats:3},{name:'Maxi · 4 viandes',price:14,meats:4}],badge:'À composer'});
  [
    ['Chicken Curry',8.5,'Poulet curry.','images/daily/optimized/sandwich-chicken-tikka-b1c92b.webp'],
    ['Kebab',8.5,'Émincé de kebab.','images/daily/optimized/sandwich-kebab-4e499f.webp'],
    ['Naan Tenders',9.5,'Tenders, fromage.','images/daily/optimized/sandwich-radical-a9f9a5.webp'],
    ['Nevada',9.5,'Escalope, galette de pommes de terre, fromage.','images/daily/optimized/sandwich-mixte-5fa22a.webp'],
    ['Chicken Paprika',8.5,'Poulet paprika, poivrons, olives.','images/daily/optimized/sandwich-mexicanos-6dd0ae.webp'],
    ['Wrap Tenders',9.5,'Tenders, fromage.','images/daily/optimized/t1-33e974.webp'],
    ['Américain',9.5,'4 steaks, œuf, fromage.','images/daily/optimized/sandwich-americain-dae623.webp'],
    ['Billy Joe',9.5,'2 steaks, bacon, œuf, fromage.','images/daily/optimized/sandwich-americain-dae623.webp'],
    ['Escalope Boursin',9.5,'Escalope, sauce Boursin.','images/daily/optimized/sandwich-chicken-tikka-b1c92b.webp'],
    ['Radical',9.5,'Cordon bleu, 1 viande au choix, fromage.','images/daily/optimized/sandwich-radical-a9f9a5.webp'],
    ['Daily',9.5,'2 steaks, kebab, œuf, fromage.','images/daily/optimized/sandwich-mixte-5fa22a.webp'],
    ['Escalope du Chef',9.5,'Escalope, crème fraîche, champignons.','images/daily/optimized/sandwich-chicken-tikka-b1c92b.webp']
  ].forEach(([n,p,d,i])=>add('sandwichs',n,p,d,i,{meal:true,choice:n==='Wrap Tenders'?'wrap':'bread',extraMeat:n==='Radical'}));
  [
    ['4 Fromages','Mozzarella, brie, chèvre, grana padano.','images/daily/optimized/panini-4-fromage-6b287a.webp'],
    ['Tonata','Sauce tomate, mozzarella, thon.','images/daily/optimized/pa2-469016.webp'],
    ['Campagnard','Sauce tomate, mozzarella, jambon.','images/daily/optimized/panini-jombon-91e79e.webp'],
    ['Oriental','Sauce tomate, mozzarella, merguez.','images/daily/optimized/pa3-de2b32.webp'],
    ['Kebab','Sauce tomate, mozzarella, kebab.','images/daily/optimized/pa1-e54e3d.webp'],
    ['Fermier','Crème fraîche, mozzarella, poulet.','images/daily/optimized/pa3-de2b32.webp'],
    ['Pacifico','Crème fraîche, mozzarella, saumon fumé.','images/daily/optimized/panini-saumon-1dec40.webp']
  ].forEach(([n,d,i])=>add('paninis',`Panini ${n}`,7,d,i,{meal:true}));
  add('paninis','Panizza',10,'Base sauce tomate ou crème fraîche et 2 ingrédients au choix.','images/daily/optimized/3-bea903.webp',{choice:'panizza'});
  [
    ['Niçoise','Salade verte, tomates, thon, maïs, œuf, olives.','images/daily/optimized/s1-e88a21.webp'],
    ['Printanière','Salade verte, tomates, jambon, emmental, œuf.','images/daily/optimized/s2-42a4cd.webp'],
    ['Norvégienne','Salade verte, tomates, saumon fumé, emmental.','images/daily/optimized/s3-29f893.webp'],
    ['Scandinave','Salade verte, tomates, cocktail de crevettes, avocat, œuf.','images/daily/optimized/salad-1ec885.webp'],
    ['César','Salade verte, tomates cerises, poulet, croûtons, emmental.','images/daily/optimized/s1-e88a21.webp']
  ].forEach(([n,d,i])=>add('salades',`Salade ${n}`,7.5,d,i));
  ['Kebab','Tenders','Chicken','Mixte'].forEach(n=>add('assiettes',`Assiette ${n}`,n==='Mixte'?13:12,'Servie avec salade, tomates, maïs et frites ou potatoes.',n==='Tenders'?'images/daily/optimized/111-68933f.webp':n==='Chicken'?'images/daily/optimized/222-bcd87f.webp':'images/daily/optimized/imaagee-c94656.webp',{choice:'plate'}));
  [
    ['Menu Daily',20,'2 pizzas Junior au choix et 2 boissons 33 cl au choix (Oasis +2,50 € par boisson).','images/daily/optimized/offre-2-pizza-708f70.webp',{pizzaCount:2,pizzaSize:'Junior',drinkCount:2}],
    ['Menu Couple',25.99,'2 pizzas Senior au choix, 4 tenders et 1 boisson grand format au choix (Oasis +2,50 €).','images/daily/optimized/menu-duo-2b776c.webp',{pizzaCount:2,pizzaSize:'Senior',drinkCount:1,drinkSize:'large'}],
    ['Menu Royal',33.99,'2 pizzas Senior au choix, 10 wings et 1 boisson grand format au choix (Oasis +2,50 €).','images/daily/optimized/menu-duo-2b776c.webp',{pizzaCount:2,pizzaSize:'Senior',drinkCount:1,drinkSize:'large'}],
    ['Menu Gourmand',35.99,'2 pizzas Méga au choix, 10 wings et 1 boisson grand format au choix (Oasis +2,50 €).','images/daily/optimized/offre-3-pizza-c36e8e.webp',{pizzaCount:2,pizzaSize:'Méga',drinkCount:1,drinkSize:'large'}],
    ['Bucket A',25,'30 wings, 4 frites et 1 boisson 1,5 L.','images/daily/optimized/bucket-daily-chicken-ad8975.webp',{drinkCount:1,drinkSize:'large'}],
    ['Bucket B',26,'20 tenders, 4 frites et 1 boisson 1,5 L.','images/daily/optimized/bucket-daily-chicken-ad8975.webp',{drinkCount:1,drinkSize:'large'}],
    ['Bucket C',23.5,'10 wings + 10 tenders, 4 frites et 1 boisson 1,5 L.','images/daily/optimized/bucket-daily-chicken-ad8975.webp',{drinkCount:1,drinkSize:'large'}],
    ['Bucket D',24.5,'10 pilons, 4 frites et 1 boisson 1,5 L.','images/daily/optimized/bucket-daily-chicken-ad8975.webp',{drinkCount:1,drinkSize:'large'}],
    ['Bucket E',25,'6 pilons + 6 wings + 6 tenders, 4 frites et 1 boisson 1,5 L.','images/daily/optimized/bucket-daily-chicken-ad8975.webp',{drinkCount:1,drinkSize:'large'}],
    ['Bucket F',32.5,'30 tenders, 4 frites et 1 boisson 1,5 L.','images/daily/optimized/bucket-daily-chicken-ad8975.webp',{drinkCount:1,drinkSize:'large'}],
    ['Bucket G',32.5,'15 tenders + 15 wings, 4 frites et 1 boisson 1,5 L.','images/daily/optimized/bucket-daily-chicken-ad8975.webp',{drinkCount:1,drinkSize:'large'}],
    ['Menu M1',14.5,'2 Double Cheese, frites et 1 boisson 33 cl.','images/daily/optimized/double-burger-d75259.webp',{meal:true}],
    ['Menu M2',14.5,'1 Triple Cheese + 1 Chicken Burger, frites et 1 boisson 33 cl.','images/daily/optimized/double-burger-d75259.webp',{meal:true}],
    ['Menu M3',14.5,'1 Tower + 1 Cheese Burger, frites et 1 boisson 33 cl.','images/daily/optimized/double-burger-d75259.webp',{meal:true}],
    ['Menu M4',14.5,'1 Big + 1 Steak Chèvre, frites et 1 boisson 33 cl.','images/daily/optimized/double-burger-d75259.webp',{meal:true}],
    ['Menu M5',14.5,'1 Giant Burger + 1 Maxi Chicken, frites et 1 boisson 33 cl.','images/daily/optimized/double-burger-d75259.webp',{meal:true}],
    ['Menu M6',16,'1 Mega + 1 Cheese Burger, frites et 1 boisson 33 cl.','images/daily/optimized/double-burger-d75259.webp',{meal:true}],
    ['Menu Enfant Cheese Burger',7,'1 Cheese Burger, frites, 1 boisson et 1 Kinder.','images/daily/optimized/f2-6e2217.webp',{choice:'kid',meal:true}]
  ].forEach(([n,p,d,i,e])=>add(
    n.startsWith('Bucket ')?'buckets':/^Menu M\d$/.test(n)?'menus-burger':n.startsWith('Menu Enfant')?'menus':'menus-pizza',
    n,p,d,i,e));
  [
    ['Mozza Sticks ×7',7.5,'7 bâtonnets de mozzarella panés.','images/daily/optimized/n5-0a1129.webp'],
    ['Onion Rings ×7',5.5,'7 rondelles d’oignon croustillantes.','images/daily/optimized/n3-726977.webp'],
    ['Barquette de viande',5.5,'Une portion de viande.','images/daily/optimized/steak-7c9ae5.webp'],
    ['Barquette de frites maison',3.5,'Une portion de frites maison.','images/daily/optimized/fries-696692.webp'],
    ['Barquette de potatoes',4,'Une portion de quartiers de pommes de terre.','images/daily/optimized/f79-59c1cf.webp']
  ].forEach(([n,p,d,i])=>add('extras',n,p,d,i));
  const sweets={'Brownie':'images/daily/optimized/d3-5fbecb.webp','Tarte':'images/daily/optimized/d2-926f14.webp','Donuts':'images/daily/optimized/donuts-a5a386.webp','Muffin':'images/daily/optimized/muffin-63fd16.webp','Tiramisu':'images/daily/optimized/d1-06d15e.webp'};
  Object.entries(sweets).forEach(([n,image])=>add('desserts',n,3.5,'La petite touche sucrée pour finir. Parfums selon disponibilité.',image));
  ['Häagen-Dazs','Ben & Jerry’s'].forEach(n=>add('desserts',n,4,'Glace en pot. Demandez les parfums disponibles.',n==='Häagen-Dazs'?'images/daily/optimized/d4-5b9590.webp':'images/daily/optimized/icecream-617a0e.webp',{sizes:[{name:'100 ml',price:4},{name:'500 ml',price:8}]}));
  const drinks=[['Coca-Cola','coca-cola-hd',0],['Coca-Cola Light','light',0],['Fanta','fanta-orange-hd',0],['Eau minérale','eau-cristaline-hd',0]];
  drinks.forEach(([n,image,imageRotation])=>add('boissons',n,n==='Eau minérale'?1.5:2,n==='Eau minérale'?'Eau plate · 50 cl.':'Canette · 33 cl.',`images/daily/drinks/${image}.jpg`,{imageRotation}));
  // Minute Maid retiré de la carte : on garde son emplacement pour que les identifiants suivants ne bougent pas.
  products.push({id:`daily-${products.length+1}`,removed:true});
  [['Maxi Coca-Cola',3.5,'1,5 L','maxi-coca-hd'],['Maxi Fanta',3.5,'1,5 L','maxi-fanta-hd'],['Maxi Oasis',4,'Tropical · 2 L','restaurant-oasis-large']].forEach(([n,p,d,image])=>add('boissons',n,p,d,`images/daily/drinks/${image}.jpg`));
  // Menu enfant : trois produits au lieu d'un seul avec choix du type. Les deux derniers sont ajoutés
  // en fin de liste pour ne décaler aucun identifiant de produit existant (paniers en cours).
  [
    ['Menu Enfant Nuggets',7,'4 nuggets, frites, 1 boisson et 1 Kinder.','images/daily/optimized/n1-3cacc8.webp'],
    ['Menu Enfant Tenders',7,'4 tenders, frites, 1 boisson et 1 Kinder.','images/daily/optimized/chicken-0a6487.webp']
  ].forEach(([n,p,d,i])=>add('menus',n,p,d,i,{choice:'kid',meal:true}));
  // Nouvelles boissons ajoutées en fin de liste : les identifiants existants doivent rester les mêmes.
  [
    ['Lipton Ice Tea Pêche','lipton-peche-hd',0],
    ['Fanta Citron','fanta-citron-hd',0],
    ['DADA Fraise','dada-fraise-hd',0],
    ['Orangina','orangina-hd',0],
    ['DADA Melon','dada-melon-hd',0],
    ['Coca-Cola Cherry','cola-cherry-hd',0],
    ['Coca-Cola Zéro','cola-zero-hd',0],
    ['Oasis Tropical','oasis-tropical-hd',0],
    ['Schweppes Agrumes','schweppes-agrumes-hd',0],
    ['Tropico Orange Ananas','tropico',-90],
    ['Perrier','perrier-hd',0],
    ['Oasis Pomme Cassis Framboise','oasis-pomme-cassis-framboise-hd',0]
  ].forEach(([n,image,imageRotation])=>add('boissons',n,2,'Canette · 33 cl.',`images/daily/drinks/${image}.jpg`,{imageRotation}));
  [['Maxi Fuze Tea Pêche','fuze-tea-large-hd'],['Maxi Orangina','orangina-large']].forEach(([n,image])=>add('boissons',n,3.5,'1,5 L',`images/daily/drinks/${image}.jpg`));
  // Boissons demandées par le client, ajoutées en fin de liste (identifiants existants inchangés).
  [['Sprite','sprite-hd'],['DADA Cherry','dada-cherry-hd'],['Seven Up Cherry','7up-cherry-hd'],['Seven Up Mojito','7up-mojito-hd']]
    .forEach(([n,image])=>add('boissons',n,2,'Canette · 33 cl.',`images/daily/drinks/${image}.jpg`,{imageRotation:0}));
  // Retirés de la carte à la demande du client : on garde l'emplacement pour que les identifiants restent stables.
  products.forEach((p,i)=>{if(p.category==='boissons'&&['Coca-Cola Light','Schweppes Agrumes'].includes(p.name))products[i]={id:p.id,removed:true};});
  window.DAILY_MENU = products.filter(p=>!p.removed);
  window.DAILY_CATEGORIES = [
    ['selection','Nos envies du moment','spark'],['pizzas','Pizzas','pizza'],['menus-pizza','Menus pizza','pizza'],['burgers','Burgers','burger'],['menus-burger','Menus burger','burger'],['chicken','Chicken','chicken'],['buckets','Buckets','chicken'],['tacos','Tacos','wrap'],['sandwichs','Sandwichs','sandwich'],['menus','Menu enfant','heart'],['paninis','Paninis','sandwich'],['salades','Salades','leaf'],['assiettes','Assiettes','plate'],['extras','Petites faims','fries'],['desserts','Desserts','cake'],['boissons','Boissons','cup']
  ];
})();
