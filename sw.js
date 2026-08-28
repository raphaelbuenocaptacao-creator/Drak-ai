const CACHE='drak-ai-pwa-v1';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.svg','./icon-512.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

function safe(request,url){
  if(request.method!=='GET' || request.headers.has('authorization') || url.origin!==self.location.origin) return false;
  const p=url.pathname.toLowerCase();
  if(p.includes('/api/')||p.includes('/auth')||p.includes('/login')||p.includes('/admin')||p.includes('/session')||p.includes('/token')) return false;
  return true;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(!safe(request,url)) return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response && response.ok && response.type==='basic'){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy));
    }
    return response;
  })));
});
