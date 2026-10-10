(function(){function i(){if(document.getElementById('oc'))return;
var d=document.createElement('div');d.id='oc';
d.style.cssText='position:fixed;left:16px;bottom:16px;z-index:9998;display:inline-flex;align-items:center;gap:8px;'+
'background:rgba(20,24,38,0.92);backdrop-filter:blur(15px);border:1px solid rgba(46,204,113,0.35);'+
'color:#2ecc71;padding:8px 14px;border-radius:30px;font-family:Montserrat,sans-serif;font-size:12px;font-weight:600;'+
'box-shadow:0 4px 15px rgba(0,0,0,0.4);pointer-events:none;user-select:none;';
d.innerHTML='<span style="width:8px;height:8px;border-radius:50%;background:#2ecc71;box-shadow:0 0 8px #2ecc71;"></span>'+
'<span id="ocn">0</span><span style="color:rgba(255,255,255,0.6);">онлайн</span>';
document.body.appendChild(d);
function u(){fetch('/api/chat/online').then(r=>r.json()).then(r=>{if(r.ok){var e=document.getElementById('ocn');if(e)e.textContent=r.online;}}).catch(()=>{});}
u();setInterval(u,15000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',i);else i();})();
