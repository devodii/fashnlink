import { publicUrl } from '@/lib/env';

/**
 * Vanilla-JS, no build step, safe to serve verbatim from a bare <script>
 * tag on an arbitrary third-party origin. Walks same-origin <a href> links
 * on every load, dedupes via sessionStorage so a session doesn't re-report
 * the same paths, and batches one fetch back to us with credentials
 * omitted. No cookies, no visitor identification, no page-view tracking.
 */
export function generateTrackingScript(token: string): string {
  const endpoint = `${publicUrl}/api/track`;
  const tokenLiteral = JSON.stringify(token);
  const endpointLiteral = JSON.stringify(endpoint);

  return `(function(){try{var t=${tokenLiteral},e=${endpointLiteral},k="__fashnlink_seen",seen;try{seen=JSON.parse(sessionStorage.getItem(k)||"[]")}catch(_){seen=[]}var seenSet={};for(var i=0;i<seen.length;i++)seenSet[seen[i]]=1;var anchors=document.querySelectorAll("a[href]"),found=[],paths={};for(var j=0;j<anchors.length;j++){var a=anchors[j],u;try{u=new URL(a.getAttribute("href"),location.href)}catch(_){continue}if(u.origin!==location.origin)continue;var p=u.pathname;if(!p||p==="/"||seenSet[p]||paths[p])continue;paths[p]=1;found.push({path:p,linkText:(a.textContent||"").trim().slice(0,120)||null})}if(!found.length)return;var batch=found.slice(0,100);fetch(e,{method:"POST",headers:{"content-type":"application/json"},credentials:"omit",keepalive:true,body:JSON.stringify({token:t,paths:batch})}).then(function(r){if(!r||!r.ok)return;for(var m=0;m<batch.length;m++)seenSet[batch[m].path]=1;try{sessionStorage.setItem(k,JSON.stringify(Object.keys(seenSet)))}catch(_){}}).catch(function(){})}catch(_){}})();`;
}
