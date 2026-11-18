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
  // Reçu envoyé par le serveur au moment du paiement : on réserve l'envoi (verrou de 90 s)
  // seulement pour une commande active, pas encore payée, dont le paiement Stripe est réel.
  // Une seule notification Stripe peut donc envoyer le reçu, même si Stripe la renvoie.
  async claimReceiptOnPayment(id,session){
    const db=this.db,ref=db.collection('dailyOrders').doc(id),receiptRef=db.collection('dailyPaymentEmails').doc(id);
    return db.runTransaction(async tx=>{
      const [doc,receipt]=await Promise.all([tx.get(ref),tx.get(receiptRef)]);
      if(!doc.exists)return null; // archivée ou annulée : jamais de reçu
      const order=doc.data();
      if(order.paymentStatus==='paid'||(order.lifecycle&&order.lifecycle!=='active'))return null;
      if(session?.payment_status!=='paid'||session.client_reference_id!==id||session.amount_total!==order.amountTotal||session.currency!==order.currency)return null;
      if(order.stripeSessionId&&order.stripeSessionId!==session.id)return null;
      if(receipt.exists&&(receipt.data().emailId||receipt.data().leaseUntil>Date.now()))return null;
      const lease=`webhook-${session.id}-${Date.now()}`;
      tx.set(receiptRef,{lease,leaseUntil:Date.now()+90000,orderId:id});
      return {order:{...order,id},lease};
    });
  }
  async applyEvent(id,eventId,session,state,receipt=null){
    const db=this.db,ref=db.collection('dailyOrders').doc(id),eventRef=db.collection('dailyStripeEvents').doc(eventId),receiptRef=db.collection('dailyPaymentEmails').doc(id);
    return db.runTransaction(async tx=>{
      const [doc,event,receiptDoc]=await Promise.all([tx.get(ref),tx.get(eventRef),tx.get(receiptRef)]);
      // Reçu envoyé (ou tenté) pendant cette notification : on l'enregistre dans la même transaction.
      const ours=!!receipt&&receiptDoc.exists&&receiptDoc.data().lease===receipt.lease&&!receiptDoc.data().emailId;
      const sent=ours&&!!receipt.emailId;
      const recordReceipt=()=>{
        if(!ours)return;
        if(sent)tx.update(receiptRef,{emailId:receipt.emailId,leaseUntil:0,acceptedAt:FieldValue.serverTimestamp()});
        else tx.update(receiptRef,{leaseUntil:0}); // échec : la caisse pourra réessayer comme aujourd'hui
      };
      if(event.exists){recordReceipt();if(sent&&doc.exists)tx.update(ref,{paymentEmailStatus:'accepted',paymentEmailAt:FieldValue.serverTimestamp()});return false;}
      const archive=!doc.exists?await tx.get(db.collection('dailyOrderArchive').doc(id)):null;
      // A late/retried signed webhook must not recreate records after local archival.
      if(!doc.exists&&!archive?.exists)return false;
      const order=doc.exists?doc.data():archive.data();
      if(session.client_reference_id!==id||session.metadata?.orderId!==id||session.amount_total!==order.amountTotal||session.currency!==order.currency)throw new HttpError(400,'Montant ou référence Stripe incohérent.');
      if(order.stripeSessionId&&order.stripeSessionId!==session.id)throw new HttpError(400,'Session Stripe incohérente.');
      if(state==='paid'&&session.payment_status!=='paid')return false;
      if(archive?.exists){
        if(state==='paid'&&order.lifecycle==='cancelled')throw new HttpError(409,'Paiement inattendu sur une commande annulée : vérification requise.');
        recordReceipt();tx.create(eventRef,{orderId:id,type:state,processedAt:FieldValue.serverTimestamp()});return false;
      }
      if(order.paymentStatus!=='paid'){
        const update={paymentState:state,stripeSessionId:session.id,updatedAt:FieldValue.serverTimestamp()};
        if(state==='paid')Object.assign(update,{paymentStatus:'paid',paidAt:FieldValue.serverTimestamp(),stripePaymentIntent:typeof session.payment_intent==='string'?session.payment_intent:null});
        // « payée » et « reçu envoyé » écrits ensemble : la caisse ne voit jamais l'un sans l'autre.
        if(state==='paid'&&sent)Object.assign(update,{paymentEmailStatus:'accepted',paymentEmailAt:FieldValue.serverTimestamp()});
        tx.update(ref,update);
      }else if(sent)tx.update(ref,{paymentEmailStatus:'accepted',paymentEmailAt:FieldValue.serverTimestamp()});
      recordReceipt();
      tx.create(eventRef,{orderId:id,type:state,processedAt:FieldValue.serverTimestamp()});return true;
    });
  }
}
module.exports={FirestoreOrderStore};
