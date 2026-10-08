/* Run only from the editor. This function is not remotely callable. Never reseeds. */
function migrateKnownCorrections_() {
  const actor=authorize_();
  return lock_(()=>{
    const book=book_(),items=table_(book,'Barang'),audits=table_(book,'Audit');
    const known={
      'ARS-002':['Tas Gempur'],
      'ARS-003':['Flayer Imei'],
      'ARS-004':['Flayer Penumpang'],
      'ARS-005':['Flayer Keperluan Ibadah'],
      'ARS-006':['Flayer Prtahanan & Keamanan Negara'],
      'ARS-007':['Notebook'],
      'ARS-008':['Gelas'],
      'ARS-009':['Notebook Pita Cukai'],
      'ARS-010':['Totebag biru'],
      'ARS-015':['Jam'],
      'ARS-022':['Piala Penghargaan']
    };
    const seeds=new Map(INITIAL_ITEMS.map(i=>[i.code,i]));
    const requests=[];let count=0;
    items.rows.forEach(old=>{
      const seed=seeds.get(old.code);if(!seed)return;
      const item=Object.assign({},old);let changed=false;
      if((known[old.code]||[]).some(name=>name.toLowerCase()===String(old.name).trim().toLowerCase())){item.name=seed.name;changed=true;}
      if(old.code==='ARS-019'&&old.seed_filename==='leaflet4.png'){
        item.seed_filename='leaflet1.png';changed=true;
        // Preserve user-uploaded images. Replace only a proven initial-file link.
        const imported=audits.rows.some(a=>{
          if(a.action!=='foto_awal'||Number(a.item_id)!==Number(old.id))return false;
          try{return JSON.parse(a.after_json).image===old.image;}catch{return false;}
        });
        if(imported&&old.image){
          const wrong=DriveApp.getFileById(old.image);
          if(wrong.getName()==='leaflet4.png'){
            const files=folder_().getFiles();let replacement='';
            while(files.hasNext()){const file=files.next();if(!file.isTrashed()&&file.getName()==='leaflet1.png')replacement=file.getId();}
            // Empty reference deliberately uses the corrected public fallback.
            item.image=replacement;
          }
        }
      }
      if(!changed)return;
      item.version=Number(old.version)+1;item.updated_at=time_();
      const audit=audit_(audits,item,'migration_labels',publicRow_(old),item,actor,{id:Utilities.getUuid(),hash:'known-label-corrections-v1'});audit.id+=count++;
      requests.push(update_(items,'Barang',item),append_(audits,'Audit',audit));
    });
    if(requests.length)commit_(book,requests);
    console.log(count+' koreksi terarah. ID, kode, satuan, stok, transaksi, dan nama pengguna dipertahankan.');
    return {corrected:count};
  });
}
