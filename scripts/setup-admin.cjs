require('dotenv').config({quiet:true});
const {firebase}=require('../lib/firebase.cjs');
(async()=>{
  const email=process.env.ADMIN_EMAIL,password=process.env.ADMIN_INITIAL_PASSWORD;
  if(!email||!password||password.length<6)throw new Error('Renseignez ADMIN_EMAIL et ADMIN_INITIAL_PASSWORD (6 caractères minimum, ou davantage selon la politique Firebase) dans .env.');
  const {auth}=firebase();let user;
  try{user=await auth.getUserByEmail(email);}
  catch(error){if(error.code!=='auth/user-not-found')throw error;user=await auth.createUser({email,password,displayName:'Daily Chicken — Responsable'});}
  // Existing accounts keep their password; only the explicit restaurant role is added.
  await auth.setCustomUserClaims(user.uid,{...(user.customClaims||{}),dailyAdmin:true});
  console.log('Compte responsable autorisé. Reconnectez-vous dans Daily Orders. Le mot de passe existant, le cas échéant, est conservé.');
})().catch(error=>{
  if(error.code==='auth/configuration-not-found')console.error('Firebase Authentication n’est pas initialisé. Dans Firebase → Authentication → Commencer, activer E-mail/Mot de passe, puis relancer npm run admin:setup.');
  else console.error(error.code||error.message);
  process.exitCode=1;
});
