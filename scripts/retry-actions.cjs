require('dotenv').config({quiet:true});
const {retry}=require('../lib/retry-actions.cjs');
module.exports={retry};
if(require.main===module)retry().then(()=>console.log('Reprise des actions terminée.')).catch(error=>{console.error('Reprise indisponible',error.code||error.status||error.name);process.exitCode=1;});
