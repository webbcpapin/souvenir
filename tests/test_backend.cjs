// Mock layanan Google. Tidak memakai atau mengubah akun Google pengguna.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),props=new Map(),books=new Map(),folders=new Map(),files=new Map();let email='owner@example.test',seq=0,locked=false,failBatch=false;
const uuid=()=>crypto.randomUUID(),iter=rows=>{let i=0;return{hasNext:()=>i<rows.length,next:()=>rows[i++]}};
class Sheet{
 constructor(name){this.name=name;this.id=++seq;this.grid=[];}
 getSheetId(){return this.id} getLastRow(){return this.grid.length} getDataRange(){return {getValues:()=>this.grid.length?this.grid.map(r=>[...r]):[['']]}}
 getRange(r,c,n,m){const self=this;return{setValues(values){for(let i=0;i<n;i++){self.grid[r+i-1]??=[];for(let j=0;j<m;j++)self.grid[r+i-1][c+j-1]=values[i][j]}return this},setBackground(){return this},setFontColor(){return this},setFontWeight(){return this}}}
 setFrozenRows(){}setColumnWidths(){}
}
class Book{
 constructor(){this.id='book-'+uuid();this.tabs=[];books.set(this.id,this)}getId(){return this.id}getUrl(){return 'https://docs.google.com/spreadsheets/d/'+this.id}getSheetByName(n){return this.tabs.find(s=>s.name===n)}insertSheet(n){const s=new Sheet(n);this.tabs.push(s);return s}setSpreadsheetTimeZone(){}
}
class Folder{
 constructor(name){this.id='folder-'+uuid();this.name=name;folders.set(this.id,this)}getId(){return this.id}getUrl(){return 'https://drive.google.com/drive/folders/'+this.id}createFolder(n){return new Folder(n)}getFiles(){return iter([...files.values()].filter(f=>f.parent===this&&!f.trashed))}createFile(blob){return new File(blob,this)}
}
class File{
 constructor(blob,parent){this.id='file-'+uuid();this.blob=blob;this.parent=parent;this.trashed=false;files.set(this.id,this)}getId(){return this.id}getName(){return this.blob.name}getParents(){return iter([this.parent])}getBlob(){return{getContentType:()=>this.blob.mime,getBytes:()=>this.blob.bytes}}getSize(){return this.blob.bytes.length}isTrashed(){return this.trashed}setTrashed(v){this.trashed=v;return this}
}
const ctx=vm.createContext({console,Date,Map,JSON,Number,Array,String,Error,Object,RegExp,Math,
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},
 Session:{getActiveUser:()=>({getEmail:()=>email}),getEffectiveUser:()=>({getEmail:()=>email})},
 LockService:{getScriptLock:()=>({tryLock(){if(locked)return false;locked=true;return true},releaseLock(){locked=false}})},
 Utilities:{getUuid:uuid,formatDate:(_d,_z,f)=>f==='yyyy-MM-dd'?'2026-10-08':'2026-10-08T17:00:00+07:00',DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_a,s)=>[...crypto.createHash('sha256').update(s).digest()],base64Decode:s=>[...Buffer.from(s,'base64')],base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name})},
 SpreadsheetApp:{create:()=>new Book(),openById:id=>books.get(id),flush(){}},
 DriveApp:{createFolder:n=>new Folder(n),getFolderById:id=>{assert(folders.has(id));return folders.get(id)},getFileById:id=>books.has(id)?{moveTo(){}}:files.get(id)},
 Sheets:{Spreadsheets:{batchUpdate:(body,id)=>{if(failBatch)throw new Error('Simulasi layanan Google gagal');const book=books.get(id),clones=new Map(book.tabs.map(s=>[s.id,s.grid.map(r=>[...r])]));for(const req of body.requests){const spec=req.appendCells||req.updateCells;const grid=clones.get(spec.sheetId??spec.range.sheetId);const rows=spec.rows.map(r=>r.values.map(c=>Object.values(c.userEnteredValue)[0]));if(req.appendCells)grid.push(...rows);else grid[spec.range.startRowIndex]=rows[0];}for(const s of book.tabs)s.grid=clones.get(s.id);}}}
});
vm.runInContext(fs.readFileSync(path.join(root,'apps-script/Seed.gs'),'utf8')+'\n'+fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'apps-script/Migration.gs'),'utf8'),ctx);
// Simulasikan database dan folder yang telah diberikan, termasuk tab lain yang harus dipertahankan.
const backendResources=vm.runInContext('BACKEND_RESOURCES',ctx);
const providedBook=new Book();books.delete(providedBook.id);providedBook.id=backendResources.spreadsheetId;books.set(providedBook.id,providedBook);
providedBook.insertSheet('Sheet1').grid=[['Tab yang sudah ada']];
const providedFolder=new Folder('Souvenir');folders.delete(providedFolder.id);providedFolder.id=backendResources.photoFolderId;folders.set(providedFolder.id,providedFolder);
const api=(name,body)=>ctx.api(name,body),req=body=>({...body,request_id:uuid()}),state=()=>api('state'),find=code=>state().items.find(i=>i.code===code);
const cases=[];function test(name,fn){fn();cases.push(name);console.log('PASS:',name)}
test('Setup memakai database dan folder yang diberikan, mempertahankan tab lama, dan tidak menggandakan 22 saldo awal.',()=>{ctx.setupArsip_();assert.equal(props.get('SPREADSHEET_ID'),providedBook.id);assert.equal(props.get('PHOTO_FOLDER_ID'),providedFolder.id);assert.equal(books.size,1);assert.equal(folders.size,1);assert.equal(providedBook.getSheetByName('Sheet1').grid[0][0],'Tab yang sudah ada');assert.equal(state().items.length,22);assert.equal(state().movements.length,22);ctx.setupArsip_();assert.equal(state().items.length,22)});
test('Folder foto privat, sinkronisasi 22 foto awal, pembacaan foto melalui backend.',()=>{const folder=folders.get(props.get('PHOTO_FOLDER_ID'));for(const filename of fs.readdirSync(path.join(root,'foto-awal'))){const bytes=[...fs.readFileSync(path.join(root,'foto-awal',filename))];folder.createFile({bytes,mime:filename.endsWith('.png')?'image/png':'image/jpeg',name:filename});}ctx.sinkronFotoAwal_();assert(state().items.every(i=>i.image));assert(ctx.getPhoto(find('ARS-019').image).startsWith('data:image/png;base64,'));assert.equal(files.get(find('ARS-019').image).getName(),'leaflet1.png')});
test('Akun di luar daftar akses ditolak pada data dan foto.',()=>{const image=find('ARS-019').image;email='stranger@example.test';assert.throws(()=>state(),/belum mendapat akses/);assert.throws(()=>ctx.getPhoto(image),/belum mendapat akses/);email='owner@example.test'});
const newItem=req({code:'TEST-01',name:'Barang Uji',category:'Suvenir',unit:'buah',stock:5,min_stock:2,location:'Rak 1',notes:''});
test('Tambah dan pengiriman ulang identik hanya menghasilkan satu barang dan saldo awal.',()=>{api('addItem',newItem);const count=state().items.length;assert(api('addItem',newItem).duplicate);assert.equal(state().items.length,count);assert.equal(find('TEST-01').stock,5);assert.throws(()=>api('addItem',req({...newItem,request_id:undefined})),/Kode barang/) });
test('Keluar mengurangi stok, masuk menambah stok, transaksi ulang tidak menggandakan stok.',()=>{const item=find('TEST-01');const move=req({item_id:item.id,type:'keluar',quantity:3,person:'Peserta',notes:'Kegiatan',date:'2026-10-08'});api('movement',move);api('movement',move);assert.equal(find('TEST-01').stock,2);api('movement',req({...move,type:'masuk',quantity:4}));assert.equal(find('TEST-01').stock,6)});
test('Penolakan stok negatif, pecahan, tanggal mendatang dan tanggal kalender keliru.',()=>{const base={item_id:find('TEST-01').id,type:'keluar',quantity:7,person:'Penguji'};assert.throws(()=>api('movement',req(base)),/Stok tidak cukup/);assert.throws(()=>api('movement',req({...base,quantity:1.5})),/bilangan bulat/);assert.throws(()=>api('movement',req({...base,quantity:1,date:'2027-01-01'})),/melewati/);assert.throws(()=>api('movement',req({...base,quantity:1,date:'2026-02-30'})),/Tanggal tidak valid/);assert.equal(find('TEST-01').stock,6)});
test('Edit dan foto baru tersimpan. Edit versi lama dan perubahan satuan ditolak.',()=>{const item=find('TEST-01');const bytes=fs.readFileSync(path.join(root,'foto-awal/pin.png'));const edit=req({...item,item_id:item.id,active:true,name:'Nama Baru',image_data:'data:image/png;base64,'+bytes.toString('base64')});api('editItem',edit);const updated=find('TEST-01');assert.equal(updated.name,'Nama Baru');assert(ctx.getPhoto(updated.image).startsWith('data:image/png'));assert.throws(()=>api('editItem',req(edit)),/sudah berubah/);assert.throws(()=>api('editItem',req({...updated,item_id:updated.id,active:true,unit:'pak'})),/Kode dan satuan/)});
test('Koreksi berselisih dicatat. Versi lama, tanpa alasan, dan arsip dengan stok ditolak.',()=>{const i=find('TEST-01');assert.throws(()=>api('editItem',req({...i,item_id:i.id,active:false})),/Stok harus nol/);assert.throws(()=>api('movement',req({item_id:i.id,version:i.version,type:'koreksi',quantity:1,person:'Penguji',notes:''})),/wajib/);const move=req({item_id:i.id,version:i.version,type:'koreksi',quantity:1,person:'Penguji',notes:'Hasil fisik'});api('movement',move);assert.equal(find('TEST-01').stock,1);assert.equal(state().movements.find(m=>m.request_id===move.request_id).quantity,-5);assert.throws(()=>api('movement',req(move)),/sudah berubah/)});
test('Batch gagal tidak mengubah stok atau riwayat, dan lock dilepas.',()=>{const i=find('TEST-01'),count=state().movements.length;failBatch=true;assert.throws(()=>api('movement',req({item_id:i.id,type:'masuk',quantity:3,person:'Petugas'})),/Simulasi/);failBatch=false;assert.equal(find('TEST-01').stock,1);assert.equal(state().movements.length,count);assert.equal(locked,false)});
test('Arsip stok nol, penolakan transaksi nonaktif dan pemulihan barang aktif.',()=>{let i=find('TEST-01');api('movement',req({item_id:i.id,type:'keluar',quantity:1,person:'Penerima'}));i=find('TEST-01');api('editItem',req({...i,item_id:i.id,active:false}));assert.throws(()=>api('movement',req({item_id:i.id,type:'masuk',quantity:1,person:'Penerima'})),/barang aktif/);i=find('TEST-01');api('editItem',req({...i,item_id:i.id,active:true}));assert.equal(find('TEST-01').active,1)});
test('Foto SVG ditolak. Foto di luar folder aplikasi tidak dapat diakses.',()=>{assert.throws(()=>api('addItem',req({...newItem,code:'TEST-SVG',image_data:'data:image/svg+xml;base64,PHN2Zz4='})),/JPG/);const outside=new Folder('Di luar aplikasi').createFile({name:'test.png',mime:'image/png',bytes:[1]});assert.throws(()=>ctx.getPhoto(outside.id),/folder aplikasi/)});
test('Jejak edit mencatat email pengubah. Header yang berubah menghentikan penulisan.',()=>{const book=books.get(props.get('SPREADSHEET_ID'));assert(book.getSheetByName('Audit').grid.slice(1).every(row=>row[6]==='owner@example.test'));const sheet=book.getSheetByName('Barang');const original=sheet.grid[0][1];sheet.grid[0][1]='rusak';assert.throws(()=>api('addItem',req({...newItem,code:'TEST-HEADER'})),/Kolom Barang berubah/);sheet.grid[0][1]=original});
test('Hapus dan restore: audit, versi, dedup, foto dan riwayat tetap utuh.',()=>{
 let i=find('TEST-01');assert.equal(i.stock,0);const photo=i.image,count=state().movements.length;
 const remove=req({item_id:i.id,version:i.version});api('deleteItem',remove);assert(api('deleteItem',remove).duplicate);
 assert.equal(find('TEST-01').active,0);assert.equal(find('TEST-01').image,photo);assert.equal(state().movements.length,count);
 const audit=api('backup').audit.find(a=>a.request_id===remove.request_id);assert.equal(audit.action,'delete');assert.equal(audit.actor_email,'owner@example.test');
 assert.throws(()=>api('restoreItem',req(remove)),/sudah berubah/);
 i=find('TEST-01');api('restoreItem',req({item_id:i.id,version:i.version}));assert.equal(find('TEST-01').active,1);
 api('movement',req({item_id:i.id,type:'masuk',quantity:1,person:'TEST'}));i=find('TEST-01');assert.throws(()=>api('deleteItem',req({item_id:i.id,version:i.version})),/Stok harus nol/);
});
test('Foto pada tambah dan edit, validasi wajib/bilangan/kode, tidak mengubah stok saat edit.',()=>{
 const png='data:image/png;base64,'+fs.readFileSync(path.join(root,'foto-awal/pin.png')).toString('base64');
 api('addItem',req({...newItem,code:'TEST-PHOTO',image_data:png}));let i=find('TEST-PHOTO');const previous=i.image;assert(ctx.getPhoto(i.image).startsWith('data:image/png'));
 api('editItem',req({...i,item_id:i.id,active:true,name:'Foto kedua',image_data:png}));i=find('TEST-PHOTO');assert.notEqual(i.image,previous);assert.equal(i.stock,newItem.stock);assert(files.has(previous));
 assert.throws(()=>api('addItem',req({...newItem,code:'TEST BAD'})),/Kode hanya/);
 assert.throws(()=>api('addItem',req({...newItem,code:'TEST-REQ',name:' '})),/wajib/);
 for(const stock of [-1,1.5])assert.throws(()=>api('addItem',req({...newItem,code:'TEST-NUM',stock})),/bilangan bulat/);
 assert.throws(()=>api('movement',req({item_id:i.id,version:i.version-1,type:'masuk',quantity:1,person:'TEST'})),/sudah berubah/);
});
test('Migrasi terarah idempotent, nama pengguna tidak ditimpa, stok dan riwayat tidak disentuh.',()=>{
 const sheet=providedBook.getSheetByName('Barang');let row=sheet.grid.find(row=>row[1]==='ARS-003');row[2]='Flayer Imei';
 const custom=sheet.grid.find(row=>row[1]==='ARS-007');custom[2]='Nama pilihan pengelola';
 const pcm=sheet.grid.find(row=>row[1]==='ARS-019');pcm[13]='leaflet4.png';
 const before=state().items.map(i=>[i.id,i.code,i.stock,i.unit]);const count=state().movements.length;
 assert.equal(ctx.migrateKnownCorrections_().corrected,2);assert.equal(ctx.migrateKnownCorrections_().corrected,0);
 assert.equal(find('ARS-003').name,'Flyer Pendaftaran IMEI');assert.equal(find('ARS-007').name,'Nama pilihan pengelola');assert.equal(find('ARS-019').seed_filename,'leaflet1.png');
 assert.deepEqual(state().items.map(i=>[i.id,i.code,i.stock,i.unit]),before);assert.equal(state().movements.length,count);
});
console.log('\n'+cases.length+' pengujian logika lulus. Layanan Google memakai mock, bukan pengujian deployment nyata.');
fs.writeFileSync(path.join(root,'tests/HASIL_UJI.txt'),cases.map(n=>'LULUS: '+n).join('\n')+'\n\nUji memakai mock Google Apps Script. Belum uji izin Google, kuota, deployment nyata, dan tampilan browser.\n');
