const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { totals } = require('../js/daily-pricing.js');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/daily-menu.js'),'utf8'), context);
const catalog = new Map(context.window.DAILY_MENU.map(product => [product.id,product]));
const meats = ['Escalope de poulet','Steak haché','Cordon bleu','Nuggets','Merguez','Kebab','Chicken curry','Chicken tandoori','Tenders'];
const drinks = ['Coca-Cola','Coca-Cola Light','Fanta','Eau minérale','Minute Maid orange','Minute Maid tropical','Minute Maid pomme'];
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail = message => {throw new HttpError(400,message);};
function text(value,max=200,required=false,label='Champ') {
  if (value==null && !required) return '';
  if (typeof value!=='string' || value.trim().length>max || (required&&!value.trim())) fail(`${label} invalide.`);
  return value.trim();
}
function quoteItem(item) {
  if (!item || !catalog.has(item.productId)) fail('Produit inconnu. Actualisez la carte.');
  const p=catalog.get(item.productId);
  if (!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99) fail('Quantité invalide.');
  if (!item.choices||typeof item.choices!=='object'||Array.isArray(item.choices)) fail(`Veuillez sélectionner à nouveau les options de « ${p.name} ».`);
  const choices=item.choices;
  const allowed=new Set(['note']);
  const options=[];
  let sizeIndex=0, priceCents=Math.round(p.price*100);
  if(p.sizes){
    allowed.add('size');
    if(!/^[0-9]+$/.test(String(choices.size))) fail(`Choisissez le format de ${p.name}.`);
    sizeIndex=Number(choices.size);
    if(!p.sizes[sizeIndex])fail('Format inconnu.');
    priceCents=Math.round(p.sizes[sizeIndex].price*100);
    options.push(p.sizes[sizeIndex].name);
  }
  function choice(key,label,values,prices={}) {
    allowed.add(key);
    const value=choices[key];
    if(typeof value!=='string'||!values.includes(value))fail(`${label} : sélection invalide pour ${p.name}.`);
    priceCents+=prices[value]||0;
    if(!value.startsWith('Sans '))options.push(`${label} : ${value}`);
  }
  if(p.choice==='tacos'){
    for(let i=1;i<=p.sizes[sizeIndex].meats;i++)choice(`meat${i}`,`Viande ${i}`,meats);
    const gratins=['Boursin','Cheddar','Raclette','Reblochon','Lardons','Bacon','Jambon'];
    choice('gratin','Gratinage',['Sans gratinage',...gratins],Object.fromEntries(gratins.map(s=>[s,250])));
    const extras=['Cheddar +1,00 €','Bacon +1,50 €','Raclette +1,50 €','Boursin +1,50 €','Chèvre +1,50 €','Galette de pommes de terre +1,50 €','Œuf +1,50 €'];
    choice('extra','Extra',['Sans extra',...extras],Object.fromEntries(extras.map((s,i)=>[s,i===0?100:150])));
    choice('additionalMeat','Viande supplémentaire',['Sans viande supplémentaire',...meats],Object.fromEntries(meats.map(s=>[s,200])));
  }
  if(p.choice==='bread')choice('bread','Pain',['Classic','Tortilla','Cheese naan +0,50 €'],{'Cheese naan +0,50 €':50});
  if(p.extraMeat)choice('meat','Viande',meats);
  if(p.choice==='calzone')choice('filling','Garniture',['Jambon','Thon','Viande hachée']);
  if(p.choice==='kids')choice('kids','Menu enfant',['Cheese Burger','4 Nuggets','4 Tenders']);
  if(p.choice==='plate')choice('side','Accompagnement',['Frites','Potatoes']);
  if(p.choice==='panizza'){
    choice('base','Base',['Sauce tomate','Crème fraîche']);
    for(let i=1;i<=2;i++)choice(`ingredient${i}`,`Ingrédient ${i}`,['Jambon','Poulet','Viande hachée','Thon','Merguez','Champignons','Chèvre','Olives']);
  }
  if(p.pizzaCount)for(let i=1;i<=p.pizzaCount;i++)choice(`pizza${i}`,`Pizza ${i} ${p.pizzaSize}`,[...catalog.values()].filter(x=>x.category==='pizzas').map(x=>x.name));
  if(p.meal){
    choice('drink','Boisson',drinks);
    if(p.choice!=='kids'&&p.choice!=='tacos'){
      allowed.add('noFries');
      if(choices.noFries!==undefined&&choices.noFries!=='on')fail('Option frites invalide.');
      if(choices.noFries==='on'){priceCents-=50;options.push('Sans frites');}
    }
  }
  for(const key of Object.keys(choices))if(!allowed.has(key))fail(`Option inconnue : ${key}.`);
  const note=text(choices.note,220);if(note)options.push(`Note : ${note}`);
  return {productId:p.id,name:p.name,category:p.category,image:p.image,quantity:item.quantity,price:priceCents/100,unitAmount:priceCents,lineTotal:priceCents*item.quantity/100,options:options.join(' · '),choices:{...choices},size:p.sizes?.[sizeIndex].name||'',promo:p.category==='pizzas'&&p.promo===true&&sizeIndex>0};
}
function validateOrder(body) {
  if(!body||typeof body!=='object')fail('Commande invalide.');
  if(!/^[a-f0-9-]{36}$/i.test(body.requestId||''))fail('Identifiant de requête invalide.');
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>50)fail('Votre panier doit contenir entre 1 et 50 lignes.');
  if(!['pickup','delivery'].includes(body.mode))fail('Mode de commande invalide.');
  if(!['online','on_collection'].includes(body.paymentMethod))fail('Mode de paiement invalide.');
  const items=body.items.map(quoteItem);
  if(items.reduce((s,i)=>s+i.quantity,0)>100)fail('Pour plus de 100 articles, appelez le restaurant.');
  const amounts=totals(items,body.mode);
  if(body.mode==='delivery'&&amounts.total<18)fail('Le minimum de livraison est de 18 € après remises.');
  const source=body.customer||{};
  const customer={name:text(source.name,100,true,'Nom'),email:text(source.email,160,true,'E-mail'),phone:text(source.phone,30,true,'Téléphone').replace(/[\s.()-]/g,''),address:text(source.address,500,body.mode==='delivery','Adresse')};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))fail('E-mail invalide.');
  if(!/^(0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(customer.phone))fail('Numéro français invalide (06… ou +33…).');
  let location=null;
  if(body.mode==='delivery'&&source.location!=null){
    const {latitude,longitude,accuracy}=source.location;
    if(!Number.isFinite(latitude)||latitude< -90||latitude>90||!Number.isFinite(longitude)||longitude< -180||longitude>180||!Number.isFinite(accuracy)||accuracy<0)fail('Position GPS invalide.');
    location={latitude,longitude,accuracy:Math.round(accuracy),mapsUrl:`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`};
  }
  return {items,mode:body.mode,paymentMethod:body.paymentMethod,customer:{...customer,location},note:text(body.note,500),subtotal:amounts.subtotal,pizzaDiscount:amounts.discount,promotion:amounts.label,deliveryFee:0,totalPrice:amounts.total,amountTotal:Math.round(amounts.total*100),currency:'eur'};
}
module.exports={validateOrder,quoteItem,catalog,HttpError};
