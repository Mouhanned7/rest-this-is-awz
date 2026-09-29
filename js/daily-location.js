(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DailyLocation=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  function request(geolocation,options){
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(callback,value)=>{if(settled)return;settled=true;clearTimeout(timer);callback(value);};
      const timer=setTimeout(()=>finish(reject,{code:3}),options.timeout+1000);
      try{geolocation.getCurrentPosition(p=>finish(resolve,p),e=>finish(reject,e),options);}catch(e){finish(reject,e);}
    });
  }
  async function detect({geolocation,secure=true,onRetry=()=>{}}){
    if(!secure)throw new Error('La localisation nécessite le site sécurisé HTTPS. Ouvrez dailychicken.vercel.app dans Chrome ou Safari.');
    if(!geolocation)throw new Error('La localisation est indisponible dans ce navigateur. Ouvrez le site dans Chrome ou Safari, ou saisissez votre adresse.');
    let position;
    try{
      try{position=await request(geolocation,{enableHighAccuracy:true,timeout:15000,maximumAge:30000});}
      catch(error){if(error.code===1)throw error;onRetry();position=await request(geolocation,{enableHighAccuracy:false,timeout:12000,maximumAge:60000});}
    }catch(error){
      if(error.code===1)throw new Error('Accès à la position refusé. Dans les réglages du site de votre navigateur, autorisez la localisation et activez la position du téléphone, puis réessayez. Sinon, saisissez votre adresse.');
      throw new Error('Position introuvable. Activez la localisation du téléphone et vérifiez votre connexion, puis réessayez. Vous pouvez aussi saisir votre adresse.');
    }
    const {latitude,longitude,accuracy}=position.coords||{};
    if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||!Number.isFinite(accuracy)||accuracy<0)throw new Error('Position non exploitable. Réessayez ou saisissez votre adresse.');
    return {latitude,longitude,accuracy};
  }
  return {detect};
});
