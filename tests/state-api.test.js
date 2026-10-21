import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/state.js';
function response(){return {code:0,body:null,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};}
test('single URL permits requests without access codes and preserves version conflicts',async()=>{
 const oldFetch=global.fetch;const old={...process.env};
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_test';process.env.APP_ACCESS_CODE='test-only';
 try{
  delete process.env.APP_ACCESS_CODE;
  global.fetch=async()=>({ok:true,json:async()=>[{data:{teachers:[],records:{}},revision:4}]});
  let res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.code,200);assert.equal(res.body.revision,4);
  let called='';global.fetch=async(url,options)=>{called=url;assert.equal(options.headers.Authorization,undefined);return {ok:true,json:async()=>[]};};
  res=response();await handler({method:'PUT',headers:{},body:{data:{teachers:[],records:{}},revision:4}},res);assert.equal(res.code,409);assert.ok(called.endsWith('revision=eq.4'));
  global.fetch=async()=>({ok:true,json:async()=>[{revision:5}]});res=response();await handler({method:'PUT',headers:{},body:{data:{teachers:[],records:{}},revision:4}},res);assert.equal(res.code,200);assert.equal(res.body.revision,5);
 }finally{global.fetch=oldFetch;for(const k of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','APP_ACCESS_CODE']){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
