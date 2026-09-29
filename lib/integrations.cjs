const {HttpError}=require('./order-validation.cjs');
const nodemailer=require('nodemailer');
const {orderEmailContent}=require('./email-template.cjs');
function smtpOptions(env=process.env){
  const host=(env.SMTP_HOST||'smtp.gmail.com').trim();
  const port=Number(env.SMTP_PORT||465);
  const user=(env.SMTP_EMAIL||'').trim();
  const pass=host==='smtp.gmail.com'?(env.SMTP_APP_PASSWORD||'').replace(/\s/g,''):(env.SMTP_APP_PASSWORD||'');
  return {host,port,secure:port===465,requireTLS:port!==465,auth:{user,pass},
    connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000,dnsTimeout:5000,
    disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false};
}
const emailConfigured=(env=process.env)=>{
  const options=smtpOptions(env);
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(options.auth.user)&&!!options.auth.pass&&[465,587].includes(options.port);
};
class OrderEmail {
  constructor(env=process.env,createTransport=nodemailer.createTransport){this.env=env;this.createTransport=createTransport;}
  async send(order,action){
    if(!emailConfigured(this.env))throw new HttpError(503,'Configurez l’envoi des e-mails avant de confirmer ou annuler.');
    if(!['confirm','cancel','paid'].includes(action))throw new HttpError(400,'Type d’e-mail invalide.');
    const {title,text,html}=orderEmailContent(order,action);
    const options=smtpOptions(this.env),transport=this.createTransport(options);
    // A stable Message-ID helps tracing retries; SMTP does not guarantee deduplication.
    const messageId=`<daily-${order.id}-${action}@${options.auth.user.split('@')[1]}>`;
    try{
      const result=await transport.sendMail({
        from:{name:'Daily Chicken Pizza',address:options.auth.user},to:{address:order.customer.email},
        subject:`${title} · ${order.reference} · Daily Chicken Pizza`,
        text,html,
        messageId,replyTo:this.env.ORDER_EMAIL_REPLY_TO||{name:'Daily Chicken Pizza',address:options.auth.user}
      });
      if(!result.accepted?.some(address=>String(address).toLowerCase()===order.customer.email.toLowerCase())||!result.messageId)throw new Error('SMTP acceptance missing');
      return result.messageId;
    }catch{
      // Provider errors can contain credentials or customer data; never expose them.
      throw new HttpError(503,'E-mail non confirmé par le serveur SMTP. Vérifiez la configuration puis reprenez le traitement.');
    }finally{transport.close();}
  }
}
module.exports={OrderEmail,emailConfigured,smtpOptions};
