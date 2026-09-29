const {initializeApp,getApps,cert,applicationDefault} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getAuth} = require('firebase-admin/auth');
function configured(env=process.env){return !!(env.FIREBASE_PROJECT_ID&&((env.FIREBASE_CLIENT_EMAIL&&env.FIREBASE_PRIVATE_KEY)||env.GOOGLE_APPLICATION_CREDENTIALS||env.FIRESTORE_EMULATOR_HOST));}
function firebase(){
  const name='daily-orders-server';
  let app=getApps().find(app=>app.name===name);
  if(!app){
    const env=process.env;if(!configured(env))throw new Error('Firebase serveur non configuré.');
    const options={projectId:env.FIREBASE_PROJECT_ID};
    if(env.FIREBASE_CLIENT_EMAIL&&env.FIREBASE_PRIVATE_KEY)options.credential=cert({projectId:env.FIREBASE_PROJECT_ID,clientEmail:env.FIREBASE_CLIENT_EMAIL,privateKey:env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')});
    else if(!env.FIRESTORE_EMULATOR_HOST)options.credential=applicationDefault();
    app=initializeApp(options,name);
  }
  return {db:getFirestore(app),auth:getAuth(app)};
}
module.exports={firebase,configured};
