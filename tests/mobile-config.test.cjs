const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mobileConfig}=require('../lib/mobile-build-config.cjs');
const env={FIREBASE_PROJECT_ID:'demo-test',FIREBASE_API_KEY:'public-key',FIREBASE_MESSAGING_SENDER_ID:'123',FIREBASE_ANDROID_APP_ID:'1:123:android:abcdef',PUBLIC_BASE_URL:'https://daily.example',SMTP_APP_PASSWORD:'secret-mail',FIREBASE_PRIVATE_KEY:'private',ADMIN_INITIAL_PASSWORD:'secret-admin',STRIPE_SECRET_KEY:'secret-stripe'};
test('release config excludes credentials and points at the public API',()=>{
  const result=mobileConfig(env,{release:true});assert.equal(result.DAILY_API_BASE_URL,'https://daily.example');
  for(const key of ['SMTP_APP_PASSWORD','FIREBASE_PRIVATE_KEY','ADMIN_INITIAL_PASSWORD','STRIPE_SECRET_KEY'])assert.equal(result[key],undefined);
});
test('release rejects web app IDs, mismatched Firebase sender and unreachable local origins',()=>{
  for(const appId of ['', '1:123:web:abcdef','1:456:android:abcdef'])assert.throws(()=>mobileConfig({...env,FIREBASE_ANDROID_APP_ID:appId},{release:true}),/FIREBASE_ANDROID_APP_ID/);
  for(const base of ['','http://daily.example','https://127.0.0.1','https://localhost','https://192.168.1.2','https://daily.example/api','https://user:pass@daily.example'])assert.throws(()=>mobileConfig({...env,PUBLIC_BASE_URL:base},{release:true}),/PUBLIC_BASE_URL/);
});
