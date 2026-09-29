const nodemailer=require('nodemailer');
const {randomUUID}=require('node:crypto');
const {HttpError}=require('./order-validation.cjs');
const {smtpOptions,emailConfigured}=require('./integrations.cjs');
const topics=['Une proposition','Un partenariat','Un événement','Une question'];
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validateContact(body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'Vérifiez les informations du formulaire.');
  const read=(key,max)=>{
    if(typeof body[key]!=='string')throw new HttpError(400,'Complétez tous les champs.');
    const value=body[key].trim();
    if(!value||value.length>max)throw new HttpError(400,'Vérifiez la longueur des champs.');
    return value;
  };
  const name=read('name',100),email=read('email',254),topic=read('topic',50),message=read('message',4000);
  if(/[\r\n\x00-\x1f]/.test(name)||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||/[\r\n\x00-\x1f]/.test(email))throw new HttpError(400,'Indiquez un nom et une adresse e-mail valides.');
  if(!topics.includes(topic)||message.length<10)throw new HttpError(400,'Choisissez un sujet et écrivez au moins 10 caractères.');
  return {name,email,topic,message};
}
class ContactEmail{
  constructor(env=process.env,createTransport=nodemailer.createTransport){this.env=env;this.createTransport=createTransport;}
  async send(input){
    const data=validateContact(input);
    const to=(this.env.CONTACT_EMAIL||this.env.SMTP_EMAIL||'').trim();
    if(!emailConfigured(this.env)||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))throw new HttpError(503,'Le formulaire est momentanément indisponible. Appelez-nous au 03 86 31 17 17.');
    const options=smtpOptions(this.env),transport=this.createTransport(options);
    try{
      const result=await transport.sendMail({
        from:{name:'Daily · Contact',address:options.auth.user},
        to:{address:to},replyTo:{name:data.name,address:data.email},
        subject:`Contact Daily · ${data.topic}`,
        messageId:`<daily-contact-${randomUUID()}@${options.auth.user.split('@')[1]}>`,
        text:`${data.topic}\n\nDe : ${data.name}\nE-mail : ${data.email}\n\n${data.message}`,
        html:`<!doctype html><html lang="fr"><body style="margin:0;background:#faf8f4;color:#302320;font-family:Arial,sans-serif"><div style="max-width:600px;margin:30px auto;padding:32px;background:#fff;border-radius:20px"><p style="color:#b6192b;font-size:28px;font-weight:bold">daily.</p><h1 style="font-size:24px">${escape(data.topic)}</h1><p>Message de <strong>${escape(data.name)}</strong><br>${escape(data.email)}</p><div style="padding:24px;background:#faf5ef;border-radius:14px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere">${escape(data.message)}</div><p style="color:#76665c;font-size:13px">Répondez à cet e-mail pour contacter l’expéditeur.</p></div></body></html>`
      });
      if(!result.accepted?.some(address=>String(address).toLowerCase()===to.toLowerCase())||!result.messageId)throw new Error('SMTP not accepted');
      return {sent:true};
    }catch{throw new HttpError(503,'L’envoi n’a pas été confirmé. Réessayez plus tard ou appelez-nous.');}
    finally{transport.close();}
  }
}
module.exports={ContactEmail,validateContact};
