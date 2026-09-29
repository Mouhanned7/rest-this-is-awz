const CLOSED_MESSAGE='Le restaurant est actuellement fermé. Ouvert tous les jours de 11 h à 1 h (heure de Paris). Votre commande ne pourra être prise en charge qu’à la réouverture à 11 h, après confirmation du restaurant.';
function openingHours(now=new Date()) {
  const hour=Number(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).find(part=>part.type==='hour').value);
  const open=hour>=11||hour<1;
  return {open,timeZone:'Europe/Paris',schedule:'Tous les jours · 11 h à 1 h',message:open?'':CLOSED_MESSAGE};
}
module.exports={openingHours,CLOSED_MESSAGE};
