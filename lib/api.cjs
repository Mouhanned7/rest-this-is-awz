const express=require('express');
const {rateLimit}=require('express-rate-limit');
const Stripe=require('stripe');
const {configured}=require('./firebase.cjs');
const {ActionStore}=require('./action-store.cjs');
const {OwnerActions}=require('./owner-actions.cjs');
const {OrderEmail,emailConfigured}=require('./integrations.cjs');
const {firebase}=require('./firebase.cjs');
const {OrderService}=require('./order-service.cjs');
const {HttpError}=require('./order-validation.cjs');
const {PaymentReceipt}=require('./payment-receipt.cjs');
const {openingHours}=require('./opening-hours.cjs');
const {createOrderingHours}=require('./ordering-hours.cjs');
const {reverseAddress}=require('./geocoding.cjs');
const {ContactEmail,validateContact}=require('./contact-email.cjs');
const {ArchiveTransfer}=require('./archive-transfer.cjs');
function createApi({env=process.env,service:injectedService,ownerActions:injectedActions,verifyAdmin:injectedVerifyAdmin,paymentReceipt:injectedReceipt,contactEmail:injectedContact,archiveTransfer:injectedArchive,stripeClient:injectedStripe,getOpening:injectedOpening}={}) {
  const router=express.Router();
  const baseUrl=(env.PUBLIC_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
  const stripe=injectedStripe||(env.STRIPE_SECRET_KEY?new Stripe(env.STRIPE_SECRET_KEY,{timeout:10000,maxNetworkRetries:1}):null);
  const legacyStripe=env.STRIPE_LEGACY_TEST_SECRET_KEY?.startsWith('sk_test_')?new Stripe(env.STRIPE_LEGACY_TEST_SECRET_KEY,{timeout:10000,maxNetworkRetries:1}):null;
  const localPreview=['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname);
  const store=new ActionStore();
  const getOpening=injectedOpening||(configured(env)?createOrderingHours():async now=>openingHours(now));
  const service=injectedService||new OrderService({store,stripe,legacyStripe,baseUrl,allowTestCheckout:localPreview,getOpening});
  const actions=injectedActions||new OwnerActions({store,orders:service,email:new OrderEmail(env)});
  const receipts=injectedReceipt||new PaymentReceipt({email:new OrderEmail(env)});
  const archives=injectedArchive||new ArchiveTransfer({stripe,legacyStripe});
  const ready=()=>env.ONLINE_ORDERING_ENABLED==='true'&&configured(env)&&emailConfigured(env);
  // A public restaurant must never send customers to a test checkout.
  let accountCheck=null,accountUntil=0;
  const payments=async()=>{
    if(!ready()||!stripe||!env.STRIPE_WEBHOOK_SECRET)return false;
    if(localPreview&&env.STRIPE_SECRET_KEY.startsWith('sk_test_'))return true;
    if(!env.STRIPE_SECRET_KEY.startsWith('sk_live_'))return false;
    if(!accountCheck||Date.now()>accountUntil){
      accountUntil=Date.now()+60000;
      accountCheck=stripe.accounts.retrieve().then(account=>account.charges_enabled===true).catch(()=>false);
    }
    return accountCheck;
  };
  const run=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
  const token=req=>(req.get('Authorization')||'').match(/^Bearer\s+(\S+)$/i)?.[1]||'';
  const verifyAdmin=injectedVerifyAdmin||asyncTokenVerifier;
  async function asyncTokenVerifier(value){let user;try{user=await firebase().auth.verifyIdToken(value,true);}catch{throw new HttpError(401,'Reconnectez-vous à votre compte responsable.');}if(user.dailyAdmin!==true)throw new HttpError(403,'Accès responsable requis.');return user.uid;}
  router.use((req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');next();});
  // Signature verification must receive the original bytes, before any JSON parser.
  router.post('/stripe/webhook',express.raw({type:'application/json',limit:'256kb'}),run(async(req,res)=>{
    if(!stripe||!env.STRIPE_WEBHOOK_SECRET||!configured(env))throw new HttpError(503,'Webhook non configuré.');
    let event;
    try {event=stripe.webhooks.constructEvent(req.body,req.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET);}
    catch {throw new HttpError(400,'Signature Stripe invalide.');}
    await service.webhook(event);res.json({received:true});
  }));
  router.use(express.json({limit:'64kb'}));
  router.use((req,res,next)=>{
    if(req.method==='POST'&&req.get('Origin')&&req.get('Origin')!==new URL(baseUrl).origin)return next(new HttpError(403,'Origine non autorisée.'));
    next();
  });
  router.use(rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Trop de demandes. Réessayez dans une minute.'}}));
  router.get('/public-config',run(async(req,res)=>{
    const [paymentsEnabled,opening]=await Promise.all([payments(),getOpening(new Date())]);
    res.json({orderingEnabled:ready(),paymentsEnabled,testMode:!!stripe&&env.STRIPE_SECRET_KEY.startsWith('sk_test_'),opening});
  }));
  router.post('/contact',rateLimit({windowMs:3600000,limit:5,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Vous avez déjà envoyé plusieurs messages. Réessayez dans une heure ou appelez-nous.'}}),run(async(req,res)=>{
    if(req.body?.website)return res.json({sent:true});
    const data=validateContact(req.body);
    res.json(await (injectedContact||new ContactEmail(env)).send(data));
  }));
  const requireReady=(req,res,next)=>ready()?next():next(new HttpError(503,'Les commandes en ligne seront bientôt disponibles. Appelez le 03 86 31 17 17.'));
  router.post('/orders',requireReady,rateLimit({windowMs:60000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Patientez une minute avant de recommencer.'}}),run(async(req,res)=>{
    if(req.body?.paymentMethod==='online'&&!await payments())throw new HttpError(503,'Paiement en ligne indisponible. Choisissez le règlement au retrait ou à la livraison.');
    res.status(201).json(await service.create(req.body,token(req)));
  }));
  router.get('/orders/:id',run(async(req,res)=>{if(!configured(env))throw new HttpError(503,'Suivi indisponible.');res.json(await service.status(req.params.id,token(req),req.query.sessionId));}));
  router.post('/orders/:id/checkout',requireReady,run(async(req,res)=>{if(!await payments())throw new HttpError(503,'Paiement en ligne indisponible.');res.json(await service.checkout(req.params.id,token(req)));}));
  router.post('/admin/orders/:id/payment-email',run(async(req,res)=>{
    await verifyAdmin(token(req));
    if(!emailConfigured(env))throw new HttpError(503,'Complétez le service e-mail avant l’envoi du reçu.');
    res.json(await receipts.perform(req.params.id));
  }));
  router.post('/admin/orders/:id/action',run(async(req,res)=>{
    const actor=await verifyAdmin(token(req));
    if(!emailConfigured(env))throw new HttpError(503,'Complétez le service e-mail avant de traiter les commandes.');
    res.json(await actions.perform(req.params.id,req.body?.action,actor));
  }));
  router.get('/admin/archives',run(async(req,res)=>{
    await verifyAdmin(token(req));res.json(await archives.list());
  }));
  router.post('/admin/archives/:id/ack',run(async(req,res)=>{
    await verifyAdmin(token(req));res.json(await archives.acknowledge(req.params.id,req.body?.digest));
  }));
  router.post('/location/reverse',rateLimit({windowMs:60000,limit:8,standardHeaders:'draft-8',legacyHeaders:false}),run(async(req,res)=>{
    const {latitude,longitude}=req.body||{};
    if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new HttpError(400,'Position invalide.');
    res.json(await reverseAddress(latitude,longitude,{env}));
  }));
  router.use((req,res)=>res.status(404).json({error:'Adresse API inconnue.'}));
  router.use((err,req,res,next)=>{
    const status=err instanceof HttpError?err.status:err.type==='entity.too.large'?413:err.type==='entity.parse.failed'?400:503;
    // Do not log request bodies, credentials or customer information.
    if(status===503)console.error('Daily API: service unavailable',err.code||err.name);
    res.status(status).json({error:err instanceof HttpError?err.message:status===400?'Requête invalide.':status===413?'Commande trop volumineuse.':'Service momentanément indisponible. Réessayez ou appelez le restaurant.'});
  });
  return router;
}
module.exports={createApi};
