'use strict';
(() => {
  const appUrl = 'https://script.google.com/macros/s/AKfycbx3nGCpNcyp6uIUXtczvOi8NvoRnjYY2F9KcEVhDtDGm-ht5yFw8hAIfiQLr_mxa_P5/exec';
  const live = typeof google !== 'undefined' && Boolean(google.script && google.script.run);
  const byId = id => document.getElementById(id);
  const cards = [...document.querySelectorAll('.menu-card[data-code]')];
  const metadata = new Map(cards.map(card => [card.dataset.code, {
    originalName: card.querySelector('.menu-title h2, .menu-title h3').textContent.trim(),
    seedName: card.dataset.seedName,
    originalPhoto: card.querySelector('img').getAttribute('src')
  }]));
  let items = [], saving = false, photoData = null, totalFrame = null, toastTimer = null;
  const photoCache = new Map();
  const activeItems = () => items.filter(item => Number(item.active));
  const displayName = item => item.name === metadata.get(item.code)?.seedName ? metadata.get(item.code).originalName : item.name;
  const requestId = () => crypto.randomUUID();
  const rpc = (action, body = {}) => new Promise((resolve, reject) => google.script.run
    .withSuccessHandler(resolve).withFailureHandler(error => reject(new Error(error.message || String(error)))).api(action, body));
  const getPhoto = id => new Promise((resolve, reject) => google.script.run
    .withSuccessHandler(resolve).withFailureHandler(reject).getPhoto(id));
  function status(message, error = false) {
    byId('connection-status').textContent = message;
    byId('catalog-status').classList.toggle('error', error);
  }
  function toast(message) {
    byId('catalog-toast').textContent = message; byId('catalog-toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { byId('catalog-toast').hidden = true; }, 4500);
  }
  function animateTotal() {
    cancelAnimationFrame(totalFrame);
    const total = [...document.querySelectorAll('.menu-card:not([hidden]) .angka')].reduce((sum, el) => sum + (Number(el.textContent) || 0), 0);
    const start = performance.now();
    const tick = time => {
      const progress = Math.min((time - start) / 1800, 1);
      byId('totalSouvenir').textContent = Math.floor(total * (1 - Math.pow(1 - progress, 3))).toLocaleString('id-ID');
      if (progress < 1) totalFrame = requestAnimationFrame(tick);
    };
    totalFrame = requestAnimationFrame(tick);
  }
  async function setPhoto(card, item) {
    const image = card.querySelector('.menu-image');
    image.alt = displayName(item);
    if (!item.image) { image.src = metadata.get(item.code)?.originalPhoto || ''; image.hidden = !image.getAttribute('src'); return; }
    try {
      if (!photoCache.has(item.image)) photoCache.set(item.image, getPhoto(item.image));
      const data = await photoCache.get(item.image);
      if (card.dataset.photoId === item.image) { image.src = data; image.hidden = false; }
    } catch (_) { photoCache.delete(item.image); /* Foto asli tetap tampil jika foto baru belum dapat dibaca. */ }
  }
  function updateCards() {
    for (const card of cards) {
      const item = items.find(row => row.code === card.dataset.code);
      card.hidden = !item || !Number(item.active);
      if (!item) continue;
      card.querySelector('.angka').textContent = item.stock;
      card.querySelector('.menu-title h2, .menu-title h3').textContent = displayName(item);
      card.dataset.photoId = item.image || '';
      for (const button of card.querySelectorAll('[data-action]')) button.disabled = saving || (button.dataset.action === 'keluar' && Number(item.stock) === 0);
      void setPhoto(card, item);
    }
    animateTotal();
  }
  async function reload() {
    status('Memuat stok…'); byId('reload-stock').disabled = true;
    try {
      const state = await rpc('state'); items = state.items;
      updateCards(); status('Stok tersimpan · ' + state.email);
      for (const button of document.querySelectorAll('.catalog-menu')) button.disabled = activeItems().length === 0;
    } catch (error) {
      status(error.message, true);
      for (const button of document.querySelectorAll('[data-action]')) button.disabled = true;
      if (!items.length) { cancelAnimationFrame(totalFrame); for (const card of cards) card.querySelector('.angka').textContent = '—'; byId('totalSouvenir').textContent = '—'; }
      throw error;
    } finally { byId('reload-stock').disabled = false; }
  }
  function fillChoices(select, code) {
    select.replaceChildren(...activeItems().map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = displayName(item); return option; }));
    const item = activeItems().find(row => row.code === code) || activeItems()[0];
    if (item) select.value = item.id;
  }
  function selected(form) { return items.find(item => Number(item.id) === Number(form.elements.item_id.value)); }
  function localDate() {
    const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  function movementSelection() {
    const form = byId('movement-form'), item = selected(form); if (!item) return;
    byId('movement-stock').textContent = `Stok saat ini: ${item.stock} ${item.unit}.`;
    form.elements.quantity.max = form.dataset.kind === 'keluar' ? item.stock : 1000000000;
    form.dataset.requestId = requestId(); form.querySelector('.form-error').textContent = '';
  }
  function editSelection() {
    const form = byId('edit-form'), item = selected(form); if (!item) return;
    for (const key of ['code','unit','category','location','min_stock','notes']) form.elements[key].value = item[key] ?? '';
    form.elements.name.value = displayName(item); form.dataset.version = item.version; form.dataset.requestId = requestId();
    form.querySelector('.form-error').textContent = ''; photoData = null; byId('edit-photo').value = ''; byId('edit-photo-preview').hidden = true;
  }
  function openOperation(kind, code = '') {
    if (!live) { const url = new URL(appUrl); url.searchParams.set('page','katalog'); url.searchParams.set('action',kind); if (code) url.searchParams.set('code',code); window.location.assign(url.href); return; }
    if (saving) { toast('Tunggu penyimpanan selesai.'); return; }
    if (!activeItems().length) { toast('Muat data barang terlebih dahulu.'); return; }
    const editing = kind === 'edit', form = byId(editing ? 'edit-form' : 'movement-form');
    form.reset(); fillChoices(form.elements.item_id, code);
    if (editing) editSelection();
    else {
      form.dataset.kind = kind; form.elements.date.value = localDate(); form.elements.date.max = localDate();
      byId('movement-title').textContent = kind === 'keluar' ? 'Barang Keluar' : 'Barang Masuk';
      byId('person-label').textContent = kind === 'keluar' ? 'Penerima / penanggung jawab' : 'Pemasok / penyerah';
      movementSelection();
    }
    byId(editing ? 'edit-dialog' : 'movement-dialog').showModal();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (button) openOperation(button.dataset.action, button.closest('[data-code]')?.dataset.code || '');
    const close = event.target.closest('[data-close]'); if (close && !saving) close.closest('dialog').close();
  });
  for (const dialog of document.querySelectorAll('.catalog-dialog')) dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  byId('movement-form').elements.item_id.addEventListener('change', movementSelection);
  byId('edit-form').elements.item_id.addEventListener('change', editSelection);
  byId('edit-photo').addEventListener('change', async () => {
    const file = byId('edit-photo').files[0], form = byId('edit-form'); photoData = null; byId('edit-photo-preview').hidden = true;
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2*1024*1024) { form.querySelector('.form-error').textContent = 'Gunakan JPG, PNG, atau WebP, maksimal 2 MB.'; byId('edit-photo').value = ''; return; }
    const selectionId = form.elements.item_id.value;
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const loaded = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Foto gagal dibaca.')); reader.readAsDataURL(file); });
      if (selectionId !== form.elements.item_id.value || file !== byId('edit-photo').files[0]) return;
      photoData = loaded;
      byId('edit-photo-preview').src = photoData; byId('edit-photo-preview').hidden = false; form.querySelector('.form-error').textContent = '';
    } catch (error) { form.querySelector('.form-error').textContent = error.message; }
    finally { button.disabled = false; }
  });
  function freeze(form, value) { for (const element of form.elements) element.disabled = value; }
  async function save(form, action, body, message) {
    if (saving) return; saving = true; freeze(form, true); form.querySelector('.form-error').textContent = '';
    try {
      await rpc(action, body); form.closest('dialog').close(); toast(message);
      try { await reload(); } catch (_) { toast('Tersimpan. Klik Muat Ulang untuk mengambil stok terbaru.'); }
    } catch (error) { form.querySelector('.form-error').textContent = error.message; }
    finally { saving = false; freeze(form, false); for (const card of cards) { const item = items.find(row => row.code === card.dataset.code); for (const button of card.querySelectorAll('[data-action]')) button.disabled = !item || (button.dataset.action === 'keluar' && Number(item.stock) === 0); } }
  }
  byId('movement-form').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget;
    const body = {request_id:form.dataset.requestId,item_id:Number(form.elements.item_id.value),type:form.dataset.kind,quantity:Number(form.elements.quantity.value)};
    for (const key of ['date','person','reference','notes']) body[key] = form.elements[key].value;
    void save(form,'movement',body,'Transaksi tersimpan. Stok sudah diperbarui.');
  });
  byId('edit-form').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget;
    const body = {request_id:form.dataset.requestId,item_id:Number(form.elements.item_id.value),version:Number(form.dataset.version),min_stock:Number(form.elements.min_stock.value),active:true};
    for (const key of ['code','unit','name','category','location','notes']) body[key] = form.elements[key].value;
    if (photoData) body.image_data = photoData;
    void save(form,'editItem',body,'Perubahan barang tersimpan.');
  });
  byId('reload-stock').addEventListener('click', () => { if (!saving) void reload().catch(() => {}); });
  byId('open-live').href = appUrl + '?page=katalog';
  (async () => {
    if (!live) { status('Pratinjau saldo awal. Masuk akun Google untuk melihat dan memperbarui stok terkini.'); byId('open-live').hidden = false; byId('reload-stock').hidden = true; animateTotal(); return; }
    for (const button of document.querySelectorAll('[data-action]')) button.disabled = true;
    for (const card of cards) card.querySelector('.angka').textContent = '…'; byId('totalSouvenir').textContent = '…';
    try { await reload();
      const action = document.body.dataset.initialAction, code = document.body.dataset.initialCode;
      if (['masuk','keluar','edit'].includes(action)) openOperation(action,code);
    } catch (_) { /* Pesan kegagalan dan tombol muat ulang tetap tersedia. */ }
  })();
})();
