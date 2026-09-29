const crypto=require('node:crypto');
const {openingHours,CLOSED_MESSAGE}=require('./opening-hours.cjs');
const {validateOrder,HttpError}=require('./order-validation.cjs');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
class OrderService {
  constructor({store,stripe,baseUrl,now=()=>new Date()}){this.store=store;this.stripe=stripe;this.baseUrl=baseUrl;this.now=now;}
  async create(body,token){
    if(!/^[a-f0-9]{64}$/.test(token||''))throw new HttpError(400,'Jeton de commande invalide.');
    const data=validateOrder(body);const id=hash(`daily:${body.requestId}`).slice(0,28);const fingerprint=hash(JSON.stringify(data));
    const now=this.now();
    const order={...data,outsideOpeningHours:!openingHours(now).open,id,reference:`DC-${id.slice(0,8).toUpperCase()}`,lifecycle:'active',paymentStatus:'pending',paymentState:data.paymentMethod==='online'?'awaiting_payment':'pay_on_collection',createdAt:now.toISOString()};
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
  summary(order){return {id:order.id,reference:order.reference,lifecycle:order.lifecycle||'active',paymentStatus:order.paymentStatus,paymentState:order.paymentState,totalPrice:order.totalPrice,mode:order.mode,paymentMethod:order.paymentMethod,createdAt:order.createdAt,outsideOpeningHours:order.outsideOpeningHours===true,openingWarning:order.outsideOpeningHours?CLOSED_MESSAGE:''};}
  async status(id,token){return this.summary(await this.authorized(id,token));}
  async checkout(id,token){
    const order=await this.authorized(id,token);
    if(order.lifecycle&&order.lifecycle!=='active')throw new HttpError(409,'Cette commande est en cours de traitement ou déjà clôturée.');
    if(order.paymentStatus==='paid')return {paid:true};
    if(order.paymentMethod!=='online')throw new HttpError(409,'Cette commande est à régler au retrait ou à la livraison.');
    if(!this.stripe)throw new HttpError(503,'Le paiement en ligne est momentanément indisponible.');
    const session=await this.ensureSession(order);
    if(session.status==='open')return {url:session.url};
    if(session.payment_status==='paid')return {awaitingConfirmation:true};
    throw new HttpError(409,'Cette session de paiement est terminée. Contactez le restaurant avec votre référence avant de recommander.');
  }
  async ensureSession(order){
    const id=order.id;
    if(order.stripeSessionId)return this.stripe.checkout.sessions.retrieve(order.stripeSessionId);
    const session=await this.stripe.checkout.sessions.create({
      mode:'payment',payment_method_types:['card'],client_reference_id:id,customer_email:order.customer.email,
      line_items:[{price_data:{currency:order.currency,product_data:{name:`Daily Chicken Pizza · ${order.reference}`,description:`${order.items.reduce((n,i)=>n+i.quantity,0)} articles · ${order.mode==='delivery'?'Livraison':'À emporter'} · remises incluses`},unit_amount:order.amountTotal},quantity:1}],
      metadata:{orderId:id},success_url:`${this.baseUrl}/menu.html?payment=return&orderId=${id}`,cancel_url:`${this.baseUrl}/menu.html?payment=cancelled&orderId=${id}`
    },{idempotencyKey:`daily-checkout-${id}`});
    await this.store.setSession(id,session);return session;
  }
  async preventPayment(order){
    if(order.paymentMethod!=='online')return;
    if(!this.stripe)throw new HttpError(503,'Stripe doit être disponible pour sécuriser l’annulation.');
    // Same Stripe idempotency key as Checkout: an in-flight creation cannot produce a second payable session.
    let session=await this.ensureSession(order);
    if(session.payment_status==='paid'||session.status==='complete')throw new HttpError(409,'Paiement reçu ou en cours de confirmation. Attendez la mise à jour Stripe.');
    if(session.status==='open'){
      try{session=await this.stripe.checkout.sessions.expire(session.id);}
      catch{session=await this.stripe.checkout.sessions.retrieve(session.id);}
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
