(function(){var E={l:document.getElementById('chatList'),f:document.getElementById('chatForm'),
i:document.getElementById('chatInput'),fl:document.getElementById('chatFile'),
p:document.getElementById('chatPreview'),pi:document.getElementById('chatPreviewImg'),
pr:document.getElementById('chatPreviewRemove'),rb:document.getElementById('chatReplyBox'),
rn:document.getElementById('chatReplyNick'),rt:document.getElementById('chatReplyText'),
rc:document.getElementById('chatReplyCancel'),o:document.getElementById('chatOnline'),
mn:document.getElementById('chatMeNick'),cn:document.getElementById('chatChangeNick'),
s:document.getElementById('chatSendBtn'),st:document.getElementById('chatStatus')};
if(!E.l)return;var S={me:null,msgs:[],last:'',rep:null,ph:null};
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function api(u,o){return fetch(u,o||{}).then(r=>r.json());}
function fm(f){var d=new FormData();for(var k in f)if(f[k]!=null)d.append(k,f[k]);return d;}
function rMsg(m){var d=document.createElement('div');d.className='chat-msg'+(m.isAdmin?' chat-msg-admin':'');d.dataset.id=m.id;
var a=document.createElement('div');a.className='chat-msg-avatar'+(m.isAdmin?' chat-msg-avatar-admin':'');
a.textContent=(m.nickname||'?').charAt(0).toUpperCase();
var b=document.createElement('div');b.className='chat-msg-body';
var h=document.createElement('div');h.className='chat-msg-head';
h.innerHTML='<span class="chat-msg-nick">'+esc(m.nickname)+'</span>'+
(m.isAdmin?'<span class="chat-msg-check" title="admin"><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>':'')+
'<span class="chat-msg-time">'+(m.created_at||'').slice(11,16)+'</span>';
b.appendChild(h);
if(m.replyTo){var r=document.createElement('div');r.className='chat-msg-reply';
r.innerHTML='<b>'+esc(m.replyTo.nickname)+'</b> '+esc(m.replyTo.text);b.appendChild(r);}
if(m.text){var t=document.createElement('div');t.className='chat-msg-text';t.textContent=m.text;b.appendChild(t);}
if(m.photo){var w=document.createElement('a');w.className='chat-msg-photo';w.href=m.photo;w.target='_blank';w.rel='noopener';
var im=document.createElement('img');im.src=m.photo;im.loading='lazy';w.appendChild(im);b.appendChild(w);}
var ac=document.createElement('div');ac.className='chat-msg-actions';
var rb=document.createElement('button');rb.type='button';rb.className='chat-msg-reply-btn';rb.textContent='Ответить';
rb.onclick=()=>setRep(m);ac.appendChild(rb);b.appendChild(ac);
d.appendChild(a);d.appendChild(b);return d;}
function app(list){var bt=E.l.scrollHeight-E.l.scrollTop-E.l.clientHeight<80;
list.forEach(m=>{if(S.msgs.some(x=>x.id===m.id))return;S.msgs.push(m);E.l.appendChild(rMsg(m));});
if(bt)E.l.scrollTop=E.l.scrollHeight;}
function hb(){api('/api/chat/heartbeat',{method:'POST'}).then(r=>{if(r.ok){E.o.textContent=r.online;S.me=r.me;E.mn.textContent=r.me.nickname;}}).catch(()=>{});}
function poll(){var u='/api/chat/messages'+(S.last?'?since='+encodeURIComponent(S.last):'');
api(u).then(r=>{if(r.ok&&r.messages.length){app(r.messages);S.last=r.messages[r.messages.length-1].id;}}).catch(()=>{});}
function setRep(m){S.rep=m;E.rb.style.display='flex';E.rn.textContent=m.nickname;
E.rt.textContent=(m.text||'').slice(0,80)||'фото';E.i.focus();}
function clearRep(){S.rep=null;E.rb.style.display='none';}
E.fl.addEventListener('change',()=>{var f=E.fl.files[0];if(!f)return;
if(f.size>5*1024*1024){alert('фото >5MB');E.fl.value='';return;}
var rd=new FileReader();rd.onload=e=>{S.ph=e.target.result;E.pi.src=S.ph;E.p.style.display='flex';};rd.readAsDataURL(f);});
E.pr.addEventListener('click',()=>{S.ph=null;E.fl.value='';E.p.style.display='none';});
E.cn.addEventListener('click',()=>{if(S.me&&S.me.isAdmin){alert('админ = Badr');return;}
var n=prompt('Ник (2-24):',S.me?S.me.nickname:'');if(!n)return;n=n.trim();if(n.length<2)return alert('мало');
api('/api/chat/set-nickname',{method:'POST',body:fm({nickname:n})}).then(r=>{
if(r.ok){S.me.nickname=r.nickname;E.mn.textContent=r.nickname;alert('OK: '+r.nickname);}else alert(r.error);});});
E.f.addEventListener('submit',e=>{e.preventDefault();
var t=E.i.value.trim();if(!t&&!S.ph)return;E.s.disabled=true;E.st.textContent='отправка...';
var pl={text:t};if(S.ph)pl.photo=S.ph;if(S.rep)pl.replyTo=S.rep.id;
api('/api/chat/send',{method:'POST',body:fm(pl)}).then(r=>{E.s.disabled=false;
if(r.ok){E.i.value='';E.st.textContent='';S.ph=null;E.fl.value='';E.p.style.display='none';clearRep();
S.msgs.push(r.message);E.l.appendChild(rMsg(r.message));E.l.scrollTop=E.l.scrollHeight;S.last=r.message.id;}
else E.st.textContent=r.error||'err';}).catch(()=>{E.s.disabled=false;E.st.textContent='net';});});
E.rc.addEventListener('click',clearRep);
E.i.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();E.f.dispatchEvent(new Event('submit',{cancelable:true}));}});
hb();poll();setInterval(poll,3000);setInterval(hb,10000);})();
