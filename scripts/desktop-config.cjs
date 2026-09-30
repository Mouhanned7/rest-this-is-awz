const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({path: path.join(__dirname, '../.env'), quiet: true});
const names = ['FIREBASE_PROJECT_ID', 'FIREBASE_API_KEY', 'FIREBASE_WEB_APP_ID',
  'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_STORAGE_BUCKET'];
const config = Object.fromEntries(names.map(name => [name, process.env[name] || '']));
config.DAILY_API_BASE_URL = process.env.PUBLIC_BASE_URL || '';
for (const name of names.slice(0, 4)) {
  if (!config[name]) throw new Error(`${name} manquant dans .env`);
}
if (!/^1:\d+:web:[a-f0-9]+$/.test(config.FIREBASE_WEB_APP_ID)) {
  throw new Error('Windows requiert FIREBASE_WEB_APP_ID (application Web du même projet Firebase).');
}
const url = new URL(config.DAILY_API_BASE_URL);
if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('PUBLIC_BASE_URL doit être une origine HTTPS.');
}
config.DAILY_API_BASE_URL = url.origin;
fs.writeFileSync(path.join(__dirname, '../desktop/firebase.config.json'), JSON.stringify(config, null, 2) + '\n');
console.log('Configuration publique Windows créée. Aucun mot de passe ni clé serveur exporté.');
