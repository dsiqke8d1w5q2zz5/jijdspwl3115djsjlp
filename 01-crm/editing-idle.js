(function(){
'use strict';
// Search continues in the extension; postpone local reconciliation while editing.
const editors=new Set([document.getElementById('fModal')].filter(Boolean));
function busy(){for(const root of editors){if(!root.isConnected){editors.delete(root);continue;}if(root.getClientRects().length)return true;}return false;}
async function wait(){while(busy())await new Promise(resolve=>setTimeout(resolve,250));}
window.CRMEditingIdle={track:root=>editors.add(root),wait};
})();
