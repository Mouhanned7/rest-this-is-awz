const {FieldValue}=require('firebase-admin/firestore');
const {firebase}=require('./firebase.cjs');
const {HttpError}=require('./order-validation.cjs');
class FirestoreOrderStore {
  get db(){return firebase().db;}
  async create(id,order,secret){
    const db=this.db;const ref=db.collection('dailyOrders').doc(id);const privateRef=db.collection('dailyOrderSecrets').doc(id);
    return db.runTransaction(async tx=>{
      const existing=await tx.get(ref);
      if(existing.exists){const hidden=await tx.get(privateRef);return {order:existing.data(),secret:hidden.data()};}
      const archive=await tx.get(db.collection('dailyOrderArchive').doc(id));
      if(archive.exists){const hidden=await tx.get(privateRef);return {order:archive.data(),secret:hidden.data()};}
      tx.create(ref,{...order,orderDate:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
      tx.create(privateRef,secret);
      return {order,secret};
    });
  }
  async get(id){const db=this.db;const [order,secret]=await Promise.all([db.collection('dailyOrders').doc(id).get(),db.collection('dailyOrderSecrets').doc(id).get()]);if(order.exists)return {order:order.data(),secret:secret.data()};const archived=await db.collection('dailyOrderArchive').doc(id).get();return archived.exists?{order:archived.data(),secret:secret.data()}:null;}
  async setSession(id,session){
    const ref=this.db.collection('dailyOrders').doc(id);
    await this.db.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists)return;if(doc.data().paymentStatus==='paid')return;tx.update(ref,{stripeSessionId:session.id,checkoutUrl:session.url,paymentState:'awaiting_payment',updatedAt:FieldValue.serverTimestamp()});});
  }
  async applyEvent(id,eventId,session,state){
    const db=this.db,ref=db.collection('dailyOrders').doc(id),eventRef=db.collection('dailyStripeEvents').doc(eventId);
    return db.runTransaction(async tx=>{
      const [doc,event]=await Promise.all([tx.get(ref),tx.get(eventRef)]);
      if(event.exists)return false;
      const archive=!doc.exists?await tx.get(db.collection('dailyOrderArchive').doc(id)):null;
      if(!doc.exists&&!archive?.exists)throw new HttpError(404,'Commande Stripe inconnue.');
      const order=doc.exists?doc.data():archive.data();
      if(session.client_reference_id!==id||session.metadata?.orderId!==id||session.amount_total!==order.amountTotal||session.currency!==order.currency)throw new HttpError(400,'Montant ou référence Stripe incohérent.');
      if(order.stripeSessionId&&order.stripeSessionId!==session.id)throw new HttpError(400,'Session Stripe incohérente.');
      if(state==='paid'&&session.payment_status!=='paid')return false;
      if(archive?.exists){
        if(state==='paid'&&order.lifecycle==='cancelled')throw new HttpError(409,'Paiement inattendu sur une commande annulée : vérification requise.');
        tx.create(eventRef,{orderId:id,type:state,processedAt:FieldValue.serverTimestamp()});return false;
      }
      if(order.paymentStatus!=='paid'){
        const update={paymentState:state,stripeSessionId:session.id,updatedAt:FieldValue.serverTimestamp()};
        if(state==='paid')Object.assign(update,{paymentStatus:'paid',paidAt:FieldValue.serverTimestamp(),stripePaymentIntent:typeof session.payment_intent==='string'?session.payment_intent:null});
        tx.update(ref,update);
      }
      tx.create(eventRef,{orderId:id,type:state,processedAt:FieldValue.serverTimestamp()});return true;
    });
  }
}
module.exports={FirestoreOrderStore};
