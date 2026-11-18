const {openingHours}=require('./opening-hours.cjs');

// Règle unique : ouvert de 11h à 1h du matin (heure de Paris), fermé le reste du temps.
// Aucun réglage ne peut forcer l'ouverture : l'ancien champ Firebase allowOutsideHours est ignoré.
// `readSettings` n'est plus lu ; le paramètre est conservé pour ne pas casser les appels existants.
function createOrderingHours() {
  return async(now=new Date())=>{
    const scheduled=openingHours(now);
    return {...scheduled,scheduledOpen:scheduled.open,allowOutsideHours:false};
  };
}
module.exports={createOrderingHours};
