const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const properties=path.join(root,'mobile/android/key.properties');
const keystore=path.join(root,'.secrets/daily-orders-release.jks');
function setupSigning(){
  if(fs.existsSync(properties)&&fs.existsSync(keystore)){console.log('Signature Android existante conservée.');return;}
  if(fs.existsSync(properties)||fs.existsSync(keystore))throw new Error('Signature partielle existante : restaurer key.properties et le keystore associés ; aucun fichier écrasé.');
  fs.mkdirSync(path.dirname(keystore),{recursive:true});
  const password=crypto.randomBytes(32).toString('hex');
  const result=spawnSync('keytool',['-genkeypair','-noprompt','-keystore',keystore,'-storetype','JKS','-alias','daily-orders','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Daily Orders, O=Daily Chicken Pizza, C=FR','-storepass:env','DAILY_SIGNING_PASSWORD','-keypass:env','DAILY_SIGNING_PASSWORD'],{env:{...process.env,DAILY_SIGNING_PASSWORD:password},encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw new Error('Création de la signature impossible. Vérifier que keytool (Java JDK) est disponible.');
  fs.writeFileSync(properties,`storePassword=${password}\nkeyPassword=${password}\nkeyAlias=daily-orders\nstoreFile=../../../.secrets/daily-orders-release.jks\n`,{flag:'wx',mode:0o600});
  console.log('Signature release créée. Sauvegarder .secrets/daily-orders-release.jks et mobile/android/key.properties dans un emplacement privé.');
}
if(require.main===module){try{setupSigning();}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={setupSigning};
