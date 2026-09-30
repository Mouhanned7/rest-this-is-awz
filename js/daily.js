(() => {
  'use strict';
  const paths = {
    instagram:'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 10a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm1-6h.01',
    facebook:'M14 22v-9h4l1-4h-5V6c0-1 1-2 2-2h3V1h-4c-4 0-6 2-6 6v2H6v4h3v9',
    arrow:'M4 12h16m-6-6 6 6-6 6', 'arrow-up':'M6 18 18 6M6 6h12v12',
    bag:'M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2',
    pizza:'M4 3c7-2 14 2 17 8L5 22 4 3Zm1 5c5-2 10 1 12 5M9 10h.01M9 16h.01M13 12h.01',
    burger:'M3 9a9 7 0 0 1 18 0H3Zm0 6h18M4 18h16a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3ZM3 12l4 1 4-1 4 1 6-1M9 5h.01M14 5h.01',
    chicken:'m7 15-3 3a2 2 0 1 0 3 3l3-3m-3-3c-3-3-1-6 2-8s7-3 10 0 2 7-1 10-6 3-8 1l-3-3Z',
    scooter:'M5 17a3 3 0 1 0 0 .1M19 17a3 3 0 1 0 0 .1M5 17h10l3-5-2-7h-3M16 8h4M5 17l2-6h7M4 8h6M3 11h4',
    clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    phone:'M7 3H3c-1 10 8 19 18 18v-4l-5-2-2 2a14 14 0 0 1-7-7l2-2-2-5Z',
    pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    card:'M3 4h18v16H3V4Zm0 5h18M6 15h4',search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
    info:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 11v6M12 7h.01',
    close:'m6 6 12 12M6 18 18 6',plus:'M12 5v14M5 12h14',menu:'M4 6h16M4 12h16M4 18h16',
    spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
    wrap:'m3 8 5-5 13 13-5 5L3 8Zm3-2 12 12M9 4l-5 5m9-1-5 5m9-1-5 5',
    sandwich:'M3 9 12 3l9 6-9 6-9-6Zm0 5 9 6 9-6M3 18l9 5 9-5',
    leaf:'M20 3C6 1 1 10 6 17s17 2 14-14ZM5 21 16 9',
    plate:'M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM1 3v6m2-6v6M1 7h2M2 9v12M23 3v18m0-18-2 8h2',
    fries:'m4 10 2 12h12l2-12H4ZM6 10V3h3v7m2 0V1h3v9m2 0V4h3v6M9 14v4m6-4v4',
    cake:'M3 10h18v11H3V10Zm0 5c3-4 5 4 9 0s5 4 9 0M8 10V6m8 4V6M8 3h.01M16 3h.01',
    cup:'M5 7h14l-2 15H7L5 7Zm7 0 2-6h4M4 7h16',check:'m5 12 4 4L19 6'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
  const fillIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(value);
  const menu = window.DAILY_MENU;
  const categories = window.DAILY_CATEGORIES;
  const byId = new Map(menu.map(p=>[p.id,p]));
  const categoryName = key => categories.find(c=>c[0]===key)?.[1] || key;
  const selectedNames = [['pizzas','Marguerita'],['burgers','Double Cheese'],['chicken','Tenders'],['tacos','Le Tacos'],['pizzas','Chicken'],['burgers','Chicken Burger'],['sandwichs','Kebab'],['menus','Menu Daily']];
  let category = new URLSearchParams(location.search).get('category') || 'selection';
  if (!categories.some(c=>c[0]===category)) category = 'selection';
  let limit = 12;
  let query = '';
  let cart = [];
  let mode = 'pickup';
  let activeProduct = null;
  let detailQuantity = 1;
  let toastTimer;
  const storageKey = 'dailyChickenCart.v1';
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if(Array.isArray(saved.items)) cart = saved.items.filter(item => byId.has(item.productId) && typeof item.key==='string' && typeof item.name==='string' && typeof item.options==='string' && Number.isFinite(item.price) && item.price>0 && Number.isInteger(item.quantity) && item.quantity>0 && item.quantity<=99);
    if(saved.mode === 'delivery') mode='delivery';
  } catch { /* A stale or disabled storage must not prevent browsing. */ }
  const toast = message => {
    const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);
  };
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function renderMenu(){
    if(!document.getElementById('product-grid'))return;
    document.getElementById('categories').innerHTML=categories.map(([key,label,glyph])=>`<button class="category-button" data-category="${key}" aria-pressed="${key===category}">${icon(glyph)}${key==='selection'?'La sélection':label}</button>`).join('');
    let products = category==='selection' ? selectedNames.map(([cat,name])=>menu.find(p=>p.category===cat&&p.name===name)).filter(Boolean) : menu.filter(p=>p.category===category);
    if(query) products=menu.filter(p=>(category==='selection'||p.category===category)&&normalize(`${p.name} ${p.description}`).includes(normalize(query)));
    document.getElementById('menu-count').textContent=query?`${products.length} résultat${products.length>1?'s':''} pour « ${query} »`:`${category==='selection'?'La sélection Daily':categoryName(category)} · ${products.length} envie${products.length>1?'s':''} à découvrir`;
    document.getElementById('product-grid').innerHTML=products.length?products.slice(0,limit).map(p=>`<article class="product-card"><button class="product-image-button" data-product="${p.id}" aria-label="Découvrir ${escape(p.name)}"><img src="${escape(p.image)}" alt="${escape(p.name)} — suggestion de présentation" loading="lazy" width="600" height="450">${p.badge?`<span class="product-badge">${escape(p.badge)}</span>`:p.meal?'<span class="product-badge">Frites + boisson incluses</span>':''}</button><div class="product-body"><span class="product-category">${escape(p.base || categoryName(p.category))}${p.sizes?' · '+p.sizes.length+' tailles':''}</span><h3>${escape(p.name)}</h3><p>${escape(p.description)}</p><div class="product-bottom"><span class="product-price">${p.sizes?'<small>À partir de</small>':''}${money(p.price)}</span><button class="add-button" data-product="${p.id}" aria-label="Ajouter ${escape(p.name)} au panier">${icon('plus')}</button></div></div></article>`).join(''):`<div class="empty-results"><h3>Cette envie se fait discrète.</h3><p>Essayez « chicken », « fromage » ou une autre catégorie.</p><button class="button button-outline" data-reset-search>Réinitialiser la recherche</button></div>`;
    const more=document.getElementById('show-more');more.hidden=category!=='selection' && products.length<=limit;more.textContent=category==='selection'?'Explorer toute la carte':'Voir plus de produits';more.insertAdjacentHTML('beforeend',icon('arrow'));
  }
  function selectCategory(key){category=key;limit=12;query='';document.getElementById('menu-search').value='';renderMenu();document.querySelector(`[data-category="${key}"]`)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});}
  const optionSelect=(label,name,options)=>`<label class="field-label">${escape(label)}<select name="${name}">${options.map(o=>`<option value="${escape(o)}">${escape(o)}</option>`).join('')}</select></label>`;
  const meats=['Escalope de poulet','Steak haché','Cordon bleu','Nuggets','Merguez','Kebab','Chicken curry','Chicken tandoori','Tenders'];
  const drinks=['Coca-Cola','Coca-Cola Light','Fanta','Eau minérale','Minute Maid orange','Minute Maid tropical','Minute Maid pomme'];
  function detailExtras(p){
    let html='';
    if(p.choice==='tacos'){
      html+='<div id="meat-options"></div>';
      html+=optionSelect('Gratinage (en option) +2,50 €','gratin',['Sans gratinage','Boursin','Cheddar','Raclette','Reblochon','Lardons','Bacon','Jambon']);
      html+=optionSelect('Un extra ?','extra',['Sans extra','Cheddar +1,00 €','Bacon +1,50 €','Raclette +1,50 €','Boursin +1,50 €','Chèvre +1,50 €','Galette de pommes de terre +1,50 €','Œuf +1,50 €']);
      html+=optionSelect('Viande supplémentaire +2,00 €','additionalMeat',['Sans viande supplémentaire',...meats]);
    }
    if(p.choice==='bread')html+=optionSelect('Votre pain','bread',['Classic','Tortilla','Cheese naan +0,50 €']);
    if(p.extraMeat)html+=optionSelect('Votre viande','meat',meats);
    if(p.choice==='calzone')html+=optionSelect('Votre garniture','filling',['Jambon','Thon','Viande hachée']);
    if(p.choice==='kids')html+=optionSelect('Le choix des petits','kids',['Cheese Burger','4 Nuggets','4 Tenders']);
    if(p.choice==='plate')html+=optionSelect('Votre accompagnement','side',['Frites','Potatoes']);
    if(p.choice==='panizza'){
      html+=optionSelect('Votre base','base',['Sauce tomate','Crème fraîche']);
      for(let i=1;i<=2;i++)html+=optionSelect(`Ingrédient ${i} (à confirmer par téléphone)`,`ingredient${i}`,['Jambon','Poulet','Viande hachée','Thon','Merguez','Champignons','Chèvre','Olives']);
    }
    if(p.pizzaCount) for(let i=1;i<=p.pizzaCount;i++)html+=optionSelect(`Pizza ${i} · ${p.pizzaSize}`,`pizza${i}`,menu.filter(x=>x.category==='pizzas').map(x=>x.name));
    if(p.meal){html+=optionSelect(p.choice==='kids'?'Votre boisson':'Votre boisson 33 cl','drink',drinks);if(p.choice!=='kids'&&p.choice!=='tacos')html+='<label class="check-label"><input type="checkbox" name="noFries"> Sans frites (−0,50 €)</label>';}
    if(p.category==='desserts'&&p.sizes)html+='<p class="detail-note">Le parfum sera confirmé avec l’équipe selon les disponibilités.</p>';
    return html;
  }
  function openProduct(id){
    activeProduct=byId.get(id);if(!activeProduct)return;const p=activeProduct;detailQuantity=1;
    document.getElementById('product-detail').innerHTML=`<form id="product-form" class="detail-layout"><img class="detail-photo" src="${escape(p.image)}" alt="${escape(p.name)} — suggestion de présentation"><div class="detail-content"><span class="eyebrow">${escape(categoryName(p.category))}</span><h2 id="active-product-title">${escape(p.name)}</h2><p class="detail-description">${escape(p.description)}</p>${p.meal?'<p class="detail-note">'+icon('check')+' Frites et boisson incluses dans votre menu.</p>':''}${p.sizes?`<fieldset class="option-group"><legend>${p.category==='pizzas'?'Une taille pour chaque faim':'Choisissez votre format'}</legend><div class="size-options">${p.sizes.map((s,i)=>`<label class="radio-option"><input type="radio" name="size" value="${i}" ${i===0?'checked':''}><span>${escape(s.name)}<b>${money(s.price)}</b></span></label>`).join('')}</div></fieldset>`:''}${detailExtras(p)}<label class="field-label">Une précision pour l’équipe ?<textarea name="note" maxlength="220" rows="2" placeholder="Sans oignons, sauce à part…"></textarea></label><p class="cart-info">Photos d’illustration. Allergènes et disponibilités à confirmer avec l’équipe.</p><div class="detail-actions"><div class="quantity-control"><button type="button" data-detail-qty="-1" aria-label="Diminuer la quantité">−</button><span id="detail-quantity">1</span><button type="button" data-detail-qty="1" aria-label="Augmenter la quantité">+</button></div><button class="button button-red" type="submit">Ajouter <span id="detail-total"></span> ${icon('plus')}</button></div></div></form>`;
    updateMeats();updateDetailPrice();document.getElementById('product-dialog').showModal();
  }
  function updateMeats(){if(activeProduct?.choice!=='tacos')return;const form=document.getElementById('product-form');const index=Number(new FormData(form).get('size')||0);const count=activeProduct.sizes[index].meats;const el=document.getElementById('meat-options');const previous=[...el.querySelectorAll('select')].map(s=>s.value);el.innerHTML=Array.from({length:count},(_,i)=>optionSelect(`Viande ${i+1}`,`meat${i+1}`,meats)).join('');el.querySelectorAll('select').forEach((s,i)=>{if(previous[i])s.value=previous[i];});}
  function selection(){
    const p=activeProduct;const data=new FormData(document.getElementById('product-form'));const sizeIndex=Number(data.get('size')||0);let price=p.sizes?p.sizes[sizeIndex].price:p.price;const options=[];
    if(p.sizes)options.push(p.sizes[sizeIndex].name);
    for(const [key,value] of data){if(['size','note','noFries'].includes(key))continue;if(['Sans gratinage','Sans extra','Sans viande supplémentaire'].includes(value))continue;
      if(key==='bread'&&value.includes('+'))price+=.5;
      if(key==='gratin')price+=2.5;
      if(key==='extra')price+=value.includes('+1,00')?1:1.5;
      if(key==='additionalMeat')price+=2;
      options.push((key.startsWith('pizza')?`${key.replace('pizza','Pizza ')} : `:key==='drink'?'Boisson : ':key==='gratin'?'Gratinage : ':key==='additionalMeat'?'Viande supplémentaire : ':'')+value);
    }
    if(data.has('noFries')){price-=.5;options.push('Sans frites');}
    const note=String(data.get('note')||'').trim();if(note)options.push(`Note : ${note}`);
    return {productId:p.id,name:p.name,price:Math.round(price*100)/100,options:options.join(' · '),choices:Object.fromEntries(data),size:p.sizes?.[sizeIndex].name||'',promo:p.category==='pizzas'&&p.promo&&sizeIndex>0};
  }
  function updateDetailPrice(){if(!activeProduct)return;document.getElementById('detail-total').textContent=money(selection().price*detailQuantity);document.getElementById('detail-quantity').textContent=detailQuantity;document.querySelector('[data-detail-qty="-1"]').disabled=detailQuantity<=1;document.querySelector('[data-detail-qty="1"]').disabled=detailQuantity>=99;}
  function saveCart(){try{localStorage.setItem(storageKey,JSON.stringify({items:cart,mode}));}catch{toast('Panier disponible pour cette visite.');}renderCart();}
  function addToCart(){const item=selection();item.key=JSON.stringify([item.productId,item.options]);const existing=cart.find(i=>i.key===item.key);if(existing)existing.quantity=Math.min(99,existing.quantity+detailQuantity);else cart.push({...item,quantity:detailQuantity});saveCart();document.getElementById('product-dialog').close();toast(`${item.name} ajouté au panier`);}
  function totals(){ return window.DailyPricing.totals(cart,mode); }
  function renderCart(){
    const count=cart.reduce((n,i)=>n+i.quantity,0);const t=totals();document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=count);document.querySelector('.mobile-cart-bar').classList.toggle('has-items',count>0);document.getElementById('mobile-cart-total').textContent=money(t.total);document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===mode)));
    document.getElementById('cart-items').innerHTML=cart.length?cart.map((i,index)=>`<article class="cart-item"><img src="${escape(byId.get(i.productId).image)}" alt="${escape(i.name)}"><div class="cart-item-body"><div class="cart-item-title"><strong>${escape(i.name)}</strong><b>${money(i.price*i.quantity)}</b></div><p>${escape(i.options||categoryName(byId.get(i.productId).category))}</p><div class="cart-item-controls"><div class="quantity-control"><button data-cart-qty="-1" data-index="${index}" aria-label="Diminuer ${escape(i.name)}">−</button><span>${i.quantity}</span><button data-cart-qty="1" data-index="${index}" aria-label="Augmenter ${escape(i.name)}" ${i.quantity>=99?'disabled':''}>+</button></div><button class="remove-item" data-remove="${index}" aria-label="Retirer ${escape(i.name)}">Retirer</button></div></div></article>`).join(''):`<div class="cart-empty">${icon('bag')}<h3>Tout commence par une envie.</h3><p>Ajoutez vos favoris, choisissez votre format<br>et composez votre prochain repas.</p><button class="button button-red" data-close-dialog>Découvrir la carte ${icon('arrow')}</button></div>`;
    document.getElementById('cart-summary').innerHTML=cart.length?`<div class="cart-totals"><div class="total-row"><span>Sous-total</span><span>${money(t.subtotal)}</span></div>${t.discount?`<div class="total-row discount-row"><span>${escape(t.label)}</span><span>−${money(t.discount)}</span></div>`:''}${mode==='delivery'?'<div class="total-row"><span>Livraison</span><span>Offerte dès 18 €</span></div>':''}<div class="total-row grand-total"><span>Total estimé</span><span>${money(t.total)}</span></div>${mode==='delivery'&&t.total<18?`<div class="cart-alert">Encore ${money(18-t.total)} pour atteindre le minimum de livraison de 18 €. Vous pouvez aussi choisir le retrait à emporter.</div>`:''}<p class="cart-info">Les offres pizzas concernent les Senior et Méga, sauf Marguerita. La moins chère bénéficie de la remise. Offres non cumulables, à signaler à la commande.</p><button class="button button-red cart-summary-button" id="begin-checkout">Valider mon panier ${icon('arrow')}</button><a class="button copy-button cart-summary-button" href="tel:+33386311717">Commander par téléphone</a><p class="cart-info">Livraison dès 18 €. Les disponibilités et le délai sont confirmés par le restaurant.</p></div>`:'';
  }
  function showCredits(){document.getElementById('info-content').innerHTML='<span class="eyebrow">EN TOUTE TRANSPARENCE</span><h2>Le petit <em>imprimé.</em></h2><p>Carte, prix, offres et coordonnées repris des deux flyers Daily Chicken Pizza fournis pour ce site. Prix et disponibilités à confirmer auprès du restaurant. Pour les allergènes, demandez conseil à l’équipe avant de commander.</p><p>Les photos sont des illustrations et des suggestions de présentation. Photographies d’ambiance : <a href="https://unsplash.com/images/food/pizza" target="_blank" rel="noopener noreferrer">Unsplash</a>. Visuels complémentaires issus de la bibliothèque du projet.</p><p>Les paniers sont enregistrés localement dans votre navigateur pour retrouver votre sélection. La validation du formulaire transmet votre commande et vos coordonnées au restaurant via Firebase. Si vous partagez votre GPS, il est transmis avec votre adresse pour la livraison. Le paiement en ligne est traité par Stripe. Votre navigateur conserve un jeton de suivi pour la session. Pour une demande concernant vos données, contactez le restaurant.</p><p>Daily Chicken Pizza · 40 rue Bourneil, 89000 Auxerre · <a href="tel:+33386311717">03 86 31 17 17</a>.</p>';document.getElementById('info-dialog').showModal();}
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a');if(!target)return;
    if(target.dataset.category)selectCategory(target.dataset.category);
    if(target.dataset.product)openProduct(target.dataset.product);
    if(target.hasAttribute('data-open-cart')){renderCart();document.getElementById('cart-dialog').showModal();}
    if(target.hasAttribute('data-close-dialog'))target.closest('dialog')?.close();
    if(target.dataset.detailQty){detailQuantity=Math.max(1,Math.min(99,detailQuantity+Number(target.dataset.detailQty)));updateDetailPrice();}
    if(target.dataset.cartQty){const index=Number(target.dataset.index);cart[index].quantity=Math.min(99,cart[index].quantity+Number(target.dataset.cartQty));cart=cart.filter(i=>i.quantity>0);saveCart();}
    if(target.dataset.remove!==undefined){cart.splice(Number(target.dataset.remove),1);saveCart();}
    if(target.dataset.mode){mode=target.dataset.mode;saveCart();}
    if(target.hasAttribute('data-reset-search')){query='';category='selection';document.getElementById('menu-search').value='';renderMenu();}
    if(target.id==='show-more'){if(category==='selection')selectCategory('pizzas');else{limit+=12;renderMenu();}}
    if(target.id==='show-credits')showCredits();
    if(target.id==='share-instagram'){
      document.getElementById('info-content').innerHTML=`<span class="eyebrow">À PARTAGER EN STORY</span><h2>Un moment <em>Daily.</em></h2><p>Ajoutez votre photo sur Instagram et copiez cette légende.</p><textarea id="order-summary-text" readonly aria-label="Légende Instagram" style="min-height:140px">Pause gourmande chez Daily Chicken Pizza 🍕🍔\n📍 40 rue Bourneil, Auxerre\n#DailyChickenPizza #Auxerre #PauseGourmande</textarea><button class="button button-red cart-summary-button" id="clipboard-order">Copier la légende</button><a class="button button-outline cart-summary-button" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Ouvrir Instagram ${icon('instagram')}</a>`;
      document.getElementById('info-dialog').showModal();
    }
    if(target.id==='clipboard-order'){
      const textarea=document.getElementById('order-summary-text');textarea.select();
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(textarea.value).then(()=>{target.textContent='Texte copié ✓';}).catch(()=>{target.textContent='Sélectionné : utilisez Copier';});else target.textContent='Sélectionné : utilisez Copier';
    }
    if(target.id==='mobile-menu'){const open=target.getAttribute('aria-expanded')==='true';target.setAttribute('aria-expanded',String(!open));document.getElementById('mobile-nav').hidden=open;}
    if(target.closest('#mobile-nav')){document.getElementById('mobile-nav').hidden=true;document.getElementById('mobile-menu').setAttribute('aria-expanded','false');}
  });
  document.addEventListener('submit',event=>{if(event.target.id==='product-form'){event.preventDefault();addToCart();}});
  document.addEventListener('change',event=>{if(event.target.closest('#product-form')){if(event.target.name==='size')updateMeats();updateDetailPrice();}});
  document.getElementById('menu-search')?.addEventListener('input',event=>{query=event.target.value.trim();limit=12;renderMenu();});
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.getElementById('mobile-nav').hidden=true;document.getElementById('mobile-menu').setAttribute('aria-expanded','false');}});
  document.addEventListener('error',event=>{const el=event.target;if(el.tagName==='IMG'&&el.hasAttribute('data-google-photo')){el.hidden=true;el.closest('figure')?.classList.add('photo-unavailable');return;}if(el.tagName==='IMG'&&!el.dataset.fallback){el.dataset.fallback='true';el.src='images/daily/optimized/hero-pizza-4e8242.webp';}},true);
  window.addEventListener('storage',event=>{if(event.key===storageKey){try{const saved=JSON.parse(event.newValue||'{}');cart=Array.isArray(saved.items)?saved.items.filter(i=>byId.has(i.productId)&&Number.isFinite(i.price)&&i.price>0&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=99):[];mode=saved.mode==='delivery'?'delivery':'pickup';renderCart();}catch{/* Keep the current usable cart. */}}});
  async function updateOpeningBadge(){
  const hour=Number(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).find(part=>part.type==='hour').value);
  let open=hour>=11&&hour<13,override=false;
  try{
    const response=await fetch('/api/public-config',{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(response.ok){const config=await response.json();if(typeof config.opening?.open==='boolean'){open=config.opening.open;override=config.opening.allowOutsideHours===true;}}
  }catch{/* Keep the scheduled hours when offline. */}
  document.getElementById('opening-status').textContent=override?'Commandes ouvertes':open?'Ouvert · jusqu’à 1:00 PM':'De retour à 11:00 AM';
  document.querySelector('.status-dot').classList.toggle('closed',!open);
  }
  updateOpeningBadge();setInterval(updateOpeningBadge,60000);
  document.getElementById('year').textContent=new Date().getFullYear();
  fillIcons();renderMenu();renderCart();
  // The header basket remains available while the mobile hero is on screen.
  const hero=document.querySelector('.hero');
  if(hero&&'IntersectionObserver' in window){
    const heroObserver=new IntersectionObserver(([entry])=>{
      document.body.classList.toggle('hero-in-view',entry.isIntersecting);
    },{threshold:0});
    heroObserver.observe(hero);
  }
  window.DailyCart={
    snapshot:()=>JSON.parse(JSON.stringify({items:cart,mode})),
    total:()=>totals().total,
    clearIfUnchanged:snapshot=>{if(JSON.stringify({items:cart,mode})===JSON.stringify(snapshot)){cart=[];saveCart();}},
    toast
  };
  if(new URLSearchParams(location.search).get('openCart')==='true')document.getElementById('cart-dialog').showModal();
})();
