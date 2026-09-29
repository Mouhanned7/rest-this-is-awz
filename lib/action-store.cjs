const crypto=require('node:crypto');
const {FieldValue}=require('firebase-admin/firestore');
const {FirestoreOrderStore}=require('./order-store.cjs');
const {HttpError}=require('./order-validation.cjs');
class ActionStore extends FirestoreOrderStore {
  async claim(id,action,actor){
    const db=this.db,ref=db.collection('dailyOrders').doc(id),opRef=db.collection('dailyOperations').doc(id),archiveRef=db.collection('dailyOrderArchive').doc(id);
    const result=await db.runTransaction(async tx=>{
      const [doc,opDoc,archive]=await Promise.all([tx.get(ref),tx.get(opRef),tx.get(archiveRef)]);
      if(archive.exists){if(archive.data().action!==action)throw new HttpError(409,'Cette commande est déjà traitée.');return {done:true,order:archive.data()};}
      if(!doc.exists)throw new HttpError(404,'Commande introuvable.');
      const order=doc.data(),existing=opDoc.exists?opDoc.data():null;
      if(order.paymentStatus==='paid'&&existing?.action==='cancel'&&!existing.emailId){
        tx.delete(opRef);tx.update(ref,{lifecycle:'active',ownerAction:FieldValue.delete()});return {paymentWonRace:true};
      }
      if(action==='confirm'&&order.paymentStatus!=='paid')throw new HttpError(409,'La commande doit être payée avant confirmation.');
      if(action==='cancel'&&order.paymentStatus==='paid')throw new HttpError(409,'Une commande payée ne peut pas être annulée ici.');
      if(existing&&existing.action!==action)throw new HttpError(409,'Une autre action est déjà en cours.');
      if(existing?.leaseUntil>Date.now())throw new HttpError(409,'Traitement en cours. Réessayez dans un instant.');
      const operation={...(existing||{action,actor,startedAt:Date.now(),orderId:id}),lease:crypto.randomUUID(),leaseUntil:Date.now()+90000};
      tx.set(opRef,operation);tx.update(ref,{lifecycle:'processing',ownerAction:action,updatedAt:FieldValue.serverTimestamp()});
      return {order,operation};
    });
    if(result.paymentWonRace)throw new HttpError(409,'Le paiement a été confirmé. Réessayez avec la confirmation de commande.');
    return result;
  }
  async progress(id,lease,values){
    const ref=this.db.collection('dailyOperations').doc(id);
    await this.db.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists||doc.data().lease!==lease)throw new HttpError(409,'Cette action est déjà reprise ailleurs.');tx.update(ref,values);});
  }
  async release(id,lease,reset=false){
    const db=this.db,ref=db.collection('dailyOperations').doc(id),orderRef=db.collection('dailyOrders').doc(id);
    await db.runTransaction(async tx=>{const [doc,order]=await Promise.all([tx.get(ref),tx.get(orderRef)]);if(!doc.exists||doc.data().lease!==lease)return;if(reset&&!doc.data().emailId){tx.delete(ref);if(order.exists)tx.update(orderRef,{lifecycle:'active',ownerAction:FieldValue.delete()});}else tx.update(ref,{leaseUntil:0});});
  }
  async finish(id,lease){
    const db=this.db,ref=db.collection('dailyOrders').doc(id),opRef=db.collection('dailyOperations').doc(id),archiveRef=db.collection('dailyOrderArchive').doc(id);
    return db.runTransaction(async tx=>{
      const [doc,operation]=await Promise.all([tx.get(ref),tx.get(opRef)]);
      if(!doc.exists||!operation.exists||operation.data().lease!==lease)throw new HttpError(409,'Traitement déjà repris.');
      const op=operation.data(),order=doc.data();
      if(!op.emailId)throw new HttpError(409,'Traitement incomplet.');
      if(op.action==='cancel'&&order.paymentStatus==='paid')throw new HttpError(409,'Le paiement vient d’être confirmé.');
      const archived={...order,lifecycle:op.action==='confirm'?'confirmed':'cancelled',action:op.action,processedBy:op.actor,emailId:op.emailId,processedAt:FieldValue.serverTimestamp()};
      delete archived.checkoutUrl;
      tx.create(archiveRef,archived);tx.delete(ref);tx.delete(opRef);return archived;
    });
  }
  async pending(limit=50){const docs=await this.db.collection('dailyOperations').where('leaseUntil','<',Date.now()).orderBy('leaseUntil').limit(Math.max(1,Math.min(50,limit))).get();return docs.docs.map(d=>d.data());}
}
module.exports={ActionStore};
