const {HttpError}=require('./order-validation.cjs');
class OwnerActions {
  constructor({store,orders,email}){Object.assign(this,{store,orders,email});}
  async perform(id,action,actor){
    if(!/^[a-f0-9]{28}$/.test(id)||!['confirm','cancel'].includes(action))throw new HttpError(400,'Action invalide.');
    const claim=await this.store.claim(id,action,actor);
    if(claim.done)return {ok:true,lifecycle:claim.order.lifecycle};
    const {operation:op,order}=claim;
    try{
      if(action==='cancel'&&!op.cancellationVerified){
        await this.orders.preventPayment(order);
        const current=await this.store.get(id);if(current.order.paymentStatus==='paid')throw new HttpError(409,'Paiement confirmé entre-temps : annulation refusée.');
        await this.store.progress(id,op.lease,{cancellationVerified:true});
      }
      if(!op.emailId){
        // Persist SMTP acceptance before archival; an interrupted acknowledgement may be retried.
        if(!op.emailAttemptAt)await this.store.progress(id,op.lease,{emailAttemptAt:Date.now()});
        const emailId=await this.email.send(order,action);await this.store.progress(id,op.lease,{emailId});
      }
      const archived=await this.store.finish(id,op.lease);return {ok:true,lifecycle:archived.lifecycle};
    }catch(error){await this.store.release(id,op.lease,error.status===409);throw error;}
  }
  async retryPending({limit=50}={}){const result={attempted:0,completed:0,pending:0};for(const op of await this.store.pending(limit)){result.attempted++;try{await this.perform(op.orderId,op.action,op.actor);result.completed++;}catch(error){result.pending++;console.error('Daily owner action pending',error.status||503);}}return result;}
}
module.exports={OwnerActions};
