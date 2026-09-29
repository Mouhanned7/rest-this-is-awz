const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(value);

function orderEmailContent(order,action){
  const confirmed=action==='confirm',paid=action==='paid';
  const title=paid?'Paiement reçu':confirmed?'Commande confirmée':'Commande annulée';
  const intro=paid?(order.lifecycle==='confirmed'?'Votre paiement a bien été reçu et votre commande a été confirmée par Daily Chicken Pizza.':'Votre paiement a bien été reçu par Daily Chicken Pizza. Votre commande attend maintenant la confirmation du restaurant.'):confirmed?'Votre commande payée a été confirmée par Daily Chicken Pizza.':'Votre commande non payée a été annulée par Daily Chicken Pizza. Aucun règlement n’est demandé pour cette commande.';
  const delivery=order.mode==='delivery';
  const location=delivery?order.customer.address:'40 rue Bourneil, 89000 Auxerre';
  const status=paid?'Paiement validé':confirmed?'Validée par le restaurant':'Aucun règlement demandé';
  const accent=action==='cancel'?'#70564c':'#23644d';
  const pale=action==='cancel'?'#f6eeea':'#eaf4ee';
  const e=escapeHtml;
  const multiline=value=>e(value).replace(/\r?\n/g,'<br>');
  const text=`Bonjour ${order.customer.name},\n\n${intro}\n\nRéférence : ${order.reference}\n${delivery?'Livraison':'Retrait'} : ${location}\n\n${order.items.map(i=>`${i.quantity} × ${i.name} — ${money(i.lineTotal)}${i.options?'\n'+i.options:''}`).join('\n\n')}\n\nTotal ${action==='cancel'?'de la commande annulée':'payé'} : ${money(order.totalPrice)}${order.pizzaDiscount?' (remise incluse : '+money(order.pizzaDiscount)+')':''}\n${order.note?'Votre remarque : '+order.note+'\n':''}\nUne question ? 03 86 31 17 17\nDaily Chicken Pizza\n40 rue Bourneil, 89000 Auxerre\nOuvert 7j/7 · 11h à 01h\n\nCet e-mail concerne votre commande auprès de Daily Chicken Pizza.`;
  // Tables and inline styles remain legible when a mail client strips CSS.
  // No remote images, tracking pixels, scripts, or customer-controlled links.
  const html=`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Daily Chicken Pizza</title>
<style>body{margin:0;padding:0}table{border-collapse:collapse}a{color:inherit}@media(max-width:600px){.outer{padding:16px 8px!important}.pad{padding:26px 20px!important}.headline{font-size:32px!important;line-height:38px!important}.brand{font-size:25px!important}}</style></head>
<body style="margin:0;padding:0;background:#f3f0ea;color:#282821;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;font-size:1px;line-height:1px;color:#f3f0ea;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${e(title)} · ${e(order.reference)} · ${e(money(order.totalPrice))}</div>
<table role="presentation" width="100%" style="width:100%;background:#f3f0ea"><tr><td class="outer" align="center" style="padding:36px 16px">
<table role="presentation" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:24px;border-collapse:separate;overflow:hidden">
<tr><td class="pad" style="padding:30px 36px;background:#283f33;color:#ffffff;border-radius:24px 24px 0 0">
<p class="brand" style="margin:0;font-family:Georgia,serif;font-size:30px;font-weight:bold;letter-spacing:-1px">Daily Chicken Pizza<span style="color:#d8eaa1">.</span></p>
<p style="margin:9px 0 0;font-size:12px;letter-spacing:2px;color:#d8eaa1">AUXERRE · DEPUIS VOTRE COMMANDE JUSQU’À VOUS</p></td></tr>
<tr><td class="pad" style="padding:36px">
<span style="display:inline-block;padding:8px 12px;border-radius:20px;background:${pale};color:${accent};font-size:12px;font-weight:bold">${status}</span>
<h1 class="headline" style="margin:22px 0 18px;font-size:40px;line-height:46px;letter-spacing:-1.5px;font-weight:800">${title}<span style="color:${accent}">.</span></h1>
<p style="margin:0 0 10px;font-size:17px;line-height:26px;overflow-wrap:anywhere">Bonjour ${e(order.customer.name)},</p>
<p style="margin:0 0 28px;font-size:16px;line-height:25px;color:#565b52">${intro}</p>
<table role="presentation" width="100%" style="width:100%;background:#f6f5f0;border-radius:14px;border-collapse:separate"><tr><td style="padding:18px 20px;font-size:12px;color:#666a60">VOTRE COMMANDE<br><strong style="display:block;margin-top:6px;font-size:19px;color:#283f33;overflow-wrap:anywhere">${e(order.reference)}</strong></td><td align="right" style="padding:18px 20px;font-size:14px;font-weight:bold;color:#283f33">${delivery?'En livraison':'À emporter'}</td></tr></table>
<h2 style="margin:28px 0 10px;font-size:20px">Le récapitulatif</h2>
<table role="presentation" width="100%" style="width:100%;table-layout:fixed">${order.items.map(item=>`<tr><td style="padding:16px 10px 16px 0;border-bottom:1px solid #e9e8e0;font-size:16px;line-height:23px;vertical-align:top;overflow-wrap:anywhere"><strong>${e(item.quantity)} × ${e(item.name)}</strong>${item.options?`<br><span style="font-size:14px;color:#6b7065">${multiline(item.options)}</span>`:''}</td><td width="100" align="right" style="width:100px;padding:16px 0;border-bottom:1px solid #e9e8e0;font-size:16px;line-height:23px;vertical-align:top;white-space:nowrap">${e(money(item.lineTotal))}</td></tr>`).join('')}
${order.pizzaDiscount?`<tr><td style="padding-top:16px;font-size:14px;color:#23644d">Remise incluse</td><td align="right" style="padding-top:16px;font-size:14px;color:#23644d">−${e(money(order.pizzaDiscount))}</td></tr>`:''}
<tr><td style="padding:22px 0 8px;font-size:17px;font-weight:bold">${action==='cancel'?'Total de la commande':'Total payé'}</td><td align="right" style="padding:22px 0 8px;font-size:24px;font-weight:bold;white-space:nowrap">${e(money(order.totalPrice))}</td></tr></table>
${action==='cancel'?'<p style="margin:4px 0 12px;font-size:14px;color:#70564c">Commande annulée · aucun montant à régler.</p>':''}
<table role="presentation" width="100%" style="width:100%;margin-top:24px;background:#f6f5f0;border-radius:14px;border-collapse:separate"><tr><td style="padding:20px;font-size:15px;line-height:24px;overflow-wrap:anywhere"><strong>${delivery?'Adresse de livraison':'Retrait au restaurant'}</strong><br>${multiline(location)}${order.note?`<br><br><strong>Votre remarque</strong><br>${multiline(order.note)}`:''}</td></tr></table>
<p style="margin:28px 0 16px;font-size:15px;line-height:24px;color:#565b52">Une question sur votre commande ?<br>Notre équipe est à votre écoute.</p>
<table role="presentation"><tr><td style="border-radius:12px;background:#283f33"><a href="tel:+33386311717" style="display:inline-block;padding:15px 24px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none">Appeler · 03 86 31 17 17</a></td></tr></table>
</td></tr>
<tr><td class="pad" style="padding:24px 36px;border-top:1px solid #e9e8e0;font-size:13px;line-height:22px;color:#6b7065"><strong style="color:#283f33">Daily Chicken Pizza</strong><br>40 rue Bourneil · 89000 Auxerre<br>Ouvert 7j/7 · 11h à 01h</td></tr></table>
<p style="margin:20px 16px 0;max-width:520px;font-size:12px;line-height:19px;color:#777a72">Cet e-mail concerne votre commande auprès de Daily Chicken Pizza.<br>Conservez-le pour retrouver votre référence.</p>
</td></tr></table></body></html>`;
  return {title,text,html};
}
module.exports={orderEmailContent};
