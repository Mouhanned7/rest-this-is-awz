const Stripe=require('stripe');
const {ActionStore}=require('./action-store.cjs');
const {OrderService}=require('./order-service.cjs');
const {OwnerActions}=require('./owner-actions.cjs');
const {OrderEmail}=require('./integrations.cjs');
async function retry({limit=50}={}){
  const store=new ActionStore();
  const orders=new OrderService({store,stripe:process.env.STRIPE_SECRET_KEY?new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:10000,maxNetworkRetries:1}):null,baseUrl:(process.env.PUBLIC_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'')});
  return new OwnerActions({store,orders,email:new OrderEmail()}).retryPending({limit});
}
module.exports={retry};
