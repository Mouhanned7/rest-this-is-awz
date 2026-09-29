require('dotenv').config({quiet:true});
const {configured}=require('../lib/firebase.cjs');
const {emailConfigured}=require('../lib/integrations.cjs');
const e=process.env;
console.log('État de configuration (aucune valeur secrète affichée)');
for(const [label,ready] of Object.entries({
  'Clé Stripe':!!e.STRIPE_SECRET_KEY,
  'Secret webhook présent (validité à vérifier)':!!e.STRIPE_WEBHOOK_SECRET,
  'Accès serveur Firebase':configured(e),
  'E-mails SMTP':emailConfigured(e),
  'Application Android Firebase':!!(e.FIREBASE_API_KEY&&e.FIREBASE_ANDROID_APP_ID&&e.FIREBASE_MESSAGING_SENDER_ID&&e.FIREBASE_PROJECT_ID),
  'Identifiants responsable renseignés':!!(e.ADMIN_EMAIL&&e.ADMIN_INITIAL_PASSWORD),
  'Commandes en ligne activées':e.ONLINE_ORDERING_ENABLED==='true',
}))console.log(`${ready?'OK':'À compléter'} · ${label}`);
