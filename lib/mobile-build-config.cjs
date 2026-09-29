const publicNames=['FIREBASE_PROJECT_ID','FIREBASE_API_KEY','FIREBASE_ANDROID_API_KEY','FIREBASE_MESSAGING_SENDER_ID','FIREBASE_STORAGE_BUCKET','FIREBASE_ANDROID_APP_ID','FIREBASE_IOS_APP_ID','FIREBASE_IOS_BUNDLE_ID','FIREBASE_WEB_APP_ID','FIREBASE_AUTH_DOMAIN'];
function mobileConfig(env,{release=false}={}){
  const data=Object.fromEntries(publicNames.map(name=>[name,env[name]||'']));
  data.DAILY_API_BASE_URL=env.PUBLIC_BASE_URL||'';
  const missing=['FIREBASE_PROJECT_ID','FIREBASE_API_KEY','FIREBASE_MESSAGING_SENDER_ID'].filter(name=>!data[name]);
  const problems=missing.map(name=>`${name} manquant`);
  if(release){
    if(!new RegExp(`^1:${data.FIREBASE_MESSAGING_SENDER_ID}:android:[a-f0-9]+$`).test(data.FIREBASE_ANDROID_APP_ID))problems.push('FIREBASE_ANDROID_APP_ID : enregistrer Android (fr.dailychicken.daily_orders) dans Firebase ; un appId web ne convient pas');
    let url;try{url=new URL(data.DAILY_API_BASE_URL);}catch{}
    const host=url?.hostname||'';
    if(!url||url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!host.includes('.')||/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)||host.endsWith('.local')||host.endsWith('.localhost'))problems.push('PUBLIC_BASE_URL : renseigner le domaine HTTPS Vercel accessible au téléphone');
    else data.DAILY_API_BASE_URL=url.origin;
  }
  if(problems.length)throw new Error('Configuration mobile incomplète :\n- '+problems.join('\n- '));
  return data;
}
module.exports={mobileConfig};
