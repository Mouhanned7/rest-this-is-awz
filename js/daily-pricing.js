/* Shared promotion rules: used by the cart and server-side order validation. */
(function(root, factory) {
  const pricing = factory();
  if (typeof module === 'object' && module.exports) module.exports = pricing;
  else root.DailyPricing = pricing;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  // One source for included drinks and their surcharges in the browser and API.
  function drinkSlots(product) {
    const count = product.drinkCount || (product.meal ? 1 : 0);
    return Array.from({length:count}, (_,i) => count === 1 ? 'drink' : `drink${i+1}`);
  }
  function drinkOptions(product) {
    return product.drinkSize === 'large'
      ? ['Coca-Cola 1,5 L','Fanta 1,5 L','Fuze Tea Pêche 1,5 L','Orangina 1,5 L','Oasis 2 L']
      : ['Coca-Cola','Coca-Cola Zéro','Coca-Cola Cherry','Sprite','Seven Up Cherry','Seven Up Mojito','Fanta','Fanta Citron','Lipton Ice Tea Pêche','Orangina','DADA Fraise','DADA Melon','DADA Cherry','Schweppes Agrumes','Tropico Orange Ananas','Perrier','Eau minérale','Oasis Pomme Cassis Framboise','Oasis'];
  }
  const drinkSupplement = (value,product) => /^Oasis(?: |$)/.test(value) && !(product?.drinkSize !== 'large' && ['tacos','sandwichs','burgers','chicken'].includes(product?.category)) ? 250 : 0;
  const drinkLabel = (value,product) => `${value === 'Oasis' ? 'Oasis Tropical' : value} · ${drinkSupplement(value,product) ? '+2,50 €' : 'Inclus'}`;
  function refreshIncludedDrinks(item,product) {
    if(!product || !item.choices || typeof item.options !== 'string')return item;
    let options=item.options,removed=0;
    for(const key of drinkSlots(product)){
      const value=item.choices[key];
      if(!/^Oasis(?: |$)/.test(value)||drinkSupplement(value,product))continue;
      const label=`Boisson${key.slice(5)?' '+key.slice(5):''} : ${value}`;
      const parts=options.split(' · '),noteIndex=parts.findIndex(part=>part.startsWith('Note : '));
      const index=parts.findIndex((part,i)=>(noteIndex<0||i<noteIndex)&&part===`${label} (+2,50 €)`);
      if(index>=0){parts[index]=label;options=parts.join(' · ');removed+=250;}
    }
    return removed?{...item,price:(Math.round(item.price*100)-removed)/100,options,key:JSON.stringify([item.productId,options])}:item;
  }
  // Horaires d'ouverture : tous les jours de 11h à 1h du matin, heure de Paris (même règle que le serveur).
  const parisHour = (now = new Date()) => Number(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).find(part => part.type === 'hour').value);
  const isScheduledOpen = (now = new Date()) => { const hour = parisHour(now); return hour >= 11 || hour < 1; };
  // Communes livrées et minimum de commande (après remises). Auxerre : 18 €.
  const deliveryZones = [
    ['auxerre','Auxerre','89000',18],
    ['saint-georges-sur-baulche','Saint-Georges-sur-Baulche','89000',20],
    ['villefargeau','Villefargeau','89240',25],
    ['vallan','Vallan','89580',25],
    ['chevannes','Chevannes','89240',30],
    ['augy','Augy','89290',30],
    ['perrigny','Perrigny','89000',30],
    ['champs-sur-yonne','Champs-sur-Yonne','89290',35],
    ['venoy','Venoy','89290',35],
    ['quenne','Quenne','89290',35],
    ['gy-l-eveque',"Gy-l'Évêque",'89580',35],
    ['appoigny','Appoigny','89380',38],
    ['les-chaudins','Les Chaudins','89580',42.5],
    ['escolives-sainte-camille','Escolives-Sainte-Camille','89290',45],
    ['vincelles','Vincelles','89290',45],
    ['escamps','Escamps','89240',45],
    ['chitry','Chitry','89530',50],
    ['mige','Migé','89580',50],
    ['lindry','Lindry','89240',50],
    ['chemilly-sur-yonne','Chemilly-sur-Yonne','89250',55],
    ['seignelay','Seignelay','89250',60]
  ].map(([key,name,postcode,minimum]) => ({key,name,postcode,minimum}));
  const DEFAULT_DELIVERY_MINIMUM = 18;
  const normalizePlace = value => ` ${String(value || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\bste\b/g,'sainte').replace(/\bst\b/g,'saint').replace(/[^a-z0-9]+/g,' ').trim()} `;
  const deliveryZone = key => deliveryZones.find(zone => zone.key === key) || null;
  // Détection dans une adresse : le nom de commune écrit le plus loin gagne (la ville suit la rue :
  // « route d'Auxerre, 89240 Chevannes » → Chevannes) ; sinon un code postal propre à une seule commune.
  function detectDeliveryZone(address) {
    const text = normalizePlace(address);
    let found = null, position = -1;
    for (const zone of deliveryZones) {
      const index = text.lastIndexOf(normalizePlace(zone.name));
      if (index > position || (index === position && index >= 0 && zone.name.length > found.name.length)) { found = zone; position = index; }
    }
    if (found && position >= 0) return found;
    for (const code of text.match(/\b89\d{3}\b/g) || []) {
      const zones = deliveryZones.filter(zone => zone.postcode === code);
      if (zones.length === 1) return zones[0];
    }
    return null;
  }
  // Minimum appliqué : le plus élevé entre la commune choisie et celle reconnue dans l'adresse.
  function deliveryMinimum(zoneKey, address = '') {
    const chosen = deliveryZone(zoneKey), detected = detectDeliveryZone(address);
    return Math.max(chosen ? chosen.minimum : DEFAULT_DELIVERY_MINIMUM, detected ? detected.minimum : 0);
  }
  const minimumForMode = (mode, zoneKey, address) => mode === 'delivery' ? deliveryMinimum(zoneKey, address) : 0;
  const sauceOptions = ['Ketchup','Mayonnaise','Barbecue','Samouraï','Blanche','Big burger','Algérienne','Harissa','Andalouse','Curry','Moutarde','Chili thaï','Cheezy','Fromagère','Poivre'];
  const vegetableOptions = ['Salade','Tomate','Oignon'];
  // Sauces + crudités (salade, tomate, oignon) : burgers, menus burger, sandwichs, assiettes et menu enfant burger.
  const hasMealCustomization = product => ['sandwichs','burgers','assiettes'].includes(product.category) || (product.category === 'menus-burger') || (product.category === 'menus' && product.name === 'Menu Enfant Cheese Burger');
  // Sauces seulement : chicken, paninis, tacos et menus enfant tenders / nuggets.
  const hasSauceCustomization = product => hasMealCustomization(product) || ['chicken','paninis','tacos'].includes(product.category) || (product.category === 'menus' && /^Menu Enfant (Nuggets|Tenders)$/.test(product.name));
  const customizationGroups = product => [
    ...(hasSauceCustomization(product) ? [['sauces',product.category==='tacos'?'Sauces pour les frites':'Sauces',sauceOptions,2]] : []),
    ...(hasMealCustomization(product) ? [['vegetables','Crudités',vegetableOptions,3]] : [])
  ];
  const customizationSummary = (label, values) => `${label} : ${values.length ? values.join(', ') : 'Aucune'}`;
  function totals(cart, mode) {
    const subtotalCents = cart.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    const pizzas = cart.flatMap(item => item.promo ? Array(item.quantity).fill(Math.round(item.price * 100)) : []).sort((a,b) => a-b);
    const cheapest = count => pizzas.slice(0, count).reduce((sum, price) => sum + price, 0);
    let discountCents = 0;
    let label = '';
    if (mode === 'pickup' && pizzas.length >= 2) {
      discountCents = cheapest(Math.floor(pizzas.length / 2));
      label = 'À emporter : 2e pizza offerte';
    } else if (mode === 'delivery' && pizzas.length >= 2) {
      const half = Math.round(cheapest(Math.floor(pizzas.length / 2)) / 2);
      const free = cheapest(Math.floor(pizzas.length / 3));
      discountCents = Math.max(half, free);
      label = free >= half ? 'Livraison : 3e pizza offerte' : 'Livraison : 2e pizza à −50 %';
    }
    const afterDiscountCents = subtotalCents - discountCents;
    return {subtotal:subtotalCents/100, discount:discountCents/100, deliveryFee:0, total:afterDiscountCents/100, label};
  }
  return {totals, isScheduledOpen, deliveryZones, deliveryZone, detectDeliveryZone, deliveryMinimum, minimumForMode, drinkSlots, drinkOptions, drinkSupplement, drinkLabel, refreshIncludedDrinks, sauceOptions, vegetableOptions, hasMealCustomization, hasSauceCustomization, customizationGroups, customizationSummary};
});
