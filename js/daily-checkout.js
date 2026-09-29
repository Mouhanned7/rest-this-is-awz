(() => {
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(value);
  const storageKey='dailyCheckout.v1';
  let config={orderingEnabled:false,paymentsEnabled:false},snapshot,gps=null,attempt=null,pollTimer,submitting=false,locationRequest=0;
  try{attempt=JSON.parse(sessionStorage.getItem(storageKey));if(attempt&&Date.now()-attempt.savedAt>86400000){attempt=null;sessionStorage.removeItem(storageKey);}}catch{}
  const dialog=document.createElement('dialog');dialog.id='checkout-dialog';dialog.className='checkout-dialog';dialog.setAttribute('aria-label','Finaliser votre commande');document.body.append(dialog);
  const persist=()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(attempt));return true;}catch{return false;}};
  const api=async(path,options={})=>{
    const response=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(options.token?{Authorization:'Bearer '+options.token}:{}),...options.headers},signal:AbortSignal.timeout(25000)});
    const data=await response.json().catch(()=>({error:'Service indisponible.'}));if(!response.ok)throw new Error(data.error||'La demande n’a pas abouti.');return data;
  };
  async function loadConfig(){try{config=await api('/public-config');}catch{config={orderingEnabled:false,paymentsEnabled:false};}}
  const heading=(label,title)=>`<div class="drawer-heading"><div><span class="eyebrow">${label}</span><h2>${title}</h2></div><button class="icon-button" type="button" data-checkout-close aria-label="Fermer">✕</button></div>`;
  async function openCheckout(){
    snapshot=window.DailyCart.snapshot();if(!snapshot.items.length)return;
    gps=null;locationRequest++;clearTimeout(pollTimer);document.getElementById('cart-dialog').close();
    dialog.innerHTML=heading('VOTRE COMMANDE','Presque <em>prêt.</em>')+'<p>Préparation du formulaire…</p>';dialog.showModal();await loadConfig();
    const delivery=snapshot.mode==='delivery',total=window.DailyCart.total();
    dialog.innerHTML=heading(delivery?'LIVRAISON':'À EMPORTER','Presque <em>prêt.</em>')+`
      <form id="checkout-form" class="checkout-form">
        <div class="checkout-total"><span>${snapshot.items.reduce((n,i)=>n+i.quantity,0)} articles</span><strong>${money(total)}</strong></div>
        <div class="checkout-fields"><label class="field-label">Votre nom<input name="name" autocomplete="name" required maxlength="100" placeholder="Prénom et nom"></label><label class="field-label">Téléphone français<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="30" placeholder="06 12 34 56 78" aria-describedby="phone-help"><small id="phone-help">10 chiffres, ou +33 suivi de 9 chiffres.</small></label></div>
        <label class="field-label">E-mail<input name="email" type="email" autocomplete="email" required maxlength="160" placeholder="vous@exemple.fr"></label>
        ${delivery?`<div class="location-box"><button type="button" class="button button-outline" id="detect-position">⌖ Utiliser ma position</button><p id="location-feedback" role="status">Autorisez la localisation pour aider le livreur. Une adresse sera proposée via IGN ou Google, à vérifier.</p><a id="customer-map" target="_blank" rel="noopener noreferrer" hidden>Voir ma position sur Google Maps ↗</a><button type="button" id="clear-position" class="remove-item" hidden>Retirer ma position</button></div><label class="field-label">Adresse de livraison<input name="address" autocomplete="street-address" required maxlength="500" placeholder="N°, rue, code postal et ville"></label><p class="cart-info">Vérifiez votre adresse, même après la détection GPS. Zone de livraison à confirmer avec le restaurant.</p>`:'<p class="checkout-address">Retrait au 40 rue Bourneil, Auxerre.</p>'}
        <label class="field-label">Une précision ?<textarea name="note" maxlength="500" rows="2" placeholder="Étage, code, interphone, consigne…"></textarea></label>
        <fieldset class="payment-options"><legend>Votre règlement</legend><label><input type="radio" name="paymentMethod" value="online" ${config.paymentsEnabled?'checked':'disabled'}> Carte bancaire <small>sur Stripe</small></label><label><input type="radio" name="paymentMethod" value="on_collection" ${config.paymentsEnabled?'':'checked'}> Au ${delivery?'livreur':'retrait'}</label></fieldset>
        ${config.testMode&&config.paymentsEnabled?'<p class="cart-alert">Mode test Stripe · aucune carte réelle.</p>':''}
        ${!config.orderingEnabled?'<p class="cart-alert">Commande en ligne bientôt disponible. En attendant : <a href="tel:+33386311717">03 86 31 17 17</a>.</p>':''}
        ${delivery&&total<18?'<p class="cart-alert">La livraison est disponible dès 18 € après remises.</p>':''}
        ${config.opening?.open===false?`<p class="cart-alert" role="alert">${escape(config.opening.message)}</p>`:''}
        <p id="checkout-error" class="checkout-error" role="alert"></p>
        <button type="submit" class="button button-red cart-summary-button" ${!config.orderingEnabled||(delivery&&total<18)?'disabled':''}>Valider ma commande · ${money(total)}</button>
        <p class="cart-info">En validant, vos coordonnées et votre position, si partagée, sont transmises au restaurant pour traiter la commande. Le paiement par carte s’effectue sur Stripe.</p>
      </form>`;
  }
  async function detectPosition(){
    const button=dialog.querySelector('#detect-position'),feedback=dialog.querySelector('#location-feedback'),form=dialog.querySelector('#checkout-form');
    if(!button||button.disabled||!form)return;
    const request=++locationRequest;
    const current=()=>request===locationRequest&&dialog.open&&dialog.querySelector('#checkout-form')===form;
    button.disabled=true;button.textContent='Recherche en cours…';feedback.textContent='Autorisez la localisation si le navigateur vous le demande.';
    try{
      const found=await window.DailyLocation.detect({geolocation:navigator.geolocation,secure:window.isSecureContext!==false,onRetry:()=>{if(current())feedback.textContent='Le GPS tarde. Nouvelle tentative avec la localisation du réseau…';}});
      if(!current())return;
      gps=found;
      const message=`${gps.accuracy>1000?'Position approximative':'Position trouvée'} · précision d’environ ${Math.round(gps.accuracy)} m.`;
      feedback.textContent=message+' Recherche de votre adresse…';
      const map=dialog.querySelector('#customer-map');map.href=`https://www.google.com/maps/search/?api=1&query=${gps.latitude},${gps.longitude}`;map.hidden=false;dialog.querySelector('#clear-position').hidden=false;
      try{
        const result=await api('/location/reverse',{method:'POST',body:JSON.stringify(found)});
        if(!current())return;
        const address=form.querySelector('[name="address"]');
        if(result.address&&address&&!address.value.trim()&&found.accuracy<=1000){address.value=result.address;feedback.textContent=message+' Adresse proposée : vérifiez le numéro et la rue.';}
        else feedback.textContent=message+(address?.value.trim()?' Votre adresse saisie a été conservée. Vérifiez-la.':' Saisissez votre adresse complète ci-dessous pour confirmer la livraison.');
      }catch{if(current())feedback.textContent=message+' La recherche d’adresse est indisponible. Saisissez votre adresse ci-dessous ; la position GPS est conservée.';}
    }catch(error){if(current())feedback.textContent=error.message||'Localisation indisponible. Saisissez votre adresse.';}
    finally{if(request===locationRequest){button.disabled=false;button.textContent='⌖ Utiliser ma position';}}
  }
  async function submitOrder(form){
    if(submitting)return;submitting=true;const button=form.querySelector('[type="submit"]'),error=form.querySelector('#checkout-error');button.disabled=true;error.textContent='';
    try{
      // Refresh the server clock: the form may have stayed open past 01:00.
      const currentConfig=await api('/public-config');
      let closingAcknowledged=false;
      if(currentConfig.opening?.open===false){
        if(!window.confirm(currentConfig.opening.message+'\n\nSouhaitez-vous quand même transmettre votre commande pour la réouverture ?'))return;
        closingAcknowledged=true;
      }
      const data=Object.fromEntries(new FormData(form));
      const stale=snapshot.items.find(item=>!item.choices);if(stale)throw new Error(`Votre ancien panier contient « ${stale.name} ». Retirez cet article puis ajoutez-le à nouveau pour confirmer ses options.`);
      const payload={items:snapshot.items.map(i=>({productId:i.productId,quantity:i.quantity,choices:i.choices})),mode:snapshot.mode,paymentMethod:data.paymentMethod,customer:{name:data.name,email:data.email,phone:data.phone,address:data.address||'',location:gps},note:data.note};
      const fingerprint=JSON.stringify(payload);
      if(!attempt||attempt.fingerprint!==fingerprint){
        // Keep the request token before sending, so a lost response can be retried safely.
        attempt={requestId:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),fingerprint,snapshot,savedAt:Date.now()};
      }
      if(!persist())throw new Error('Autorisez le stockage de session pour suivre votre commande, ou appelez le restaurant.');
      const order=await api('/orders',{method:'POST',token:attempt.token,body:JSON.stringify({...payload,requestId:attempt.requestId})});
      attempt.orderId=order.id;attempt.fingerprint=fingerprint;attempt.pollStart=Date.now();persist();ensureTracking();window.DailyCart.clearIfUnchanged(snapshot);
      if(order.outsideOpeningHours&&!closingAcknowledged)window.alert(order.openingWarning);
      if(payload.paymentMethod==='online')await startPayment(order);else showStatus(order);
    }catch(err){if(dialog.querySelector('#checkout-error'))error.textContent=err.name==='TimeoutError'?'La réponse tarde. Réessayez : la même demande sera reprise sans créer de doublon.':err.message;}
    finally{submitting=false;if(button.isConnected)button.disabled=false;}
  }
  async function startPayment(order){
    showStatus(order,'Ouverture du paiement sécurisé…');
    try{const result=await api(`/orders/${order.id}/checkout`,{method:'POST',token:attempt.token,body:'{}'});if(result.url){const target=new URL(result.url);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw new Error('Adresse de paiement invalide. Contactez le restaurant.');location.assign(result.url);}else await refreshStatus();}
    catch(error){showStatus(order,`Commande enregistrée. ${error.message}`);}
  }
  function showStatus(order,message=''){
    clearTimeout(pollTimer);if(!dialog.open)dialog.showModal();
    const paid=order.paymentStatus==='paid';
    const closed=['confirmed','cancelled'].includes(order.lifecycle);
    if(closed){
      const confirmed=order.lifecycle==='confirmed';
      dialog.innerHTML=heading('COMMANDE '+escape(order.reference),confirmed?'Commande <em>confirmée.</em>':'Commande <em>annulée.</em>')+`<div class="order-status ${confirmed?'paid':''}">${confirmed?'✓ Payée et confirmée':'Commande annulée'}</div><p class="checkout-status-copy">${confirmed?'Le restaurant a confirmé votre commande payée.':'Le restaurant a annulé votre commande non payée.'} Un e-mail vous a été envoyé.</p><a class="button button-outline cart-summary-button" href="tel:+33386311717">Appeler le restaurant</a>`;return;
    }
    dialog.innerHTML=heading('COMMANDE '+escape(order.reference),paid?'Paiement <em>réussi !</em>':'Bien <em>reçue.</em>')+`<div class="order-status ${paid?'paid':''}" role="status">${paid?'✓ Votre paiement est confirmé':'◷ Juste commandée'}</div><p class="checkout-status-copy">${paid?'Merci ! Le restaurant a reçu votre commande.':order.paymentMethod==='online'?'Votre commande est enregistrée. En attente de la confirmation de Stripe…':'Votre commande est enregistrée. Le règlement se fera au retrait ou à la livraison.'}</p><div class="checkout-total"><span>${order.mode==='delivery'?'Livraison':'À emporter'}</span><strong>${money(order.totalPrice)}</strong></div><p role="status" id="order-feedback">${escape(message)}</p>${order.outsideOpeningHours?`<p class="cart-alert" role="alert">${escape(order.openingWarning)}</p>`:''}${paid?'<button class="button button-red cart-summary-button" data-checkout-close>Continuer</button>':order.paymentMethod==='online'?'<button class="button button-red cart-summary-button" id="retry-payment">Reprendre le paiement</button>':''}<button class="button button-outline cart-summary-button" id="refresh-order">Actualiser le statut</button><a class="button copy-button cart-summary-button" href="tel:+33386311717">Appeler le restaurant</a><p class="cart-info">Gardez votre référence. La préparation et le délai sont confirmés par le restaurant.</p>`;
    dialog.querySelector('#retry-payment')?.addEventListener('click',()=>startPayment(order));
    dialog.querySelector('#refresh-order').addEventListener('click',()=>refreshStatus());
    if(Date.now()-(attempt.pollStart||0)<180000)pollTimer=setTimeout(()=>refreshStatus(true),4000);
  }
  async function refreshStatus(automatic=false){
    if(!attempt?.orderId)return;
    try{const order=await api(`/orders/${attempt.orderId}`,{token:attempt.token});if(automatic&&!dialog.open)return;showStatus(order);}
    catch(error){const el=dialog.querySelector('#order-feedback');if(el)el.textContent='Vérification momentanément indisponible. Votre paiement peut avoir abouti ; patientez ou actualisez le statut.';if(!automatic)window.DailyCart.toast(error.message);if(dialog.open&&Date.now()-(attempt.pollStart||0)<180000)pollTimer=setTimeout(()=>refreshStatus(true),4000);}
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('#begin-checkout'))openCheckout();
    if(event.target.closest('[data-checkout-close]'))dialog.close();
    if(event.target.closest('#detect-position'))detectPosition();
    if(event.target.closest('#clear-position')){locationRequest++;const b=dialog.querySelector('#detect-position');if(b){b.disabled=false;b.textContent='⌖ Utiliser ma position';}gps=null;dialog.querySelector('#customer-map').hidden=true;dialog.querySelector('#clear-position').hidden=true;dialog.querySelector('#location-feedback').textContent='Position retirée. Votre adresse sera utilisée.';}
    if(event.target.closest('#track-order')){attempt.pollStart=Date.now();refreshStatus();}
  });
  dialog.addEventListener('submit',event=>{if(event.target.id==='checkout-form'){event.preventDefault();submitOrder(event.target);}});
  dialog.addEventListener('input',event=>{if(event.target.name==='phone'){const value=event.target.value.replace(/[\s.()-]/g,'');const valid=!value||/^(0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(value);const message='Saisissez un numéro français : 06 12 34 56 78 ou +33 6 12 34 56 78.';event.target.setCustomValidity(valid?'':message);event.target.setAttribute('aria-invalid',String(!valid));const help=dialog.querySelector('#phone-help');help.textContent=valid?'10 chiffres, ou +33 suivi de 9 chiffres.':message;help.classList.toggle('checkout-error',!valid);}});
  dialog.addEventListener('close',()=>{clearTimeout(pollTimer);locationRequest++;});
  const returnParams=new URLSearchParams(location.search);
  function ensureTracking(){
    if(document.getElementById('track-order'))return;
    const track=document.createElement('button');
    track.id='track-order';track.type='button';track.className='order-tracking-pill';
    track.textContent='Suivre ma commande ↗';
    const slot=document.getElementById('order-tracking-slot');
    if(slot){slot.append(track);slot.hidden=false;}else document.body.append(track);
  }
  if(attempt?.orderId){
    ensureTracking();
    if(returnParams.get('orderId')===attempt.orderId){
      attempt.pollStart=Date.now();
      dialog.innerHTML=heading('VOTRE COMMANDE','Vérification du <em>paiement…</em>')+'<p class="checkout-status-copy">Nous attendons la confirmation de Stripe. Quelques instants suffisent généralement.</p><p id="order-feedback" role="status"></p><button class="button button-outline cart-summary-button" id="refresh-order">Actualiser le statut</button>';
      dialog.showModal();dialog.querySelector('#refresh-order').addEventListener('click',()=>refreshStatus());
      refreshStatus();history.replaceState(null,'',location.pathname+location.hash);
    }
  }
  loadConfig();
})();
