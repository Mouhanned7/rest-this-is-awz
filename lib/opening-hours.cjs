const CLOSED_MESSAGE='Le restaurant est fermé. Revenez à la réouverture à 11:00 AM pour commander et payer. Ouvert tous les jours de 11:00 AM à 1:00 PM (heure de Paris).';
function openingHours(now=new Date()) {
  const hour=Number(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).find(part=>part.type==='hour').value);
  const open=hour>=11&&hour<13;
  return {open,timeZone:'Europe/Paris',schedule:'Tous les jours · 11:00 AM à 1:00 PM',message:open?'':CLOSED_MESSAGE};
}
module.exports={openingHours,CLOSED_MESSAGE};
