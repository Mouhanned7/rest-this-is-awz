// Vercel owns the HTTP listener and injects environment variables.
// Importing this module never starts a local server or a background worker.
module.exports=require('../lib/serverless.cjs').createServerlessApp();
