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
let passwordOpen=false,passwordBusy=false,passwordNotice='',passwordError='';

/* СЛОВО 5 · identidad personal y perfil seguro */
let profile=null,avatarUrl='',profileOpen=false,profileBusy=false,profileError='',profileFeedback='';
const profilePrefsKey=id=>'slovo_personal_prefs_'+(id||'guest');
let prefs=read(profilePrefsKey(null))||{celebrations:true,sound:true};
const safeName=s=>String(s||'').replace(/[<>&"'\x00-\x1f]/g,'').trim().slice(0,40);
const preferredName=()=>safeName(profile?.display_name)||safeName(email.split('@')[0])||'explorador';
const initials=()=>[...preferredName()].slice(0,2).join('').toUpperCase();
// Vista de perfil de solo lectura para el nuevo diseño, nunca expone tokens ni contraseñas.
window.SLOVO_PROFILE_VIEW=()=>({name:preferredName(),avatarUrl,loggedIn:!!account});
function personalAchievement(){const lessons=Object.values(state.lessons||{}).filter(x=>x?.completed).length;const dialogs=Object.keys(state.dialogues?.completed||{}).length;const xp=state.xp||0;if(lessons>=3)return '🏅 '+lessons+' lecciones superadas';if(dialogs>=1)return '💬 Primer diálogo completado';if(xp>=100)return '✨ Ya alcanzaste 100 XP';if(xp>=10)return '🌱 Has empezado a crecer';return '🎯 Tu próxima conquista comienza hoy'}

const avatarMark=(extra='')=>avatarUrl?'<img class="slovo-avatar-img" src="'+avatarUrl+'" alt="Tu foto de perfil" '+extra+'>':'<span class="slovo-avatar-fallback" aria-hidden="true">'+esc(initials())+'</span>';
function setPrefs(k,value){prefs={...prefs,[k]:!!value};put(profilePrefsKey(account),prefs);updated()}
async function loadProfile(id){
 if(!client||!id)return;
 try{
  const q=await client.from('slovo_profiles').select('display_name,avatar_path').eq('user_id',id).maybeSingle();
  if(q.error)throw q.error;
  if(id!==account)return;
  profile=q.data||{display_name:safeName(email.split('@')[0]),avatar_path:null};
  if(profile.avatar_path){
   const u=await client.storage.from('slovo-avatars').createSignedUrl(profile.avatar_path,3600);
   if(id!==account)return;
   avatarUrl=u.error?'':u.data.signedUrl;
  }else avatarUrl='';
  updated()
 }catch(err){if(id===account){profileError='No se pudo cargar el perfil';updated()}}
}
async function saveProfile(name){
 if(!account||!client||profileBusy)return;
 name=safeName(name);
 if(!name){profileError='Escribe un nombre de 1 a 40 caracteres.';updated();return}
 profileBusy=true;profileError='';updated();
 try{
  const q=await client.from('slovo_profiles').upsert({user_id:account,display_name:name,avatar_path:profile?.avatar_path||null},{onConflict:'user_id'}).select('display_name,avatar_path').single();
  if(q.error)throw q.error;
  profile=q.data;profileFeedback='Perfil guardado y sincronizado';profileOpen=false;
 }catch(e){profileError='No se pudo guardar: '+(e?.message||'error de conexión')}
 finally{profileBusy=false;updated()}
}
async function uploadAvatar(file){
 if(!account||!client||!file||profileBusy)return;
 if(!file.type.startsWith('image/')||file.size>12*1024*1024){profileError='Selecciona una imagen de hasta 12 MB.';updated();return}
 profileBusy=true;profileError='';updated();
 try{
  const bitmap=await createImageBitmap(file);
  const side=Math.min(bitmap.width,bitmap.height),sx=(bitmap.width-side)/2,sy=(bitmap.height-side)/2;
  const c=document.createElement('canvas');c.width=320;c.height=320;
  const cx=c.getContext('2d');cx.drawImage(bitmap,sx,sy,side,side,0,0,320,320);
  if(bitmap.close)bitmap.close();
  const blob=await new Promise((resolve,reject)=>c.toBlob(v=>v?resolve(v):reject(Error('No se pudo procesar la imagen')),'image/jpeg',0.78));
  const path=account+'/avatar.jpg';
  const up=await client.storage.from('slovo-avatars').upload(path,blob,{contentType:'image/jpeg',upsert:true,cacheControl:'60'});
  if(up.error)throw up.error;
  const q=await client.from('slovo_profiles').upsert({user_id:account,display_name:safeName(profile?.display_name)||safeName(email.split('@')[0])||'Explorador',avatar_path:path},{onConflict:'user_id'}).select('display_name,avatar_path').single();
  if(q.error)throw q.error;
  profile=q.data;
  const u=await client.storage.from('slovo-avatars').createSignedUrl(path,3600);
  avatarUrl=u.error?'':u.data.signedUrl;profileFeedback='Foto actualizada en la nube';
 }catch(e){profileError='No se pudo subir tu foto: '+(e?.message||'error de conexión')}
 finally{profileBusy=false;updated()}
}
function profileDialog(){
 return '<div class="cloud-overlay" data-action="profile-backdrop"><section class="cloud-modal slovo-profile-modal" role="dialog" aria-modal="true" aria-label="Personaliza tu perfil"><button type="button" class="cloud-close" data-action="profile-close" aria-label="Cerrar">×</button><span class="eyebrow">TU ESPACIO · СЛОВО</span><h2>Mi perfil</h2><div class="slovo-profile-photo">'+avatarMark()+'</div><p class="slovo-profile-hint">Tu foto es privada y se sincroniza con tus dispositivos.</p><button class="btn btn-outline slovo-photo-button" type="button" data-action="profile-photo" '+(profileBusy?'disabled':'')+'>Cambiar fotografía</button><input type="file" id="slovo-avatar-upload" accept="image/*" hidden><form id="slovo-profile-form" class="cloud-form"><label for="slovo-profile-name">Cómo quieres que te llamemos</label><input id="slovo-profile-name" maxlength="40" name="display_name" autocomplete="nickname" value="'+esc(profile?.display_name||'')+'" required><button type="submit" class="btn btn-primary" '+(profileBusy?'disabled':'')+'>Guardar perfil</button></form>'+(profileError?'<p class="cloud-warning">'+esc(profileError)+'</p>':'')+'</section></div>'
}
function celebration(){
 if(!prefs.celebrations||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const wrap=document.createElement('div');wrap.className='slovo-celebration';wrap.setAttribute('aria-hidden','true');
 const colors=['#91f4c7','#7ed4ff','#ffc985','#c0a8ff'];
 for(let i=0;i<26;i++){const el=document.createElement('i');el.style.setProperty('--x',(Math.random()*100)+'%');el.style.setProperty('--d',(Math.random()*0.7)+'s');el.style.setProperty('--c',colors[i%colors.length]);wrap.appendChild(el)}
 document.body.appendChild(wrap);
 setTimeout(()=>wrap.remove(),1900);
 if(prefs.sound)try{const C=window.AudioContext||window.webkitAudioContext;if(C){const ctx=new C();[660,880,1100].forEach((freq,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+i*.1;osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.045,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.19);osc.connect(gain).connect(ctx.destination);osc.start(start);osc.stop(start+.2)});setTimeout(()=>ctx.close(),800)}}catch(e){}
}
const coreDailyMarkDone=dailyMarkDone;
dailyMarkDone=function(...args){const before=dailyCompletedCount(dailyLog()[today()]||null);const result=coreDailyMarkDone(...args);const after=dailyCompletedCount(dailyLog()[today()]||null);if(after>before)celebration();return result};

function updated(){render()}
function toAccount(session){
 const next=session?.user?.id||null;
 if(account===next)return;
 if(timer)clearTimeout(timer);
 account=next;email=session?.user?.email||'';cloudRow=null;conflict=null;profile=null;avatarUrl='';profileOpen=false;passwordOpen=false;passwordBusy=false;passwordNotice='';passwordError='';prefs=read(profilePrefsKey(next))||{celebrations:true,sound:true};
 if(next)void loadProfile(next);
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
 (account?'<p>Sesión: <b>'+esc(email)+'</b></p><p class="cloud-status">'+esc(status)+'</p>'+(conflict?'<div class="cloud-warning"><strong>Hay dos progresos distintos.</strong><p>Guarda una copia JSON antes de elegir.</p><div class="cloud-actions"><button class="btn btn-outline" data-action="cloud-use-cloud">Usar nube</button><button class="btn btn-outline" data-action="cloud-use-local">Usar dispositivo</button></div></div>':'')+'<section class="cloud-security"><h3>Formas de acceder</h3><p>Tu correo: <strong>'+esc(email)+'</strong>. Puedes seguir entrando con Google y añadir una contraseña a esta misma cuenta.</p><button type="button" class="btn btn-outline" data-action="cloud-password-open">'+(passwordOpen?'Ocultar formulario':'Configurar o cambiar contraseña')+'</button>'+(passwordOpen?'<form id="slovo-password-form" class="cloud-form"><label for="slovo-new-password">Nueva contraseña</label><input id="slovo-new-password" type="password" name="password" autocomplete="new-password" minlength="12" maxlength="128" required placeholder="12 caracteres o más"><label for="slovo-password-confirm">Repite la contraseña</label><input id="slovo-password-confirm" type="password" name="confirm_password" autocomplete="new-password" minlength="12" maxlength="128" required><button class="btn btn-primary" type="submit" '+(passwordBusy?'disabled':'')+'>Guardar contraseña</button><p class="cloud-note">No utilizaremos tu contraseña de Google. Elige otra segura y guarda una copia en tu gestor de contraseñas.</p></form>':'')+(passwordNotice?'<p class="cloud-status" role="status">'+esc(passwordNotice)+'</p>':'')+(passwordError?'<p class="cloud-warning" role="alert">'+esc(passwordError)+'</p>':'')+'</section><div class="cloud-actions"><button class="btn btn-primary" data-action="cloud-sync">Sincronizar</button><button class="btn btn-outline" data-action="cloud-migrate">Importar progreso de invitado</button><button class="btn btn-outline" data-action="export">Exportar JSON</button><button class="btn btn-outline" data-action="cloud-signout">Cerrar sesión</button></div>':
 '<div class="cloud-google-auth"><button type="button" class="cloud-google-button" data-action="cloud-google"><span class="cloud-google-g" aria-hidden="true">G</span><span>Continuar con Google</span></button><div class="cloud-auth-divider"><span>o usa tu correo</span></div></div><div class="cloud-tab-bar"><button data-action="cloud-tab" data-tab="login" class="'+(tab==='login'?'active':'')+'">Iniciar sesión</button><button data-action="cloud-tab" data-tab="signup" class="'+(tab==='signup'?'active':'')+'">Crear cuenta</button></div><form class="cloud-form" id="cloud-auth"><label>Correo</label><input type="email" name="email" autocomplete="email" required maxlength="254"><label>Contraseña</label><input type="password" name="password" minlength="6" required><button class="btn btn-primary" type="submit">'+(tab==='login'?'Entrar':'Registrarme')+'</button></form><div class="cloud-actions"><button class="btn btn-outline" data-action="cloud-recover">Recuperar contraseña</button></div><p class="cloud-note">Confirma tu correo si recibes un enlace de verificación. Las contraseñas las gestiona Supabase.</p>')+
 (notice?'<p class="cloud-status">'+esc(notice)+'</p>':'')+(error?'<p class="cloud-warning">'+esc(error)+'</p>':'')+'</section></div>'
}
render=function(){
 originalRender();
 const top=APP.querySelector('.topbar-metrics');
 if(top)top.insertAdjacentHTML('beforeend','<button class="cloud-trigger" data-action="cloud-open">'+(account?'Mi cuenta':'Iniciar sesión')+'</button>');
 const main=APP.querySelector('.main-content');
 if(main&&page==='home'){
  const intro=main.querySelector('.time-first-title');
  if(intro)intro.insertAdjacentHTML('beforeend','<button type="button" class="cloud-home-entry" data-action="cloud-open" aria-label="'+(account?'Abrir mi cuenta':'Iniciar sesión para sincronizar mi progreso')+'"><span>'+(account?'✓ Cuenta conectada':'☁ ¿Quieres guardar tu progreso?')+'</span><strong>'+(account?'Mi cuenta':'Iniciar sesión')+' →</strong></button>');
 }
 if(main&&page==='home'){const anchor=main.querySelector('.quest-section')||main.querySelector('.time-first');(anchor||main).insertAdjacentHTML(anchor?'afterend':'afterbegin','<div class="cloud-account-strip"><div><b>'+(account?'✓ Mi progreso':'☁ Tu progreso en todos tus dispositivos')+'</b><span> · '+esc(status)+'</span></div><button data-action="cloud-open">'+(account?'Gestionar cuenta':'Crear cuenta')+' →</button></div>');}
 if(main&&page==='settings')main.insertAdjacentHTML('beforeend','<section class="settings-panel"><h2>Cuenta y nube</h2><p>'+esc(status)+'</p><button class="btn btn-primary" data-action="cloud-open">Administrar cuenta</button></section>');
 if(account&&main){
  const hero=main.querySelector('.time-first-title');
  if(page==='home'&&hero)hero.insertAdjacentHTML('afterbegin','<div class="slovo-welcome"><button class="slovo-profile-thumb" type="button" data-action="profile-open" aria-label="Personalizar perfil">'+avatarMark()+'</button><div><span class="eyebrow">ТВОЙ ПУТЬ · TU CAMINO</span><strong>¡Привет, '+esc(preferredName())+'!</strong><small>'+((state.xp||0)>0?'Ya llevas '+(state.xp||0)+' XP. Sigue a tu ritmo.':'Tu primera frase en ruso te espera.')+' · '+esc(personalAchievement())+'</small></div><button class="slovo-edit-profile" data-action="profile-open" type="button">Editar</button></div>');
  if(page==='settings')main.insertAdjacentHTML('beforeend','<section class="settings-panel slovo-personal-settings"><h2>Tu experiencia</h2><p>Personaliza tu perfil y elige cómo celebrar tus avances.</p><button type="button" class="btn btn-outline" data-action="profile-open">Editar nombre y fotografía</button><label class="slovo-setting-row"><span>Celebraciones animadas</span><input type="checkbox" data-action="profile-celebrations" '+(prefs.celebrations?'checked':'')+'></label><label class="slovo-setting-row"><span>Sonido de recompensas</span><input type="checkbox" data-action="profile-sound" '+(prefs.sound?'checked':'')+'></label></section>');
 }
 if(account&&modal){const box=APP.querySelector('.cloud-modal .cloud-actions');if(box)box.insertAdjacentHTML('afterbegin','<button type="button" class="btn btn-primary" data-action="profile-open">Personalizar perfil</button>')}
 if(profileOpen)APP.insertAdjacentHTML('beforeend',profileDialog());
 if(modal)APP.insertAdjacentHTML('beforeend',authModal())
};
APP.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el)return;
 const a=el.dataset.action;
 if(a==='cloud-password-open'){if(!account||!client)return;passwordOpen=!passwordOpen;passwordError='';passwordNotice='';updated()}
 else if(a==='profile-open'){if(!account){modal=true;updated();return}modal=false;profileOpen=true;profileError='';updated()}
 else if(a==='profile-close'||(a==='profile-backdrop'&&e.target===el)){profileOpen=false;updated()}
 else if(a==='profile-photo'){APP.querySelector('#slovo-avatar-upload')?.click()}
 else if(a==='cloud-open'){modal=true;notice='';error='';updated()}
 else if(a==='cloud-google'){
  if(!client){error='Supabase no está disponible. Comprueba la conexión e inténtalo de nuevo.';updated();return}
  error='';notice='Redirigiendo a Google…';updated();
  try{
   const {error:oauthError}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});
   if(oauthError)throw oauthError;
  }catch(oauthError){error='No se pudo abrir el inicio de sesión de Google: '+(oauthError?.message||'error desconocido');notice='';updated()}
 }
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
 if(e.target.id==='slovo-password-form'){
  e.preventDefault();
  if(!account||!client||passwordBusy)return;
  const form=e.target,pass=String(form.elements.password.value||''),confirmation=String(form.elements.confirm_password.value||'');
  passwordError='';passwordNotice='';
  if(pass.length<12){passwordError='La contraseña debe tener al menos 12 caracteres.';form.elements.password.focus();updated();return}
  if(pass!==confirmation){passwordError='Las contraseñas no coinciden.';form.elements.confirm_password.focus();updated();return}
  passwordBusy=true;updated();
  try{
   const {error:changeError}=await client.auth.updateUser({password:pass});
   if(changeError)throw changeError;
   passwordOpen=false;passwordNotice='Contraseña configurada. Ya puedes acceder usando este mismo correo o Google.';
  }catch(changeError){
   passwordError='No se pudo guardar la contraseña: '+(changeError?.message||'error inesperado')+'. Si Supabase solicita una nueva verificación, vuelve a iniciar sesión con Google antes de intentarlo.';
   passwordOpen=true;
  }finally{passwordBusy=false;updated()}
  return;
 }
 if(e.target.id==='slovo-profile-form'){e.preventDefault();await saveProfile(e.target.elements.display_name.value);return}
 if(e.target.id!=='cloud-auth')return;
 e.preventDefault();const f=e.target,el=f.querySelector('button[type=submit]'),email=f.elements.email.value.trim(),password=f.elements.password.value;
 el.disabled=true;notice='';error='';
 try{if(tab==='signup'){const r=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(r.error)throw r.error;notice=r.data.session?'Cuenta creada':'Revisa tu correo para confirmar la cuenta';if(r.data.session)modal=false}
 else{const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;modal=false}}
 catch(x){error=x.message||'No fue posible autenticar'}
 updated()
});
APP.addEventListener('change',async e=>{if(e.target.id==='slovo-avatar-upload'){await uploadAvatar(e.target.files?.[0]);e.target.value=''}else if(e.target.dataset.action==='profile-celebrations')setPrefs('celebrations',e.target.checked);else if(e.target.dataset.action==='profile-sound')setPrefs('sound',e.target.checked)});
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