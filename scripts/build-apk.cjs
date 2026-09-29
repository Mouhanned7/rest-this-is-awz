require('dotenv').config({quiet:true});
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {mobileConfig}=require('../lib/mobile-build-config.cjs');
const {setupSigning}=require('./mobile-signing.cjs');
try{
  const config=mobileConfig(process.env,{release:true});
  setupSigning();
  const mobile=path.resolve(__dirname,'../mobile');
  fs.writeFileSync(path.join(mobile,'firebase.config.json'),JSON.stringify(config,null,2));
  // Only static arguments reach the Windows shell; credentials stay out of argv.
  const result=process.platform==='win32'
    ?spawnSync('cmd.exe',['/d','/s','/c','flutter build apk --release --dart-define-from-file=firebase.config.json'],{cwd:mobile,stdio:'inherit',windowsHide:true})
    :spawnSync('flutter',['build','apk','--release','--dart-define-from-file=firebase.config.json'],{cwd:mobile,stdio:'inherit'});
  if(result.status!==0)throw new Error('Compilation APK interrompue. Consulter le diagnostic Flutter ci-dessus.');
  console.log('APK signé : mobile/build/app/outputs/flutter-apk/app-release.apk');
}catch(error){console.error(error.message);process.exitCode=1;}
