// Single release check entry point; stops immediately on a failed check.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const tests=[
 'buyer-match.test.cjs','buyer-match.browser.cjs','cloud-sync.test.cjs','schedule-sync.test.cjs','customer-storage.browser.cjs',
 'property-purpose.browser.cjs','property-purpose-edge.browser.cjs',
 'schedule-property.browser.cjs','schedule-property-edge.browser.cjs','todo-property.browser.cjs',
 'buyer-picker.browser.cjs','buyer-legacy-badge.browser.cjs','property-reselect.browser.cjs','property-picker-visible.browser.cjs',
 'schedule-compact.browser.cjs','schedule-click-target.browser.cjs','schedule-horizontal.browser.cjs','schedule-order.browser.cjs',
 'responsive-layout.browser.cjs','responsive-content.browser.cjs','schedule-spacing.browser.cjs','renewal-fold.browser.cjs',
 'detail-columns.browser.cjs','edit-property-tabs.browser.cjs',
 'quick-dialog-layout.browser.cjs','optional-notes.browser.cjs',
 'area-building-add.browser.cjs','area-summary-layout.browser.cjs','landlord-visible.browser.cjs','image-composer.browser.cjs','image-enhance.browser.cjs','image-ai-editor.browser.cjs',
 'detail-accordion.browser.cjs','image-layouts.browser.cjs'
];
for(const test of tests){
 const result=spawnSync(process.execPath,[path.join(__dirname,test)],{cwd:root,env:process.env,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
console.log('PASS desktop/mobile release layout checks');
