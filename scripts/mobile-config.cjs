require('dotenv').config({quiet:true});
const fs=require('node:fs');const path=require('node:path');
const {mobileConfig}=require('../lib/mobile-build-config.cjs');
try{
  const data=mobileConfig(process.env,{release:process.argv.includes('--release')});
  fs.writeFileSync(path.join(__dirname,'../mobile/firebase.config.json'),JSON.stringify(data,null,2));
  console.log('mobile/firebase.config.json créé avec la configuration publique uniquement.');
}catch(error){console.error(error.message);process.exitCode=1;}
