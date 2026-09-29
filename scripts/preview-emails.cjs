// Generates fictional examples locally. Never sends an email.
const fs=require('node:fs');
const path=require('node:path');
const {orderEmailContent}=require('../lib/email-template.cjs');
const directory=path.resolve(__dirname,'../.design-backup/email-preview');
fs.mkdirSync(directory,{recursive:true});
const order={id:'demo',reference:'DC-EXEMPLE',lifecycle:'active',customer:{name:'Camille',email:'client@example.com',address:'12 rue de Paris\n89000 Auxerre'},mode:'delivery',items:[{quantity:1,name:'Regina',options:'Senior · Base tomate',lineTotal:17.90},{quantity:1,name:'4 fromages',options:'Senior · Base tomate',lineTotal:17.90}],totalPrice:26.85,pizzaDiscount:8.95,note:'Sonner à l’arrivée, merci !'};
for(const action of ['paid','confirm','cancel']){
  fs.writeFileSync(path.join(directory,`${action}.html`),orderEmailContent(order,action).html);
}
console.log('Aperçus fictifs préparés dans .design-backup/email-preview. Aucun e-mail envoyé.');
