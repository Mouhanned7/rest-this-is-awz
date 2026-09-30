const crypto=require('node:crypto');
const {firebase}=require('./firebase.cjs');
const {HttpError}=require('./order-validation.cjs');

function portable(value){
  if(value==null||typeof value!=='object')return value;
  if(typeof value.toDate==='function')return value.toDate().toISOString();
  if(value instanceof Date)return value.toISOString();
  if(Array.isArray(value))return value.map(portable);
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,portable(value[key])]));
}
function archiveDigest(order){return crypto.createHash('sha256').update(JSON.stringify(portable(order))).digest('hex');}
class ArchiveTransfer {
  constructor({stripe,legacyStripe}={}){this.stripe=stripe;this.legacyStripe=legacyStripe;}
  get db(){return firebase().db;}
  async list(){
    const result=await this.db.collection('dailyOrderArchive').limit(20).get();
    return {archives:result.docs.map(doc=>({id:doc.id,order:portable(doc.data()),digest:archiveDigest(doc.data())}))};
  }
  async acknowledge(id,digest){
    if(!/^[a-f0-9]{28}$/.test(id)||!/^[a-f0-9]{64}$/.test(digest||''))throw new HttpError(400,'Accusé de sauvegarde invalide.');
    const db=this.db;
    const [initial,live,secret]=await Promise.all([
      db.collection('dailyOrderArchive').doc(id).get(),db.collection('dailyOrders').doc(id).get(),db.collection('dailyOrderSecrets').doc(id).get()
    ]);
    if(live.exists)throw new HttpError(409,'Une commande encore active ne peut pas être effacée.');
    if(initial.exists){
      const order=initial.data();
      if(archiveDigest(order)!==digest||!['confirmed','cancelled'].includes(order.lifecycle)||!order.emailId)throw new HttpError(409,'Sauvegardez la version clôturée de cette commande.');
      if(order.stripeSessionId){
        const stripe=order.stripeSessionId.startsWith('cs_test_')&&this.legacyStripe?this.legacyStripe:this.stripe;
        if(!stripe)throw new HttpError(503,'Stripe doit être disponible avant le nettoyage.');
        await stripe.checkout.sessions.update(order.stripeSessionId,{metadata:{dailyLifecycle:order.lifecycle,dailyMode:order.mode||'pickup',customerTokenHash:secret.data()?.tokenHash||'',orderId:id}});
      }
    }
    return db.runTransaction(async tx=>{
      const active=db.collection('dailyOrders').doc(id),archive=db.collection('dailyOrderArchive').doc(id);
      const receipt=db.collection('dailyPaymentEmails').doc(id),operation=db.collection('dailyOperations').doc(id);
      const [live,closed,mail,op]=await Promise.all([tx.get(active),tx.get(archive),tx.get(receipt),tx.get(operation)]);
      if(live.exists)throw new HttpError(409,'Une commande encore active ne peut pas être effacée.');
      if(!closed.exists)return {purged:true}; // A previous acknowledgement already completed.
      const order=closed.data();
      if(!['confirmed','cancelled'].includes(order.lifecycle)||!order.emailId)throw new HttpError(409,'Commande non clôturée.');
      if(archiveDigest(order)!==digest)throw new HttpError(409,'Archive actualisée : sauvegardez sa dernière version.');
      if((mail.exists&&!mail.data().emailId&&mail.data().leaseUntil>Date.now())||
          (op.exists&&op.data().leaseUntil>Date.now()))throw new HttpError(409,'Un traitement est encore en cours.');
      // Query inside the transaction: a concurrent webhook forces a retry.
      const events=await tx.get(db.collection('dailyStripeEvents').where('orderId','==',id).limit(400));
      for(const event of events.docs)tx.delete(event.ref);
      if(events.size===400)return {purged:false}; // Continue next pass, below Firestore's write limit.
      tx.delete(archive);tx.delete(db.collection('dailyOrderSecrets').doc(id));
      tx.delete(receipt);tx.delete(operation);
      return {purged:true};
    });
  }
}
module.exports={ArchiveTransfer,archiveDigest,portable};
