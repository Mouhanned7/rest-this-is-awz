const express=require('express');
const crypto=require('node:crypto');
const {createApi}=require('./api.cjs');
const {configured}=require('./firebase.cjs');
const {emailConfigured}=require('./integrations.cjs');

function createServerlessApp({env=process.env,apiOptions={},retry}={}) {
  const app=express();
  app.disable('x-powered-by');
  // Vercel supplies the client address through its trusted edge proxy.
  if(env.VERCEL==='1')app.set('trust proxy',1);
  // Optional Vercel Cron entry point. Never start an unawaited interval in a function.
  app.get('/api/internal/retry-orders',async(req,res)=>{
    res.set('Cache-Control','no-store');
    const expected=env.CRON_SECRET;
    const supplied=(req.get('Authorization')||'').match(/^Bearer\s+(\S+)$/i)?.[1]||'';
    if(!expected||expected.length<32)return res.status(503).json({error:'Reprise planifiée non configurée.'});
    const left=crypto.createHash('sha256').update(expected).digest();
    const right=crypto.createHash('sha256').update(supplied).digest();
    if(!crypto.timingSafeEqual(left,right))return res.status(401).json({error:'Accès refusé.'});
    if(!configured(env)||!emailConfigured(env))return res.status(503).json({error:'Services non configurés.'});
    try {
      // One durable operation per invocation fits the function budget. The owner can also retry directly.
      const result=await (retry||require('./retry-actions.cjs').retry)({limit:1});
      return res.json({ok:true,...result});
    }catch(error){console.error('Daily retry unavailable',error.code||error.name);return res.status(503).json({error:'Reprise indisponible. Réessayez.'});}
  });
  // No JSON parser here: the API verifies Stripe signatures over the raw body first.
  app.use('/api',createApi({env,...apiOptions}));
  app.use((req,res)=>res.status(404).json({error:'Adresse introuvable.'}));
  return app;
}
module.exports={createServerlessApp};
