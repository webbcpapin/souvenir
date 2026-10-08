/* Pages renders the UI. This small, authenticated Google popup only transports RPC. */
(() => {
  'use strict';
  const APP = 'https://script.google.com/macros/s/AKfycbx3nGCpNcyp6uIUXtczvOi8NvoRnjYY2F9KcEVhDtDGm-ht5yFw8hAIfiQLr_mxa_P5/exec';
  const native = !!window.google?.script?.run;
  const pending = new Map();
  let popup, peer, origin, channel, connecting, readyResolve, readyReject, timer;
  function googleOrigin(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.port &&
      (url.hostname === 'script.google.com' || /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname)); }
    catch { return false; }
  }
  function disconnect(message) {
    peer = null; clearTimeout(timer);
    readyReject?.(new Error(message)); readyReject = readyResolve = null; connecting = null;
    for (const call of pending.values()) { clearTimeout(call.timer); call.reject(new Error(message)); }
    pending.clear();
    window.dispatchEvent(new CustomEvent('backend-disconnected', {detail:message}));
  }
  window.addEventListener('message', event => {
    const msg = event.data;
    if (!msg || msg.protocol !== 'souvenir-rpc-1' || msg.channel !== channel || !googleOrigin(event.origin)) return;
    try { if (!popup || popup.closed || event.source.top !== popup) return; } catch { return; }
    if (msg.kind === 'ready') {
      if (peer && peer !== event.source) return;
      peer = event.source; origin = event.origin;
      peer.postMessage({protocol:'souvenir-rpc-1', channel, kind:'ack'}, origin);
      clearTimeout(timer); readyResolve?.(); readyResolve = readyReject = null; connecting = null;
    } else if (msg.kind === 'result' && event.source === peer && event.origin === origin) {
      const call = pending.get(msg.id); if (!call) return;
      clearTimeout(call.timer); pending.delete(msg.id);
      msg.ok ? call.resolve(msg.data) : call.reject(new Error(String(msg.error || 'Backend gagal.')));
    }
  });
  function connect() {
    if (native || (peer && popup && !popup.closed)) return Promise.resolve();
    if (connecting && popup && !popup.closed) { popup.focus(); return connecting; }
    channel = crypto.randomUUID(); peer = null;
    connecting = new Promise((resolve,reject) => { readyResolve = resolve; readyReject = reject; });
    const result = connecting;
    popup = window.open(APP+'?page=bridge&channel='+encodeURIComponent(channel), 'souvenir-'+channel,
      'popup,width=540,height=640');
    if (!popup) { disconnect('Jendela Google diblokir. Izinkan pop-up lalu tekan Hubungkan Google.'); return result; }
    timer = setTimeout(() => disconnect('Koneksi Google belum siap. Selesaikan login di jendela Google, tutup jendela tersebut, lalu hubungkan lagi. Pastikan deployment memuat Bridge.html.'), 120000);
    return result;
  }
  function call(action,body = {}) {
    if (native) return new Promise((resolve,reject) => {
      const run = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      action === 'photo' ? run.getPhoto(body.id) : run.api(action,body);
    });
    if (!peer || !popup || popup.closed) return Promise.reject(new Error('Hubungkan akun Google terlebih dahulu. Jendela koneksi harus tetap terbuka.'));
    return new Promise((resolve,reject) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error('Respons belum diterima. Tekan Simpan lagi untuk memeriksa permintaan yang sama; jangan membuat transaksi baru.')); }, 90000);
      pending.set(id,{resolve,reject,timer:timeout});
      peer.postMessage({protocol:'souvenir-rpc-1',channel,kind:'call',id,action,body},origin);
    });
  }
  setInterval(() => { if (peer && popup?.closed) disconnect('Jendela koneksi Google ditutup. Hubungkan lagi untuk melanjutkan.'); },1000);
  window.SouvenirBackend = {connect, api:call, getPhoto:id=>call('photo',{id}), native};
})();
