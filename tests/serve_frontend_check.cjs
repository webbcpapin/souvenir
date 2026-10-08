// Cross-origin popup fixture; Google and Sheets are mocked. No operational data is used.
const fs=require('fs'),path=require('path'),vm=require('vm'),http=require('http');
const root=path.resolve(__dirname,'..'),box={exports:{}};
const mockSource=fs.readFileSync(path.join(__dirname,'test_backend.cjs'),'utf8').split('const cases=[];')[0];
vm.runInNewContext(mockSource+'\nctx.setupArsip_();module.exports={api,state,getPhoto:id=>ctx.getPhoto(id),setEmail:value=>email=value};',{require,__dirname,module:box,console:{log(){}},Buffer});
const backend=box.exports;let lastWrite=null,dropOnce=false;
function handle(req,res){
  const url=new URL(req.url,'http://127.0.0.1:8770');
  if(url.pathname==='/mobile'){
    res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>TEST viewport 390px</h1><iframe id="mobile" style="width:390px;height:844px;border:1px solid #aaa" src="/tengah.html"></iframe>');return;
  }
  if(url.pathname==='/__check/api'&&req.method==='POST'){
    let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>4000000)req.destroy()});req.on('end',()=>{
      let data,error;const payload=JSON.parse(raw);
      try{
        if(payload.action==='testActor'){backend.setEmail(payload.email);data={ok:true};}
        else if(payload.action==='testDrop'){dropOnce=true;data={ok:true};}
        else if(payload.action==='testRetry'){data=backend.api(lastWrite.action,lastWrite.body);}
        else{data=payload.action==='photo'?backend.getPhoto(payload.id):backend.api(payload.action,payload.body);if(['movement','editItem','addItem','deleteItem','restoreItem'].includes(payload.action))lastWrite=payload;}
        if(dropOnce&&lastWrite===payload){dropOnce=false;throw new Error('SIMULASI: respons hilang setelah data tersimpan');}
      }catch(e){error=e.message;}
      let state;try{state=backend.state();}catch{}
      const check={items:state?.items.filter(i=>i.code.startsWith('TEST')),movements:state?.movements.filter(m=>m.code?.startsWith('TEST')),lastWrite};
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data,error,check}));
    });return;
  }
  const rpc=`<script>window.google={script:{get run(){let ok=()=>{},fail=()=>{};const bridge={withSuccessHandler(fn){ok=fn;return bridge},withFailureHandler(fn){fail=fn;return bridge},api(action,body){call({action,body})},getPhoto(id){call({action:'photo',id})}};function call(payload){fetch('/__check/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json()).then(result=>{if(result.error)throw new Error(result.error);ok(result.data)}).catch(fail)}return bridge}}};</script>`;
  if(url.pathname==='/bridge'){
    let body=fs.readFileSync(path.join(root,'apps-script/Bridge.html'),'utf8').replace('<?= bridgeChannel ?>',url.searchParams.get('channel')||'').replace("'https://webbcpapin.github.io'","'http://127.0.0.1:8768'").replace('<script>',rpc+'<script>');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(body);return;
  }
  if(url.pathname==='/sandbox'||url.pathname==='/mock-google'){
    const src=url.pathname==='/mock-google'?'http://127.0.0.1:8770/sandbox':'http://127.0.0.1:8771/bridge';
    res.writeHead(200,{'Content-Type':'text/html'});res.end('<iframe style="width:100%;height:600px;border:0" src="'+src+'?channel='+encodeURIComponent(url.searchParams.get('channel'))+'"></iframe>');return;
  }
  if(url.pathname==='/__check'){
    res.writeHead(200,{'Content-Type':'text/html'});res.end(`<h1>TEST database only</h1><button id="retry">Repeat last request</button><button id="deny">Unauthorized account</button><button id="owner">Authorized test owner</button><button id="drop">Lose next write response</button><pre id="result"></pre><script>for(const [id,action,email] of [['retry','testRetry'],['deny','testActor','stranger@example.test'],['owner','testActor','owner@example.test'],['drop','testDrop']])document.getElementById(id).onclick=()=>fetch('/__check/api',{method:'POST',body:JSON.stringify({action,email})}).then(r=>r.json()).then(r=>document.getElementById('result').textContent=JSON.stringify(r,null,2));</script>`);return;
  }
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
  let content=fs.readFileSync(target);
  if(url.pathname==='/backend-transport.js')content=content.toString().replace(/const APP = '[^']+';/,"const APP = 'http://127.0.0.1:8770/mock-google';").replace("url.protocol === 'https:' && !url.port &&","['http://127.0.0.1:8770','http://127.0.0.1:8771'].includes(url.origin) || url.protocol === 'https:' && !url.port &&");
  const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.html':'text/html'}[path.extname(target)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime+(mime.startsWith('text/')?'; charset=utf-8':'')});res.end(content);
}
for(const port of [8768,8770,8771])http.createServer(handle).listen(port,'127.0.0.1',()=>console.log('TEST server http://127.0.0.1:'+port));
