const https=require('https');
module.exports=function(app,cfg){
const T=cfg.GITHUB_TOKEN,O=cfg.GITHUB_OWNER,R=cfg.GITHUB_REPO,ADM=cfg.ADMIN_EMAIL,B='main';
const C={m:[],u:{},ms:null,us:null},ON=new Map(),TTL=30000;
function gh(m,p,b){return new Promise((res,rej)=>{const d=b?JSON.stringify(b):null;
const o={hostname:'api.github.com',port:443,path:'/repos/'+O+'/'+R+p,method:m,
headers:{Authorization:'Bearer '+T,'User-Agent':'chat','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}};
if(d){o.headers['Content-Type']='application/json';o.headers['Content-Length']=Buffer.byteLength(d);}
const r=https.request(o,x=>{const ch=[];x.on('data',c=>ch.push(c));x.on('end',()=>{
const raw=Buffer.concat(ch).toString('utf8');if(x.statusCode===404)return res(null);
if(x.statusCode>=200&&x.statusCode<300){try{res(JSON.parse(raw));}catch(e){res(raw);}}
else rej(new Error('GH '+x.statusCode+': '+raw.slice(0,200)));});});
r.on('error',rej);if(d)r.write(d);r.end();});}
async function gGet(p){const r=await gh('GET','/contents/'+p+'?ref='+B);if(!r)return{json:null,sha:null};
const t=Buffer.from(r.content||'','base64').toString('utf8');let j=null;try{j=JSON.parse(t);}catch(e){}
return{json:j,sha:r.sha};}
async function gPut(p,j,sha,msg){const b={message:msg||'up '+p,content:Buffer.from(JSON.stringify(j,null,2),'utf8').toString('base64'),branch:B};
if(sha)b.sha=sha;return await gh('PUT','/contents/'+p,b);}
async function gPutBin(p,buf,msg){let sha=null;try{const e=await gh('GET','/contents/'+p+'?ref='+B);if(e)sha=e.sha;}catch(e){}
const b={message:msg,content:buf.toString('base64'),branch:B};if(sha)b.sha=sha;return await gh('PUT','/contents/'+p,b);}
async function load(){try{const m=await gGet('messages.json');if(m.json&&Array.isArray(m.json))C.m=m.json;C.ms=m.sha;}catch(e){console.error('[chat] msg err',e.message);}
try{const u=await gGet('users.json');if(u.json&&typeof u.json==='object')C.u=u.json;C.us=u.sha;}catch(e){console.error('[chat] usr err',e.message);}
console.log('[chat] loaded '+C.m.length+' msg, '+Object.keys(C.u).length+' usr');}
function uid(){return 'm_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
function now(){const d=new Date(),p=n=>n<10?'0'+n:''+n;
return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());}
function isAdm(e){return e===ADM;}
function ui(e){if(isAdm(e))return{email:e,nickname:'Badr',isAdmin:true};
const u=C.u[e]||{};return{email:e,nickname:u.nickname||e.split('@')[0],isAdmin:false};}
setInterval(()=>{const n=Date.now();for(const[e,t]of ON)if(n-t>TTL)ON.delete(e);},10000);
function auth(rq,rs,nx){if(!rq.session||!rq.session.user)return rs.status(401).json({ok:false,error:'no auth'});nx();}
app.get('/api/chat/me',auth,(rq,rs)=>{ON.set(rq.session.user,Date.now());rs.json({ok:true,me:ui(rq.session.user)});});
app.get('/api/chat/online',(rq,rs)=>{if(rq.session&&rq.session.user)ON.set(rq.session.user,Date.now());rs.json({ok:true,online:ON.size});});
app.post('/api/chat/heartbeat',auth,(rq,rs)=>{ON.set(rq.session.user,Date.now());rs.json({ok:true,online:ON.size,me:ui(rq.session.user)});});
app.get('/api/chat/messages',auth,(rq,rs)=>{ON.set(rq.session.user,Date.now());
const since=String(rq.query.since||'');let list=C.m;
if(since){const i=list.findIndex(x=>x.id===since);if(i>=0)list=list.slice(i+1);}
list=list.slice(-200);rs.json({ok:true,messages:list,total:list.length});});
app.post('/api/chat/set-nickname',auth,async(rq,rs)=>{const e=rq.session.user;
if(isAdm(e))return rs.status(403).json({ok:false,error:'admin fixed'});
let n=String(rq.body.nickname||'').trim().slice(0,24);if(n.length<2)return rs.status(400).json({ok:false,error:'short'});
C.u[e]={nickname:n,updated_at:now()};
try{const r=await gPut('users.json',C.u,C.us,'nick '+n);C.us=r.content?r.content.sha:C.us;}catch(err){return rs.status(500).json({ok:false,error:'gh fail'});}
rs.json({ok:true,nickname:n});});
app.post('/api/chat/send',auth,async(rq,rs)=>{const e=rq.session.user;
const txt=String(rq.body.text||'').trim().slice(0,1000);
const ph=String(rq.body.photo||'').trim();
const rep=String(rq.body.replyTo||'').trim();
if(!txt&&!ph)return rs.status(400).json({ok:false,error:'empty'});
const info=ui(e),id=uid();let pu=null;
if(ph&&ph.indexOf('data:image/')===0){const m=ph.match(/^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/i);
if(!m)return rs.status(400).json({ok:false,error:'bad img'});
const ext=m[1].toLowerCase()==='jpeg'?'jpg':m[1].toLowerCase();
const buf=Buffer.from(m[2],'base64');if(buf.length>5*1024*1024)return rs.status(400).json({ok:false,error:'big'});
const pp='photos/'+id+'.'+ext;
try{await gPutBin(pp,buf,'photo '+id);pu='https://raw.githubusercontent.com/'+O+'/'+R+'/'+B+'/'+pp;}catch(err){return rs.status(500).json({ok:false,error:'photo gh fail'});}}
let rt=null;if(rep){const t=C.m.find(x=>x.id===rep);if(t)rt={id:t.id,nickname:t.nickname,text:(t.text||'').slice(0,100)||(t.photo?'[photo]':'')};}
const msg={id,user:e,nickname:info.nickname,isAdmin:info.isAdmin,text:txt,photo:pu,replyTo:rt,created_at:now()};
C.m.push(msg);if(C.m.length>2000)C.m=C.m.slice(-2000);
try{const r=await gPut('messages.json',C.m,C.ms,'msg '+id);C.ms=r.content?r.content.sha:C.ms;}catch(err){console.error('[chat] save err',err.message);}
rs.json({ok:true,message:msg});});
setTimeout(load,500);};
