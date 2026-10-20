/* СЛОВО: autenticación, perfiles aislados y progreso sincronizado. */
(()=>{'use strict';
const cfg=window.SLOVO_SUPABASE_CONFIG||{};
const client=window.supabase?.createClient&&cfg.url&&cfg.publishableKey?window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const originalSave=save,originalRender=render;
const guestKey='slovo_progress_v1';
const key=id=>'slovo_user_'+id,metaKey=id=>'slovo_meta_'+id;
const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const base=()=>defaultState();
let account=null, email='', cloudRow=null, dirty=false,loading=false,syncing=false,modal=false,tab='login',notice='',error='',status='Modo local',conflict=null,timer=null;
function updated(){render()}
function toAccount(session){
 const next=session?.user?.id||null;
 if(account===next)return;
 if(timer)clearTimeout(timer);
 account=next;email=session?.user?.email||'';cloudRow=null;conflict=null;
 if(!account){state={...base(),...(read(guestKey)||{})};dirty=false;status='Sin sesión: progreso local';updated();return}
 const saved=read(key(account));const m=read(metaKey(account))||{};
 state={...base(),...(saved||{})};dirty=!!m.dirty;cloudRow=m.revision??null;status='Conectando…';loading=true;updated();
 void fetchRemote(account);
}
async function fetchRemote(id){
 try{
 const {data,error:e}=await client.from('slovo_progress').select('progress,revision').eq('user_id',id).maybeSingle();
 if(e)throw e;
 if(account!==id)return;
 if(data){
  if(dirty&&JSON.stringify(state)!==JSON.stringify(data.progress)){conflict=data;status='Dos copias diferentes: elige cuál conservar'}
  else{state={...base(),...(data.progress||{})};cloudRow=data.revision;dirty=false;put(key(id),state);put(metaKey(id),{dirty:false,revision:cloudRow});status='Sincronizado'}
 }else{cloudRow=null;status=dirty?'Progreso local pendiente':'Cuenta nueva lista para empezar'}
 }catch(e){status='Sin conexión con la nube; copia local disponible'}
 finally{if(account===id){loading=false;updated();if(dirty&&!conflict)schedule()}}
}
function schedule(){if(!account||!client||loading||conflict)return;if(timer)clearTimeout(timer);timer=setTimeout(()=>void sync(),700)}
save=function(){
 if(!account){originalSave();return}
 if(!put(key(account),state)){toast('Almacenamiento lleno: exporta una copia JSON');return}
 dirty=true;put(metaKey(account),{dirty:true,revision:cloudRow});status='Pendiente de sincronizar';schedule()
};
async function sync(){
 if(!account||loading||syncing||conflict||!dirty||!navigator.onLine)return;
 syncing=true;const id=account,snap=JSON.parse(JSON.stringify(state)),rev=cloudRow;
 status='Sincronizando…';updated();
 try{
 let data,e;
 if(rev===null){
  ({data,error:e}=await client.from('slovo_progress').insert({user_id:id,progress:snap}).select('revision').single());
 }else{
  ({data,error:e}=await client.from('slovo_progress').update({progress:snap}).eq('user_id',id).eq('revision',rev).select('revision').maybeSingle());
 }
 if(e?.code==='23505'||(!e&&!data)){
  const r=await client.from('slovo_progress').select('progress,revision').eq('user_id',id).single();
  if(r.error)throw r.error;
  if(account===id){conflict=r.data;status='Conflicto de versiones: elige cuál conservar'}return
 }
 if(e)throw e;
 if(account!==id)return;
 cloudRow=data.revision;dirty=JSON.stringify(state)!==JSON.stringify(snap);put(metaKey(id),{dirty,revision:cloudRow});status=dirty?'Cambios adicionales pendientes':'Sincronizado en la nube';
 }catch(e){status='Sincronización pendiente. Progreso local conservado'}
 finally{syncing=false;updated();if(dirty&&!conflict)scheduleRetry()}
}
function scheduleRetry(){if(!account)return;if(timer)clearTimeout(timer);timer=setTimeout(()=>void sync(),8000)}
function setCloud(){
 if(!account||!conflict)return;
 state={...base(),...(conflict.progress||{})};cloudRow=conflict.revision;conflict=null;dirty=false;put(key(account),state);put(metaKey(account),{dirty:false,revision:cloudRow});status='Copia de la nube restaurada';updated()
}
function setLocal(){
 if(!account||!conflict)return;
 if(!confirm('Se sustituirá la versión de la nube. Exporta primero un respaldo JSON. ¿Continuar?'))return;
 cloudRow=conflict.revision;conflict=null;dirty=true;put(metaKey(account),{dirty:true,revision:cloudRow});schedule();updated()
}
function migrate(){
 if(!account)return;
 const prior=read(guestKey);if(!prior||!prior.version||!(prior.xp||prior.activityDates?.length||Object.keys(prior.lessons||{}).length)){notice='No existe progreso de invitado para importar';updated();return}
 if(!confirm('Esto reemplazará el progreso de ESTA cuenta con el local. Exporta un respaldo antes. ¿Continuar?'))return;
 state={...base(),...prior};save();modal=false;updated()
}
function authModal(){
 if(!modal)return '';
 return '<div class="cloud-overlay" data-action="cloud-backdrop"><section class="cloud-modal" role="dialog" aria-modal="true" aria-label="Cuenta СЛОВО"><button class="cloud-close" data-action="cloud-close">×</button><span class="eyebrow">СЛОВО · CUENTAS</span><h2>'+(account?'Mi cuenta':'Tu ruso en todos tus dispositivos')+'</h2>'+
 (account?'<p>Sesión: <b>'+esc(email)+'</b></p><p class="cloud-status">'+esc(status)+'</p>'+(conflict?'<div class="cloud-warning"><strong>Hay dos progresos distintos.</strong><p>Guarda una copia JSON antes de elegir.</p><div class="cloud-actions"><button class="btn btn-outline" data-action="cloud-use-cloud">Usar nube</button><button class="btn btn-outline" data-action="cloud-use-local">Usar dispositivo</button></div></div>':'')+'<div class="cloud-actions"><button class="btn btn-primary" data-action="cloud-sync">Sincronizar</button><button class="btn btn-outline" data-action="cloud-migrate">Importar progreso de invitado</button><button class="btn btn-outline" data-action="export">Exportar JSON</button><button class="btn btn-outline" data-action="cloud-signout">Cerrar sesión</button></div>':
 '<div class="cloud-tab-bar"><button data-action="cloud-tab" data-tab="login" class="'+(tab==='login'?'active':'')+'">Iniciar sesión</button><button data-action="cloud-tab" data-tab="signup" class="'+(tab==='signup'?'active':'')+'">Crear cuenta</button></div><form class="cloud-form" id="cloud-auth"><label>Correo</label><input type="email" name="email" autocomplete="email" required maxlength="254"><label>Contraseña</label><input type="password" name="password" minlength="6" required><button class="btn btn-primary" type="submit">'+(tab==='login'?'Entrar':'Registrarme')+'</button></form><div class="cloud-actions"><button class="btn btn-outline" data-action="cloud-recover">Recuperar contraseña</button></div><p class="cloud-note">Confirma tu correo si recibes un enlace de verificación. Las contraseñas las gestiona Supabase.</p>')+
 (notice?'<p class="cloud-status">'+esc(notice)+'</p>':'')+(error?'<p class="cloud-warning">'+esc(error)+'</p>':'')+'</section></div>'
}
render=function(){
 originalRender();
 const top=APP.querySelector('.topbar-metrics');
 if(top)top.insertAdjacentHTML('beforeend','<button class="cloud-trigger" data-action="cloud-open">'+(account?'Mi cuenta':'Iniciar sesión')+'</button>');
 const main=APP.querySelector('.main-content');
 if(main&&page==='home')main.insertAdjacentHTML('afterbegin','<div class="cloud-account-strip"><div><b>'+(account?'✓ Mi progreso':'☁ Tu progreso en todos tus dispositivos')+'</b><span> · '+esc(status)+'</span></div><button data-action="cloud-open">'+(account?'Gestionar cuenta':'Crear cuenta')+' →</button></div>');
 if(main&&page==='settings')main.insertAdjacentHTML('beforeend','<section class="settings-panel"><h2>Cuenta y nube</h2><p>'+esc(status)+'</p><button class="btn btn-primary" data-action="cloud-open">Administrar cuenta</button></section>');
 if(modal)APP.insertAdjacentHTML('beforeend',authModal())
};
APP.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el)return;
 const a=el.dataset.action;
 if(a==='cloud-open'){modal=true;notice='';error='';updated()}
 else if(a==='cloud-close'||(a==='cloud-backdrop'&&e.target===el)){modal=false;updated()}
 else if(a==='cloud-tab'){tab=el.dataset.tab;error='';notice='';updated()}
 else if(a==='cloud-sync'){await sync();updated()}
 else if(a==='cloud-use-cloud')setCloud();
 else if(a==='cloud-use-local')setLocal();
 else if(a==='cloud-migrate')migrate();
 else if(a==='cloud-signout'){if(dirty&&!confirm('Hay datos sin sincronizar. La copia local de esta cuenta seguirá en este dispositivo. ¿Salir?'))return;const r=await client.auth.signOut();if(r.error){error=r.error.message;updated()}else{modal=false;toAccount(null)}}
 else if(a==='cloud-recover'){const mail=prompt('Correo electrónico para recuperar tu contraseña:');if(mail){const r=await client.auth.resetPasswordForEmail(mail,{redirectTo:location.origin+location.pathname});notice=r.error?'':'Revisa tu correo';error=r.error?.message||'';updated()}}
});
APP.addEventListener('submit',async e=>{
 if(e.target.id!=='cloud-auth')return;
 e.preventDefault();const f=e.target,el=f.querySelector('button[type=submit]'),email=f.elements.email.value.trim(),password=f.elements.password.value;
 el.disabled=true;notice='';error='';
 try{if(tab==='signup'){const r=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(r.error)throw r.error;notice=r.data.session?'Cuenta creada':'Revisa tu correo para confirmar la cuenta';if(r.data.session)modal=false}
 else{const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;modal=false}}
 catch(x){error=x.message||'No fue posible autenticar'}
 updated()
});
window.addEventListener('online',()=>{if(dirty)schedule();else if(account&&!loading&&!syncing&&!conflict)void fetchRemote(account)});
function refreshIfIdle(){if(!account||loading||syncing||conflict)return;if(dirty)schedule();else void fetchRemote(account)}
window.addEventListener('focus',refreshIfIdle);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshIfIdle()});
if(client)client.auth.onAuthStateChange((ev,session)=>{
 if(['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(ev))setTimeout(()=>toAccount(session),0);
 if(ev==='PASSWORD_RECOVERY')setTimeout(async()=>{const password=prompt('Nueva contraseña (mínimo 6 caracteres):');if(password?.length>=6){const r=await client.auth.updateUser({password});notice=r.error?'':'Contraseña actualizada';error=r.error?.message||'';modal=true;updated()}},0);
});
render()
})();