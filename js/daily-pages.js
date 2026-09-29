(() => {
  'use strict';
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero=document.querySelector('.hero');
  if(hero&&!reducedMotion.matches&&'IntersectionObserver' in window){
    hero.classList.add('hero-motion');
    const offer=hero.querySelector('.hero-glass');
    const reveal=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){hero.classList.add('hero-media-ready');reveal.disconnect();}
    },{threshold:.1});
    if(offer)reveal.observe(offer);
  }
  const form=document.getElementById('contact-form');
  if(!form)return;
  const feedback=document.getElementById('contact-feedback');
  let sending=false;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(sending||!form.reportValidity())return;
    sending=true;
    const button=form.querySelector('[type="submit"]');
    button.disabled=true;button.textContent='Envoi en cours…';
    feedback.textContent='';feedback.className='contact-feedback';
    const data=Object.fromEntries(new FormData(form));
    try{
      const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
      const result=await response.json();
      if(!response.ok||result.sent!==true)throw new Error(result.error||'L’envoi n’a pas été confirmé. Réessayez plus tard.');
      form.reset();feedback.textContent='Merci ! Votre message a bien été envoyé à l’équipe Daily.';
      feedback.classList.add('success');
    }catch(error){
      feedback.textContent=error.name==='TimeoutError'?'Le serveur met du temps à répondre. L’envoi n’est pas confirmé ; appelez-nous avant de renvoyer le message.':error instanceof TypeError?'Connexion indisponible. Votre message reste dans le formulaire.':error.message;
      feedback.classList.add('error');
    }finally{
      sending=false;button.disabled=false;button.textContent='Envoyer mon message →';
      feedback.focus();
    }
  });
})();
