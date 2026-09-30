const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function build(output=path.join(root,'dist')) {
  // A strict allowlist keeps private files, old APIs and Flutter credentials out of the public output.
  const expected=path.join(root,'dist');
  if(path.resolve(output)!==expected)throw new Error('Le dossier de sortie doit être dist dans ce projet.');
  if(fs.existsSync(output)&&fs.lstatSync(output).isSymbolicLink())throw new Error('Le dossier de sortie ne doit pas être un lien.');
  fs.rmSync(output,{recursive:true,force:true});
  fs.mkdirSync(output,{recursive:true});
  for(const file of ['index.html','menu.html','html.html','about.html','contact.html'])fs.copyFileSync(path.join(root,file),path.join(output,file));
  const jsFiles=['daily.js','daily-pages.js','daily-location.js','daily-checkout.js','daily-menu.js','daily-pricing.js'];
  fs.mkdirSync(path.join(output,'js'));
  for(const file of jsFiles)fs.copyFileSync(path.join(root,'js',file),path.join(output,'js',file));
  fs.mkdirSync(path.join(output,'css'));
  fs.copyFileSync(path.join(root,'css/daily.css'),path.join(output,'css/daily.css'));
  for(const directory of ['images','fonts']){
    // Fonts are optional: the current site no longer ships the old icon font.
    if(directory==='fonts'&&!fs.existsSync(path.join(root,directory)))continue;
    fs.cpSync(path.join(root,directory),path.join(output,directory),{recursive:true,filter:source=>{
    const stat=fs.lstatSync(source);
    if(stat.isSymbolicLink())throw new Error('Un asset ne doit pas être un lien symbolique.');
    return stat.isDirectory()||/\.(avif|webp|png|jpe?g|gif|svg|ico|woff2?|ttf|otf|eot)$/i.test(source);
    }});
  }
  return output;
}
module.exports={build};
if(require.main===module){build();console.log('Site public préparé dans dist. API déployée séparément comme fonction Vercel.');}
