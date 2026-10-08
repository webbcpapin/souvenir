/** Backend Google Sheets + Google Drive. Deploy: user accessing the web app. */
// Sumber daya yang diberikan pengelola. Setup memakai berkas ini tanpa membuat database lain.
const BACKEND_RESOURCES = {
  spreadsheetId: '1b4lPrq0HWIn4QDqYQ63VcVC6JZNWZAZP7051JKtyGE0',
  photoFolderId: '1h6vz-ORzURJn7hP4gmigDu-MuKmPhYRT'
};
const SCHEMA = {
  Barang: ['id','code','name','category','unit','stock','min_stock','location','notes','image','active','version','updated_at','seed_filename'],
  Transaksi: ['id','item_id','type','quantity','before_stock','after_stock','date','person','reference','notes','created_at','actor_email','request_id','request_hash'],
  Audit: ['id','item_id','action','before_json','after_json','created_at','actor_email','request_id','request_hash']
};
function doGet(event) {
  const params = event && event.parameter || {};
  const template = HtmlService.createTemplateFromFile(params.page === 'beranda' ? 'Home' : 'Index');
  template.appUrl = ScriptApp.getService().getUrl();
  template.initialAction = ['masuk','keluar','edit'].includes(params.action) ? params.action : '';
  template.initialCode = /^ARS-\d{3,}$/.test(params.code || '') ? params.code : '';
  return template.evaluate()
    .setTitle('Arsip Persediaan | Bea Cukai Pangkalpinang')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function include_(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function props_() { return PropertiesService.getScriptProperties(); }
function time_() { return Utilities.formatDate(new Date(),'Asia/Jakarta',"yyyy-MM-dd'T'HH:mm:ssXXX"); }
function today_() { return Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd'); }
function lock_(callback) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Aplikasi sedang menyimpan transaksi lain. Coba kembali.');
  try { return callback(); } finally { lock.releaseLock(); }
}
function authorize_() {
  const email = Session.getActiveUser().getEmail().trim().toLowerCase();
  const allowed = JSON.parse(props_().getProperty('ALLOWED_EMAILS') || '[]');
  if (!email || !allowed.includes(email)) throw new Error('Akun Google belum mendapat akses. Hubungi pengelola aplikasi. Pastikan deployment menjalankan aplikasi sebagai pengguna yang mengakses.');
  return email;
}
function book_() {
  const id = props_().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Backend belum diaktifkan. Jalankan setupArsip_ dari editor Apps Script.');
  return SpreadsheetApp.openById(id);
}
function folder_() {
  const id = props_().getProperty('PHOTO_FOLDER_ID');
  if (!id) throw new Error('Folder foto belum disiapkan.');
  return DriveApp.getFolderById(id);
}
function table_(book,name) {
  const sheet = book.getSheetByName(name);
  if (!sheet) throw new Error('Tab '+name+' tidak ditemukan.');
  const values = sheet.getDataRange().getValues();
  const keys = SCHEMA[name];
  if (JSON.stringify(values[0].slice(0,keys.length)) !== JSON.stringify(keys)) throw new Error('Kolom '+name+' berubah. Pulihkan susunan kolom sebelum melanjutkan.');
  const rows = values.slice(1).map((row,index)=>{
    const obj = {_row:index+2};
    keys.forEach((key,i)=>obj[key]=row[i] instanceof Date?Utilities.formatDate(row[i],'Asia/Jakarta','yyyy-MM-dd'):row[i]??'');
    return obj;
  }).filter(row=>row.id!=='' && row.id!==null);
  return {sheet,rows};
}
function publicRow_(row) { const copy=Object.assign({},row);delete copy._row;return copy; }
function cell_(value) { return {userEnteredValue:typeof value==='number'?{numberValue:value}:typeof value==='boolean'?{boolValue:value}:{stringValue:String(value??'')}}; }
function row_(name,obj) { return {values:SCHEMA[name].map(k=>cell_(obj[k]))}; }
function append_(table,name,obj) { return {appendCells:{sheetId:table.sheet.getSheetId(),rows:[row_(name,obj)],fields:'userEnteredValue'}}; }
function update_(table,name,obj) { return {updateCells:{range:{sheetId:table.sheet.getSheetId(),startRowIndex:obj._row-1,endRowIndex:obj._row,startColumnIndex:0,endColumnIndex:SCHEMA[name].length},rows:[row_(name,obj)],fields:'userEnteredValue'}}; }
function commit_(book,requests) {
  // Google Sheets validates the whole batch and applies it atomically.
  Sheets.Spreadsheets.batchUpdate({requests},book.getId());
}
function nextId_(rows) { return rows.reduce((value,row)=>Math.max(value,Number(row.id)||0),0)+1; }
function str_(body,key,required=false,max=250) {
  const value=body[key]??'';
  if(typeof value!=='string')throw new Error(key+': harus berupa teks.');
  const trimmed=value.trim();
  if(required&&!trimmed)throw new Error(key+': wajib diisi.');
  if(trimmed.length>max)throw new Error(key+': terlalu panjang.');
  return trimmed;
}
function num_(body,key) {
  const value=body[key];
  if(!Number.isInteger(value)||value<0||value>1000000000)throw new Error(key+': gunakan bilangan bulat 0 sampai 1.000.000.000.');
  return value;
}
function date_(body) {
  const value=str_(body,'date')||today_();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||isNaN(new Date(value+'T00:00:00Z').getTime())||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new Error('Tanggal tidak valid.');
  if(value>today_())throw new Error('Tanggal tidak boleh melewati hari ini.');
  return value;
}
function request_(body) {
  const id=str_(body,'request_id',true,80);
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(id))throw new Error('Identitas permintaan tidak valid. Muat ulang formulir.');
  const sorted={};Object.keys(body).sort().forEach(k=>sorted[k]=body[k]);
  const hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(sorted)).map(x=>(x<0?x+256:x).toString(16).padStart(2,'0')).join('');
  return {id,hash};
}
function duplicate_(tables,req) {
  const previous=tables.flatMap(t=>t.rows).find(row=>row.request_id===req.id);
  if(!previous)return false;
  if(previous.request_hash!==req.hash)throw new Error('Permintaan sebelumnya sudah disimpan. Tutup formulir lalu buka lagi untuk perubahan baru.');
  return true;
}
function savePhoto_(body,previous='') {
  if(body.image_data===undefined)return {id:previous,file:null};
  const value=body.image_data;
  if(typeof value!=='string'||value.length>2900000)throw new Error('Foto terlalu besar. Maksimal 2 MB.');
  const match=value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match)throw new Error('Gunakan foto JPG, PNG, atau WebP.');
  const bytes=Utilities.base64Decode(match[2]);
  if(!bytes.length||bytes.length>2*1024*1024)throw new Error('Foto terlalu besar. Maksimal 2 MB.');
  const raw=bytes.map(b=>(b+256)%256);
  const valid=match[1]==='image/png'?raw.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':match[1]==='image/jpeg'?raw[0]===255&&raw[1]===216&&raw[2]===255:String.fromCharCode(...raw.slice(0,4))==='RIFF'&&String.fromCharCode(...raw.slice(8,12))==='WEBP';
  if(!valid)throw new Error('Isi berkas tidak sesuai format foto.');
  const ext=match[1]==='image/jpeg'?'jpg':match[1].split('/')[1];
  const file=folder_().createFile(Utilities.newBlob(bytes,match[1],Utilities.getUuid()+'.'+ext));
  return {id:file.getId(),file};
}
function audit_(table,item,action,before,after,actor,req) {
  return {id:nextId_(table.rows),item_id:item.id,action,before_json:JSON.stringify(before),after_json:JSON.stringify(publicRow_(after)),created_at:time_(),actor_email:actor,request_id:req.id,request_hash:req.hash};
}
function api(action,body) {
  const actor=authorize_();
  if(action==='session')return {authenticated:true,email:actor};
  if(!body||typeof body!=='object'||Array.isArray(body))body={};
  return lock_(()=>{
    const book=book_();
    const itemTable=table_(book,'Barang');
    if(action==='state'){
      const history=table_(book,'Transaksi').rows.map(publicRow_);
      const map=new Map(itemTable.rows.map(i=>[Number(i.id),i]));
      history.forEach(m=>{const i=map.get(Number(m.item_id));if(i){m.name=i.name;m.code=i.code;m.unit=i.unit;}});
      return {items:itemTable.rows.map(publicRow_),movements:history.reverse(),email:actor,spreadsheet_url:book.getUrl(),folder_url:folder_().getUrl()};
    }
    const transactionTable=table_(book,'Transaksi');
    const auditTable=table_(book,'Audit');
    if(action==='backup')return {items:itemTable.rows.map(publicRow_),movements:transactionTable.rows.map(publicRow_),audit:auditTable.rows.map(publicRow_)};
    const req=request_(body);
    if(duplicate_([transactionTable,auditTable],req))return {ok:true,duplicate:true};
    if(action==='addItem'){
      const item={id:nextId_(itemTable.rows),code:str_(body,'code',true).toUpperCase(),name:str_(body,'name',true),category:str_(body,'category',true),unit:str_(body,'unit',true),stock:num_(body,'stock'),min_stock:num_(body,'min_stock'),location:str_(body,'location'),notes:str_(body,'notes',false,2000),image:'',active:1,version:1,updated_at:time_(),seed_filename:''};
      if(itemTable.rows.some(i=>String(i.code).toUpperCase()===item.code))throw new Error('Kode barang sudah digunakan.');
      const image=savePhoto_(body);item.image=image.id;
      const initial={id:nextId_(transactionTable.rows),item_id:item.id,type:'awal',quantity:item.stock,before_stock:0,after_stock:item.stock,date:today_(),person:actor,reference:'',notes:'Saldo awal barang baru.',created_at:time_(),actor_email:actor,request_id:req.id,request_hash:req.hash};
      commit_(book,[append_(itemTable,'Barang',item),append_(transactionTable,'Transaksi',initial)]);
      return {ok:true};
    }
    const id=num_(body,'item_id');
    const old=itemTable.rows.find(i=>Number(i.id)===id);
    if(!old)throw new Error('Barang tidak ditemukan.');
    if(action==='editItem'){
      if(body.version!==Number(old.version))throw new Error('Data sudah berubah. Muat ulang sebelum mengedit.');
      const item=Object.assign({},old,{name:str_(body,'name',true),category:str_(body,'category',true),location:str_(body,'location'),notes:str_(body,'notes',false,2000),min_stock:num_(body,'min_stock'),version:Number(old.version)+1,updated_at:time_()});
      if(str_(body,'unit',true)!==old.unit||str_(body,'code',true).toUpperCase()!==old.code)throw new Error('Kode dan satuan tidak dapat diubah setelah barang dibuat.');
      if(typeof body.active!=='boolean')throw new Error('Status barang tidak valid.');
      if(!body.active&&Number(old.stock)!==0)throw new Error('Stok harus nol sebelum barang diarsipkan.');
      item.active=body.active?1:0;
      const image=savePhoto_(body,old.image);item.image=image.id;
      commit_(book,[update_(itemTable,'Barang',item),append_(auditTable,'Audit',audit_(auditTable,item,'edit',publicRow_(old),item,actor,req))]);
      return {ok:true};
    }
    if(action==='movement'){
      if(!Number(old.active))throw new Error('Pilih barang aktif.');
      const type=str_(body,'type',true);let qty=num_(body,'quantity');const before=Number(old.stock);let after;
      if(type==='masuk'||type==='keluar'){
        if(qty===0)throw new Error('Jumlah harus lebih dari nol.');
        after=before+(type==='masuk'?qty:-qty);
      }else if(type==='koreksi'){
        if(body.version!==Number(old.version))throw new Error('Stok sudah berubah. Muat ulang sebelum koreksi.');
        str_(body,'notes',true,2000);after=qty;qty=after-before;
        if(qty===0)throw new Error('Stok fisik sama dengan stok tercatat.');
      }else throw new Error('Jenis transaksi tidak valid.');
      if(after<0||after>1000000000)throw new Error('Stok tidak cukup atau melebihi batas.');
      const move={id:nextId_(transactionTable.rows),item_id:id,type,quantity:qty,before_stock:before,after_stock:after,date:date_(body),person:str_(body,'person',true),reference:str_(body,'reference'),notes:str_(body,'notes',false,2000),created_at:time_(),actor_email:actor,request_id:req.id,request_hash:req.hash};
      const item=Object.assign({},old,{stock:after,version:Number(old.version)+1,updated_at:time_()});
      commit_(book,[update_(itemTable,'Barang',item),append_(transactionTable,'Transaksi',move)]);
      return {ok:true};
    }
    throw new Error('Fungsi tidak ditemukan.');
  });
}
function getPhoto(fileId) {
  authorize_();
  if(typeof fileId!=='string'||!/^[\w-]{10,200}$/.test(fileId))throw new Error('ID foto tidak valid.');
  const file=DriveApp.getFileById(fileId);const parents=file.getParents();let inFolder=false;
  while(parents.hasNext())if(parents.next().getId()===props_().getProperty('PHOTO_FOLDER_ID'))inFolder=true;
  if(!inFolder||file.isTrashed())throw new Error('Foto tidak ada di folder aplikasi.');
  const blob=file.getBlob();const mime=blob.getContentType();
  if(!['image/png','image/jpeg','image/webp'].includes(mime)||file.getSize()>2*1024*1024)throw new Error('Format foto tidak didukung.');
  return 'data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes());
}
// Hanya dijalankan dari editor. Akhiran _ membuat fungsi tidak tersedia lewat RPC.
function setupArsip_() {
  return lock_(()=>{
    const properties=props_();
    const email=Session.getEffectiveUser().getEmail().trim().toLowerCase();
    if(!email)throw new Error('Jalankan setup dari editor dengan akun Google Anda.');
    if(!properties.getProperty('SPREADSHEET_ID'))properties.setProperty('SPREADSHEET_ID',BACKEND_RESOURCES.spreadsheetId);
    if(!properties.getProperty('ROOT_FOLDER_ID'))properties.setProperty('ROOT_FOLDER_ID',BACKEND_RESOURCES.photoFolderId);
    if(!properties.getProperty('PHOTO_FOLDER_ID'))properties.setProperty('PHOTO_FOLDER_ID',BACKEND_RESOURCES.photoFolderId);
    if(!properties.getProperty('ALLOWED_EMAILS'))properties.setProperty('ALLOWED_EMAILS',JSON.stringify([email]));
    let root;
    if(properties.getProperty('ROOT_FOLDER_ID'))root=DriveApp.getFolderById(properties.getProperty('ROOT_FOLDER_ID'));
    else{root=DriveApp.createFolder('Arsip Persediaan BC Pangkalpinang');properties.setProperty('ROOT_FOLDER_ID',root.getId());}
    let book;
    if(properties.getProperty('SPREADSHEET_ID'))book=SpreadsheetApp.openById(properties.getProperty('SPREADSHEET_ID'));
    else{book=SpreadsheetApp.create('Database Arsip Persediaan BC Pangkalpinang');properties.setProperty('SPREADSHEET_ID',book.getId());DriveApp.getFileById(book.getId()).moveTo(root);}
    book.setSpreadsheetTimeZone('Asia/Jakarta');
    if(!properties.getProperty('PHOTO_FOLDER_ID'))properties.setProperty('PHOTO_FOLDER_ID',root.createFolder('Foto Barang').getId());
    Object.keys(SCHEMA).forEach(name=>{
      let sheet=book.getSheetByName(name);
      if(!sheet){sheet=book.insertSheet(name);sheet.getRange(1,1,1,SCHEMA[name].length).setValues([SCHEMA[name]]);}
      else if(sheet.getLastRow()===0)sheet.getRange(1,1,1,SCHEMA[name].length).setValues([SCHEMA[name]]);
      table_(book,name);
      sheet.setFrozenRows(1);sheet.getRange(1,1,1,SCHEMA[name].length).setBackground('#102e43').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setColumnWidths(1,SCHEMA[name].length,135);
    });
    SpreadsheetApp.flush();
    const itemTable=table_(book,'Barang');const transactionTable=table_(book,'Transaksi');
    if(!properties.getProperty('INITIAL_DATA_IMPORTED')){
      if(itemTable.rows.length||transactionTable.rows.length)throw new Error('Database sudah berisi data. Tidak mengimpor saldo awal lagi.');
      const requests=[];
      INITIAL_ITEMS.forEach((source,index)=>{
        const item=Object.assign({},source,{id:index+1,image:'',active:1,version:1,updated_at:time_()});
        requests.push(append_(itemTable,'Barang',item));
        requests.push(append_(transactionTable,'Transaksi',{id:index+1,item_id:item.id,type:'awal',quantity:item.stock,before_stock:0,after_stock:item.stock,date:today_(),person:'Migrasi arsip sumber',reference:'HTML sumber 8 Oktober 2026',notes:source.notes,created_at:time_(),actor_email:email,request_id:'seed-'+String(index+1).padStart(16,'0'),request_hash:'seed'}));
      });
      commit_(book,requests);properties.setProperty('INITIAL_DATA_IMPORTED','1');
    }
    console.log('Google Sheets: '+book.getUrl());
    console.log('Folder foto: '+folder_().getUrl());
    console.log('Akun diizinkan: '+properties.getProperty('ALLOWED_EMAILS'));
    console.log('Upload isi folder foto-awal ke Foto Barang, lalu jalankan sinkronFotoAwal_.');
  });
}
function sinkronFotoAwal_() {
  const actor=authorize_();
  return lock_(()=>{
    const book=book_();const items=table_(book,'Barang');const audits=table_(book,'Audit');const files=folder_().getFiles();const map={};
    while(files.hasNext()){const f=files.next();if(!f.isTrashed())map[f.getName()]=f.getId();}
    const requests=[];let count=0;
    items.rows.forEach(old=>{
      if(old.image||!old.seed_filename||!map[old.seed_filename])return;
      const item=Object.assign({},old,{image:map[old.seed_filename],version:Number(old.version)+1,updated_at:time_()});
      const audit=audit_(audits,item,'foto_awal',publicRow_(old),item,actor,{id:Utilities.getUuid(),hash:'sinkron-foto'});audit.id+=count;
      requests.push(update_(items,'Barang',item),append_(audits,'Audit',audit));count++;
    });
    if(requests.length)commit_(book,requests);
    console.log(count+' foto barang dihubungkan. Tidak mengubah stok atau menimpa foto yang telah diisi.');
  });
}
