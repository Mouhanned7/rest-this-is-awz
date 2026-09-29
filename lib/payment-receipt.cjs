const crypto=require('node:crypto');
const {firebase}=require('./firebase.cjs');
const {FieldValue}=require('firebase-admin/firestore');
const {HttpError}=require('./order-validation.cjs');
class ReceiptStore {
  get db(){return firebase().db;}
  async claim(id){
    const db=this.db,ref=db.collection('dailyPaymentEmails').doc(id);
    return db.runTransaction(async tx=>{
      const active=db.collection('dailyOrders').doc(id),archive=db.collection('dailyOrderArchive').doc(id);
      const [live,closed,receipt]=await Promise.all([tx.get(active),tx.get(archive),tx.get(ref)]);
      const order=live.exists?live.data():closed.exists?closed.data():null;
      if(!order)throw new HttpError(404,'Commande introuvable.');
      if(order.paymentStatus!=='paid')throw new HttpError(409,'Le paiement Stripe doit être confirmé avant l’envoi du reçu.');
      if(receipt.exists&&receipt.data().emailId)return {done:true};
      if(receipt.exists&&receipt.data().leaseUntil>Date.now())throw new HttpError(409,'Envoi du reçu en cours. Réessayez dans un instant.');
      const lease=crypto.randomUUID();tx.set(ref,{lease,leaseUntil:Date.now()+90000,orderId:id});
      return {order,lease};
    });
  }
  async complete(id,lease,emailId){
    const db=this.db,ref=db.collection('dailyPaymentEmails').doc(id);
    return db.runTransaction(async tx=>{
      const active=db.collection('dailyOrders').doc(id),archive=db.collection('dailyOrderArchive').doc(id);
      const [receipt,live,closed]=await Promise.all([tx.get(ref),tx.get(active),tx.get(archive)]);
      if(!receipt.exists||receipt.data().lease!==lease)throw new HttpError(409,'Reçu repris ailleurs.');
      tx.update(ref,{emailId,leaseUntil:0,acceptedAt:FieldValue.serverTimestamp()});
      if(live.exists||closed.exists)tx.update(live.exists?active:archive,{paymentEmailStatus:'accepted',paymentEmailAt:FieldValue.serverTimestamp()});
    });
  }
  async release(id,lease){
    const ref=this.db.collection('dailyPaymentEmails').doc(id);
    await this.db.runTransaction(async tx=>{const d=await tx.get(ref);if(d.exists&&d.data().lease===lease&&!d.data().emailId)tx.update(ref,{leaseUntil:0});});
  }
}
class PaymentReceipt {
  constructor({store=new ReceiptStore(),email}){Object.assign(this,{store,email});}
  async perform(id){
    if(!/^[a-f0-9]{28}$/.test(id))throw new HttpError(400,'Commande invalide.');
    const claim=await this.store.claim(id);if(claim.done)return {ok:true,status:'accepted'};
    try{const emailId=await this.email.send(claim.order,'paid');await this.store.complete(id,claim.lease,emailId);return {ok:true,status:'accepted'};}
    catch(error){await this.store.release(id,claim.lease);throw error;}
  }
}
module.exports={PaymentReceipt,ReceiptStore};
