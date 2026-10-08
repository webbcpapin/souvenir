// Protocol checks with synthetic WindowProxy references; no Google account/network used.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
(async()=>{
 let receive,opened,nonce;const posts=[],popup={closed:false,focus(){}};
 const window={addEventListener(name,fn){if(name==='message')receive=fn},dispatchEvent(){},open(url){opened=url;nonce=new URL(url).searchParams.get('channel');return popup}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'backend-transport.js'),'utf8'),{window,URL,crypto,Map,Promise,Error,String,CustomEvent:class{},setTimeout:()=>1,clearTimeout(){},setInterval(){}});
 const backend=window.SouvenirBackend,connection=backend.connect(),peer={top:popup,postMessage:(msg,origin)=>posts.push({msg,origin})};
 const origin='https://n-abc-0lu-script.googleusercontent.com';
 const ready=(source=peer,channel=nonce)=>({source,origin,data:{protocol:'souvenir-rpc-1',channel,kind:'ready'}});
 receive({...ready(),origin:'https://evil.example'});receive(ready({top:{}},nonce));receive(ready(peer,'wrong-channel'));
 assert.equal(posts.length,0);receive(ready());await connection;assert.equal(posts[0].msg.kind,'ack');assert.equal(posts[0].origin,origin);
 let completed=false;const request=backend.api('state').then(result=>{completed=true;return result});const id=posts.at(-1).msg.id;
 const result={source:peer,origin,data:{protocol:'souvenir-rpc-1',channel:nonce,kind:'result',id,ok:true,data:{items:[]}}};
 receive({...result,origin:'https://evil.example'});receive({...result,source:{top:popup}});receive({...result,data:{...result.data,id:crypto.randomUUID()}});await Promise.resolve();assert.equal(completed,false);
 receive(result);assert.deepEqual(await request,{items:[]});popup.closed=true;await assert.rejects(backend.api('state'),/Hubungkan/);
 console.log('PASS: parent rejects wrong origin/source/channel/request id and sends only to bound Google origin.');
 let bridgeReceive;const parent={},calls=[],sent=[],status={textContent:''};
 const bridgeScript=fs.readFileSync(path.join(root,'apps-script/Bridge.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replace('<?= bridgeChannel ?>',nonce);
 const run={withSuccessHandler(fn){this.ok=fn;return this},withFailureHandler(fn){this.fail=fn;return this},api(action,body){calls.push({action,body});this.ok({authenticated:true})},getPhoto(id){calls.push({id});this.ok('image')}};
 parent.postMessage=(msg,target)=>sent.push({msg,target});
 vm.runInNewContext(bridgeScript,{window:{top:{opener:parent},addEventListener(_name,fn){bridgeReceive=fn}},document:{getElementById:()=>status},Set,Object,String,google:{script:{run}},setInterval:()=>1,clearInterval(){}});
 const call={origin:'https://webbcpapin.github.io',source:parent,data:{protocol:'souvenir-rpc-1',channel:nonce,kind:'call',id:crypto.randomUUID(),action:'session',body:{}}};
 bridgeReceive({...call,origin:'https://evil.example'});bridgeReceive({...call,source:{}});bridgeReceive({...call,data:{...call.data,channel:'wrong'}});bridgeReceive({...call,data:{...call.data,action:'setupArsip_'}});assert.equal(calls.length,0);
 bridgeReceive(call);assert.equal(calls.length,1);assert.equal(sent.at(-1).target,'https://webbcpapin.github.io');assert.equal(sent.at(-1).msg.ok,true);
 console.log('PASS: bridge rejects foreign parents, nonce mismatch and non-allowlisted actions; returns readable RPC result.');
})().catch(error=>{console.error(error);process.exitCode=1});
