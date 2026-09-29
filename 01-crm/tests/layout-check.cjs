// Single release check entry point; stops immediately on a failed check.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const tests=[
 'responsive-layout.browser.cjs','responsive-content.browser.cjs','schedule-spacing.browser.cjs','renewal-fold.browser.cjs',
 'detail-columns.browser.cjs','edit-property-tabs.browser.cjs',
 'quick-dialog-layout.browser.cjs','optional-notes.browser.cjs',
 'area-building-add.browser.cjs','area-summary-layout.browser.cjs','landlord-visible.browser.cjs','image-composer.browser.cjs'
];
for(const test of tests){
 const result=spawnSync(process.execPath,[path.join(__dirname,test)],{cwd:root,env:process.env,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
console.log('PASS desktop/mobile release layout checks');
