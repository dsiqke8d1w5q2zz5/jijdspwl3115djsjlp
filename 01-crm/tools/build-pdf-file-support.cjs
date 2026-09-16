// Derive classic-script builds for local file:// pages from the pinned upstream ESM build.
// The library code is unchanged apart from module URL/export adaptation and an IIFE scope.
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../vendor/pdfjs'),out=path.join(base,'file');
fs.mkdirSync(out,{recursive:true});
for(const [file,name] of [['pdf','pdfjsLib'],['pdf.worker','pdfjsWorker']]){
 let text=fs.readFileSync(path.join(base,file+'.mjs'),'utf8');
 const match=text.match(/\nexport \{ ([^}]+) \};/);
 if(!match)throw Error('Unexpected PDF.js export format');
 text=text.replace(match[0],'\nglobalThis.'+name+' = { '+match[1]+' };').replaceAll('import.meta.url','__pdfScriptUrl').replace(/\/\/# sourceMappingURL=.*$/gm,'');
 fs.writeFileSync(path.join(out,file+'.js'),'(function(){\nconst __pdfScriptUrl=document.currentScript.src;\n'+text+'\n})();\n');
}
const resources={};
for(const [folder,kind] of [['cmaps','cMapUrl'],['standard_fonts','standardFontDataUrl'],['wasm','wasmUrl']])for(const name of fs.readdirSync(path.join(base,folder))){
 if(!/\.(bcmap|pfb|ttf|wasm)$/.test(name))continue;
 resources[kind+'/'+name]=fs.readFileSync(path.join(base,folder,name)).toString('base64');
}
fs.writeFileSync(path.join(out,'resources.js'),'/* PDF.js local resources; see adjacent upstream licenses. */\nwindow.pdfjsLocalResources='+JSON.stringify(resources)+';\n');
