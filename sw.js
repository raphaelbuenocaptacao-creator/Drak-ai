const CACHE_PREFIX='drak-ai-shell-';
const CACHE=`${CACHE_PREFIX}v9-safe-shell`;
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.svg','./icon-512.svg','./icon-512-maskable.svg'];
const APP_SHELL_PATHS=new Set(APP_SHELL.map(item=>new URL(item,self.location.href).pathname));
const SENSITIVE_QUERY_KEYS=new Set(['token','access_token','refresh_token','password','passwd','secret','session','auth','authorization','api_key','apikey','key','code','credential','credentials']);

function isCacheableResponse(response){
  if(!response || !response.ok || response.type!=='basic' || response.redirected) return false;
  if(response.status===206 || response.headers.has('content-range')) return false;
  const cacheControl=(response.headers.get('cache-control')||'').toLowerCase();
  if(cacheControl.includes('private') || cacheControl.includes('no-store')) return false;
  if(response.headers.has('set-cookie')) return false;
  return true;
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const asset of APP_SHELL){
      try{
        const request=new Request(asset,{cache:'reload',credentials:'omit',redirect:'error'});
        const response=await fetch(request);
        if(isCacheableResponse(response)) await cache.put(request,response.clone());
      }catch(error){
        console.warn('[DRAK PWA] precache skipped:',asset,error);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

function hasSensitiveQuery(url){
  for(const key of url.searchParams.keys()){
    if(SENSITIVE_QUERY_KEYS.has(String(key).toLowerCase())) return true;
  }
  return false;
}

function isPrivateOrUnsafe(request,url){
  if(request.method!=='GET' || url.origin!==self.location.origin) return true;
  if(request.headers.has('authorization') || request.headers.has('cookie')) return true;
  if(request.headers.has('range') || request.headers.has('if-range')) return true;
  if(hasSensitiveQuery(url)) return true;
  const p=url.pathname.toLowerCase();
  return ['/api/','/auth','/login','/logout','/admin','/session','/token','/password','/profile','/account','/me'].some(part=>p.includes(part));
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(isPrivateOrUnsafe(request,url)) return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        return await fetch(request,{cache:'no-store',redirect:'error'});
      }catch{
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  if(url.search || !APP_SHELL_PATHS.has(url.pathname)) return;
  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached) return cached;
    const response=await fetch(request,{cache:'no-store',redirect:'error'});
    if(isCacheableResponse(response)){
      const cache=await caches.open(CACHE);
      await cache.put(request,response.clone());
    }
    return response;
  })());
});
