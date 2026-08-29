const CACHE='drak-ai-shell-v2';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.svg','./icon-512.svg','./icon-512-maskable.svg'];
const APP_SHELL_PATHS=new Set(APP_SHELL.map(item=>new URL(item,self.location.href).pathname));

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

function isPrivateOrUnsafe(request,url){
  if(request.method!=='GET' || url.origin!==self.location.origin) return true;
  if(request.headers.has('authorization') || request.headers.has('cookie')) return true;
  const p=url.pathname.toLowerCase();
  return ['/api/','/auth','/login','/logout','/admin','/session','/token','/password','/profile','/account'].some(part=>p.includes(part));
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(isPrivateOrUnsafe(request,url)) return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match('./index.html')));
    return;
  }

  if(!APP_SHELL_PATHS.has(url.pathname)) return;
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
