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
      : ['Coca-Cola','Coca-Cola Zéro','Coca-Cola Cherry','Sprite','Seven Up Cherry','Seven Up Mojito','Fanta','Fanta Citron','Lipton Ice Tea Pêche','Orangina','DADA Fraise','DADA Melon','DADA Cherry','Tropico Orange Ananas','Perrier','Eau minérale','Oasis Pomme Cassis Framboise','Oasis'];
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
  const minimumForMode = mode => mode === 'delivery' ? 18 : 0;
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
  return {totals, isScheduledOpen, minimumForMode, drinkSlots, drinkOptions, drinkSupplement, drinkLabel, refreshIncludedDrinks, sauceOptions, vegetableOptions, hasMealCustomization, hasSauceCustomization, customizationGroups, customizationSummary};
});
