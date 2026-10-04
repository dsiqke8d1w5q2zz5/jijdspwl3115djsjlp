const assert=require('node:assert/strict');
const {literal}=require('../tools/buyer-feed/collect.cjs');assert.throws(()=>literal({type:'CallExpression'}));assert.throws(()=>literal({type:'NewExpression',callee:{type:'Identifier',name:'Function'},arguments:[]}));console.log('PASS untrusted page data cannot execute calls');
