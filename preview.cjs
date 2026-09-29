const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({quiet:true});
const app = express();
app.disable('x-powered-by');
app.use('/api',require('./lib/api.cjs').createApi());
let retryRunning=false;
setInterval(async()=>{
  const {configured}=require('./lib/firebase.cjs');const {emailConfigured}=require('./lib/integrations.cjs');
  if(retryRunning||!configured()||!emailConfigured())return;
  retryRunning=true;try{await require('./scripts/retry-actions.cjs').retry();}catch(error){console.error('Reprise différée indisponible',error.code||error.name);}finally{retryRunning=false;}
},30000).unref();
// Only public assets are served; credentials and administration files stay private.
for (const directory of ['css', 'js', 'images', 'fonts']) {
  app.use('/' + directory, express.static(path.join(__dirname, directory)));
}
app.use('/responsable',express.static(path.join(__dirname,'mobile/build/web')));
const version = () => ['index.html','menu.html','about.html','contact.html','js/daily-pages.js','js/daily.js','js/daily-checkout.js','js/daily-menu.js','js/daily-pricing.js','css/daily.css'].map(file => {try{return fs.statSync(path.join(__dirname,file)).mtimeMs;}catch{return 0;}}).join('-');
app.get('/preview-version', (req,res) => res.json({version:version()}));
app.get(['/', '/index.html', '/menu.html', '/html.html', '/about.html', '/contact.html'], (req, res) => {
  res.set('Cache-Control', 'no-store');
  const html = fs.readFileSync(path.join(__dirname, ['/menu.html','/about.html','/contact.html'].includes(req.path) ? req.path.slice(1) : 'index.html'),'utf8');
  // Preview-only live refresh. Keep forms and dialogs undisturbed while in use.
  const reload = `<script>let previewVersion=${JSON.stringify(version())};setInterval(async()=>{try{const data=await(await fetch('/preview-version')).json();if(data.version!==previewVersion&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){sessionStorage.setItem('dailyPreviewScroll',scrollY);location.reload()}}catch{}},2000);const previousScroll=sessionStorage.getItem('dailyPreviewScroll');if(previousScroll){sessionStorage.removeItem('dailyPreviewScroll');requestAnimationFrame(()=>scrollTo(0,Number(previousScroll)))}</script>`;
  res.type('html').send(html.replace('</body>',reload+'</body>'));
});
app.listen(Number(process.env.DAILY_PORT||3000), process.env.HOST||'127.0.0.1', () => console.log('Daily Chicken Pizza: http://127.0.0.1:'+(process.env.DAILY_PORT||3000)));
