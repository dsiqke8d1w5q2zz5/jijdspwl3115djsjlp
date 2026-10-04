// Scheduled refresh publishes only the public feed, without touching the worktree or its index.
const fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../../..'),RUNTIME=path.join(os.homedir(),'.codex','buyer-feed-runtime'),FILE='01-crm/data/buyer-feed.json';
fs.mkdirSync(RUNTIME,{recursive:true});const lock=path.join(RUNTIME,'running.lock'),log=path.join(RUNTIME,'last-run.json');
if(fs.existsSync(lock)&&Date.now()-fs.statSync(lock).mtimeMs<25*60000)process.exit(0);fs.writeFileSync(lock,String(process.pid));
const index=path.join(RUNTIME,'index-'+process.pid),output=path.join(RUNTIME,'feed-'+process.pid+'.json');
function git(args,input,isolated=false){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8',...(input==null?{}:{input}),stdio:['pipe','pipe','pipe'],env:{...process.env,...(isolated?{GIT_INDEX_FILE:index}:{})},timeout:90000,maxBuffer:32*1024*1024}).trim();}
const startedAt=new Date().toISOString();try{
 git(['fetch','origin','main']);let base=git(['rev-parse','origin/main']);try{fs.writeFileSync(output,git(['show',base+':'+FILE]));}catch{fs.writeFileSync(output,'{"listings":[]}');}
 let failed=false;try{execFileSync(process.execPath,[path.join(__dirname,'collect.cjs')],{cwd:ROOT,env:{...process.env,BUYER_FEED_OUTPUT:output,BUYER_FEED_SOURCES:'yungching'},stdio:['ignore','pipe','pipe'],timeout:18*60000});}catch{failed=true;}
 const feed=JSON.parse(fs.readFileSync(output,'utf8'));if(!feed.generatedAt||Date.parse(feed.generatedAt)<Date.parse(startedAt)-1000)throw Error('此次收集沒有產生新狀態');
 if(feed.sources?.find(s=>s.id==='yungching')?.status!=='ok')failed=true;
 let commit;for(let attempt=0;attempt<3;attempt++){
  git(['fetch','origin','main']);base=git(['rev-parse','origin/main']);const latest=JSON.parse(git(['show',base+':'+FILE]));feed.listings=[...feed.listings.filter(p=>p.source==='yungching'),...latest.listings.filter(p=>p.source!=='yungching')];feed.sources=[...feed.sources.filter(s=>s.id==='yungching'),...latest.sources.filter(s=>s.id!=='yungching')];fs.writeFileSync(output,JSON.stringify(feed));git(['read-tree',base],null,true);const blob=git(['hash-object','-w','--stdin'],fs.readFileSync(output));git(['update-index','--add','--cacheinfo','100644,'+blob+','+FILE],null,true);const tree=git(['write-tree'],null,true);
  if(tree===git(['rev-parse',base+'^{tree}'])){commit=base;break;}
  commit=git(['-c','user.name=buyer-feed-bot','-c','user.email=buyer-feed-bot@users.noreply.github.com','commit-tree',tree,'-p',base], 'chore(crm): refresh public buyer listing feed\n');
  try{git(['push','origin',commit+':refs/heads/main']);break;}catch{if(attempt===2)throw Error('公開資料推送失敗，請檢查網站寫入權限');}
 }
 fs.writeFileSync(log,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),status:failed?'partial':'success',commit,count:feed.listings.length,sources:feed.sources},null,2));console.log('PUBLISHED',commit,feed.listings.length);
}catch(e){fs.writeFileSync(log,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),status:'error',message:'更新未完成，原有公開資料保留；請檢查網路與執行環境。',detail:String(e.message||'').split('\n')[0].replace(/https?:\/\/[^\s]+/g,'[remote]').slice(0,240)},null,2));console.error('更新未完成，詳見本機排程紀錄。');process.exitCode=1;}finally{for(const f of [index,output,lock])try{fs.unlinkSync(f);}catch{}}
