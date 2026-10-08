// Pratinjau uji lokal: formulir asli memanggil Code.gs dengan mock Google,
// sehingga pemeriksaan simpan tidak menulis transaksi uji ke Google Sheets.
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const root = path.resolve(__dirname, '..');
const mockSource = fs.readFileSync(path.join(__dirname, 'test_backend.cjs'), 'utf8').split('const cases=[];')[0];
const moduleBox = {exports:{}};
vm.runInNewContext(mockSource + '\nctx.setupArsip_();module.exports={api,state,getPhoto:id=>ctx.getPhoto(id)};', {
  require, __dirname, module:moduleBox, console:{log(){}}, Buffer
});
const backend = moduleBox.exports;
const mockRpc = `<script>
window.google={script:{get run(){let ok=()=>{},fail=()=>{};const bridge={
withSuccessHandler(fn){ok=fn;return bridge},withFailureHandler(fn){fail=fn;return bridge},
api(action,body){call({action,body})},getPhoto(id){call({action:'photo',id})}};
function call(payload){fetch('/__check/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
.then(r=>r.json()).then(result=>{document.getElementById('check-result').textContent=JSON.stringify(result.check);if(result.error)throw new Error(result.error);ok(result.data)}).catch(fail)}return bridge}}};
</script>`;
const fixture = fs.readFileSync(path.join(root, 'tengah.html'), 'utf8').replace('<script src="catalog-client.js">', '<pre id="check-result" style="position:fixed;right:10px;bottom:10px;max-width:500px;max-height:100px;overflow:auto;background:white;font-size:10px;z-index:30"></pre>'+mockRpc+'<script src="catalog-client.js">');
let lastWrite = null;
const server = http.createServer((req,res) => {
  if (req.url === '/__check/api' && req.method === 'POST') {
    let raw = ''; req.on('data',chunk=>{raw+=chunk;if(raw.length>4000000)req.destroy()});
    req.on('end',()=>{
      const payload = JSON.parse(raw); let data, error;
      try {data=payload.action==='photo'?backend.getPhoto(payload.id):backend.api(payload.action,payload.body);if(['movement','editItem'].includes(payload.action))lastWrite=payload;} catch(e){error=e.message;}
      const state=backend.state();
      const check={topi:state.items.find(i=>i.code==='ARS-001'),movements:state.movements.filter(m=>m.type!=='awal'),lastWrite};
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data,error,check}));
    });return;
  }
  if (req.url==='/' || req.url==='/tengah.html') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fixture);return;}
  const target=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if (!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
  const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.html':'text/html'}[path.extname(target)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});fs.createReadStream(target).pipe(res);
});
server.listen(8768,'127.0.0.1',()=>console.log('Uji frontend + Code.gs lokal: http://127.0.0.1:8768/'));
