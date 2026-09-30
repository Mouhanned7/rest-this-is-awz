const crypto=require('node:crypto');
const {openingHours,CLOSED_MESSAGE}=require('./opening-hours.cjs');
const {validateOrder,HttpError}=require('./order-validation.cjs');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
class OrderService {
  constructor({store,stripe,legacyStripe,baseUrl,allowTestCheckout=true,now=()=>new Date(),getOpening=async date=>openingHours(date)}){this.store=store;this.stripe=stripe;this.legacyStripe=legacyStripe;this.baseUrl=baseUrl;this.allowTestCheckout=allowTestCheckout;this.now=now;this.getOpening=getOpening;}
  paymentClient(sessionId){return sessionId?.startsWith('cs_test_')&&this.legacyStripe?this.legacyStripe:this.stripe;}
  async create(body,token){
    const now=this.now(),opening=await this.getOpening(now);
    if(!opening.open)throw new HttpError(409,CLOSED_MESSAGE);
    if(!/^[a-f0-9]{64}$/.test(token||''))throw new HttpError(400,'Jeton de commande invalide.');
    const data=validateOrder(body);const id=hash(`daily:${body.requestId}`).slice(0,28);const fingerprint=hash(JSON.stringify(data));
    const outsideOpeningHours=!(opening.scheduledOpen??opening.open);
    const order={...data,outsideOpeningHours,openingOverride:outsideOpeningHours&&opening.allowOutsideHours===true,id,reference:`DC-${id.slice(0,8).toUpperCase()}`,lifecycle:'active',paymentStatus:'pending',paymentState:data.paymentMethod==='online'?'awaiting_payment':'pay_on_collection',createdAt:now.toISOString()};
    const result=await this.store.create(id,order,{tokenHash:hash(token),fingerprint});
    if(!safeEqual(result.secret?.tokenHash,hash(token))||result.secret?.fingerprint!==fingerprint)throw new HttpError(409,'Cette requête correspond déjà à une autre commande.');
    return this.summary(result.order);
  }
  async authorized(id,token){
    if(!/^[a-f0-9]{28}$/.test(id)||!/^[a-f0-9]{64}$/.test(token||''))throw new HttpError(404,'Commande introuvable.');
    const result=await this.store.get(id);
    if(!result||!safeEqual(result.secret?.tokenHash,hash(token)))throw new HttpError(404,'Commande introuvable.');
    return result.order;
  }
  summary(order){return {id:order.id,reference:order.reference,lifecycle:order.lifecycle||'active',paymentStatus:order.paymentStatus,paymentState:order.paymentState,totalPrice:order.totalPrice,mode:order.mode,paymentMethod:order.paymentMethod,createdAt:order.createdAt,outsideOpeningHours:order.outsideOpeningHours===true,openingWarning:order.outsideOpeningHours?(order.openingOverride?'Commande acceptée : les commandes hors horaires sont autorisées.':CLOSED_MESSAGE):''};}
  async status(id,token,sessionId){
    try{return this.summary(await this.authorized(id,token));}
    catch(error){
      if(error.status!==404||!this.stripe||typeof sessionId!=='string'||!/^cs_[a-zA-Z0-9_-]{8,240}$/.test(sessionId)||!/^[a-f0-9]{28}$/.test(id)||!/^[a-f0-9]{64}$/.test(token||''))throw error;
      // The paid transaction stays at Stripe after the restaurant's local archival.
      const session=await this.paymentClient(sessionId).checkout.sessions.retrieve(sessionId);
      if(session.metadata?.orderId!==id||session.client_reference_id!==id||!safeEqual(session.metadata?.customerTokenHash,hash(token)))throw new HttpError(404,'Commande introuvable.');
      const lifecycle=session.metadata?.dailyLifecycle;
      if(!['confirmed','cancelled'].includes(lifecycle))throw error;
      return {id,reference:`DC-${id.slice(0,8).toUpperCase()}`,lifecycle,paymentStatus:session.payment_status==='paid'?'paid':'pending',paymentState:session.payment_status==='paid'?'paid':'expired',totalPrice:session.amount_total/100,mode:session.metadata.dailyMode||'pickup',paymentMethod:'online'};
    }
  }
  async checkout(id,token){
    const order=await this.authorized(id,token);
    if(order.lifecycle&&order.lifecycle!=='active')throw new HttpError(409,'Cette commande est en cours de traitement ou déjà clôturée.');
    if(order.paymentStatus==='paid')return {paid:true};
    if(!(await this.getOpening(this.now())).open)throw new HttpError(409,CLOSED_MESSAGE);
    if(order.paymentMethod!=='online')throw new HttpError(409,'Cette commande est à régler au retrait ou à la livraison.');
    if(!this.stripe)throw new HttpError(503,'Le paiement en ligne est momentanément indisponible.');
    if(!this.allowTestCheckout&&order.stripeSessionId?.startsWith('cs_test_'))throw new HttpError(409,'Cette ancienne commande de démonstration ne peut pas être payée. Passez une nouvelle commande.');
    const session=await this.ensureSession(order);
    if(session.status==='open')return {url:session.url,sessionId:session.id};
    if(session.payment_status==='paid')return {awaitingConfirmation:true};
    throw new HttpError(409,'Cette session de paiement est terminée. Contactez le restaurant avec votre référence avant de recommander.');
  }
  async ensureSession(order){
    const id=order.id;
    if(order.stripeSessionId)return this.paymentClient(order.stripeSessionId).checkout.sessions.retrieve(order.stripeSessionId);
    const secret=(await this.store.get(id))?.secret;
    const session=await this.stripe.checkout.sessions.create({
      mode:'payment',payment_method_types:['card'],client_reference_id:id,customer_email:order.customer.email,
      line_items:[{price_data:{currency:order.currency,product_data:{name:`Daily Chicken Pizza · ${order.reference}`,description:`${order.items.reduce((n,i)=>n+i.quantity,0)} articles · ${order.mode==='delivery'?'Livraison':'À emporter'} · remises incluses`},unit_amount:order.amountTotal},quantity:1}],
      metadata:{orderId:id,customerTokenHash:secret?.tokenHash||'',dailyMode:order.mode},success_url:`${this.baseUrl}/menu.html?payment=return&orderId=${id}&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${this.baseUrl}/menu.html?payment=cancelled&orderId=${id}`
    },{idempotencyKey:`daily-checkout-${id}`});
    await this.store.setSession(id,session);return session;
  }
  async preventPayment(order){
    if(order.paymentMethod!=='online')return;
    if(!this.stripe)throw new HttpError(503,'Stripe doit être disponible pour sécuriser l’annulation.');
    // Same Stripe idempotency key as Checkout: an in-flight creation cannot produce a second payable session.
    let session=await this.ensureSession(order);
    const stripe=this.paymentClient(session.id);
    if(session.payment_status==='paid'||session.status==='complete')throw new HttpError(409,'Paiement reçu ou en cours de confirmation. Attendez la mise à jour Stripe.');
    if(session.status==='open'){
      try{session=await stripe.checkout.sessions.expire(session.id);}
      catch{session=await stripe.checkout.sessions.retrieve(session.id);}
    }
    if(session.status!=='expired'||session.payment_status==='paid')throw new HttpError(409,'Le paiement est en cours. Annulation refusée pour éviter un conflit.');
  }
  async webhook(event){
    const session=event.data?.object;const id=session?.metadata?.orderId;
    const states={'checkout.session.completed':session?.payment_status==='paid'?'paid':null,'checkout.session.async_payment_succeeded':'paid','checkout.session.async_payment_failed':'failed','checkout.session.expired':'expired'};
    const state=states[event.type];if(!state||!id)return;
    await this.store.applyEvent(id,event.id,session,state);
  }
}
module.exports={OrderService,hash};
