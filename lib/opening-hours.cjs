const CLOSED_MESSAGE='Le restaurant est fermé. Revenez à la réouverture à 11h pour commander et payer. Ouvert tous les jours de 11h à 1h du matin (heure de Paris).';
function openingHours(now=new Date()) {
  const hour=Number(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).find(part=>part.type==='hour').value);
  const open=hour>=11||hour<1;
  return {open,timeZone:'Europe/Paris',schedule:'Tous les jours · 11h à 1h du matin',message:open?'':CLOSED_MESSAGE};
}
module.exports={openingHours,CLOSED_MESSAGE};
