/* СЛОВО 6.0 · Presentación real sobre el motor y progreso existentes.
 * Nunca crea usuarios, reinicia sesiones ni reescribe la estructura del estado.
 */
(()=>{
'use strict';
const previousRender=render;
const K_THEME='slovo_v6_theme',K_MODE='slovo_v6_mode',K_ISKRA='slovo_v6_iskra',K_REDUCE='slovo_v6_reduce';
const readPref=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
const writePref=(key,val)=>{try{localStorage.setItem(key,String(val))}catch{}};
let theme=readPref(K_THEME,'light')==='dark'?'dark':'light';
let selectedMode=['tiny','normal','focus'].includes(readPref(K_MODE,'normal'))?readPref(K_MODE,'normal'):'normal';
let showIskra=readPref(K_ISKRA,'on')!=='off';
let reduceMotion=readPref(K_REDUCE,'off')==='on';
const choices=[{id:'tiny',minutes:1,title:'Ligero',hint:'Una chispa'},{id:'normal',minutes:3,title:'Tranquilo',hint:'Un pequeño paso'},{id:'focus',minutes:7,title:'Con ganas',hint:'A fondo'}];
const sections=[['home','Hoy','home'],['course','Ruta','course'],['dialogs','Practicar','chat'],['stats','Logros','spark'],['settings','Perfil','settings']];
function applyTheme(){
 document.documentElement.dataset.v6Theme=theme;
 document.documentElement.dataset.v6Reduce=reduceMotion?'true':'false';
 const themeMeta=document.querySelector('meta[name="theme-color"]');
 if(themeMeta)themeMeta.setAttribute('content',theme==='dark'?'#111E20':'#F7F5EF');
}
function currentMenu(){
 if(page==='lesson'||page==='alphabet')return 'course';
 if(page==='review'||page==='review-session'||page==='micro'||page==='daily')return 'dialogs';
 return page;
}
function navMarkup(entries){
 const active=currentMenu();
 return entries.map(([id,label,glyph])=>'<button type="button" class="nav-item '+(active===id?'active':'')+'" data-action="nav" data-page="'+id+'" aria-label="'+label+'" '+(active===id?'aria-current="page"':'')+'>'+icon(glyph,20)+'<span>'+label+'</span></button>').join('');
}
function identity(){
 const greeting=APP.querySelector('.slovo-welcome strong');
 const loggedIn=!!greeting;
 const raw=greeting?.textContent||'¡Привет, explorador!';
 const name=raw.replace(/^¡Привет,\s*/,'').replace(/!$/,'').trim().slice(0,40)||'explorador';
 const markup=APP.querySelector('.slovo-profile-thumb')?.innerHTML||'<span>'+esc([...name][0]?.toUpperCase()||'С')+'</span>';
 return {name:esc(name),avatar:markup,accountAction:loggedIn?'profile-open':'cloud-open'};
}
function iskra(){
 if(!showIskra)return '';
 return '<div class="v6-iskra" aria-hidden="true"><div class="v6-iskra-core"><i class="v6-eye left"></i><i class="v6-eye right"></i><i class="v6-cheek left"></i><i class="v6-cheek right"></i><i class="v6-smile"></i></div></div>';
}
function home(){
 const who=identity();
 const record=(state.dailyTasks||{})[today()]||null;
 const completed=dailyCompletedCount(record),total=DAILY_CHALLENGES.length;
 const next=DAILY_CHALLENGES.find(x=>!record?.tasks?.[x.id]);
 const nextTask=next?.id||DAILY_CHALLENGES[0].id;
 const target=dailyTarget();
 const due=dueCards().length;
 const lesson=nextLesson();
 const modes=choices.map(m=>'<button type="button" class="v6-mode" data-action="v6-mode" data-mode="'+m.id+'" aria-pressed="'+(selectedMode===m.id)+'"><strong>'+m.minutes+' <small>min</small></strong><span class="v6-mode-label">'+m.title+'</span><span class="v6-mode-note">'+m.hint+'</span></button>').join('');
 const steps=DAILY_CHALLENGES.map(t=>{
  const done=!!record?.tasks?.[t.id],active=!done&&next?.id===t.id;
  return '<button type="button" class="v6-step '+(done?'done':active?'next':'')+'" data-action="daily-start" data-task="'+t.id+'" aria-label="'+t.label+(done?', completado':active?', siguiente':'')+'"><span class="v6-step-icon">'+(done?icon('check',23):icon(t.icon,24))+'</span><span>'+t.label+'</span></button>';
 }).join('');
 const greeting=completed===total?'¡Ya tienes tu ruso de hoy!':completed>0?'Ya empezaste. Una palabra a la vez.':'Qué bueno verte por aquí.';
 const phrase=completed>0?'<strong class="v6-phrase-ru" lang="ru">'+esc(target.ru)+'</strong><p>'+esc(target.es)+'</p><button type="button" class="v6-listen" data-action="speak" data-value="'+esc(target.speak||target.ru)+'">'+icon('sound',17)+' Escuchar pronunciación</button>':'<p style="margin-top:13px">Primero descubre la expresión con el reto de Escucha. Una conversación empieza con algo pequeño.</p>';
 return '<div class="v6-home">'+
  '<div class="v6-greeting"><div><span class="v6-eyebrow">ТВОЙ ПУТЬ · TU CAMINO</span><h1>Привет, '+who.name+' <span aria-hidden="true">✦</span></h1><p class="v6-muted">'+greeting+'</p></div>'+
  '<button type="button" class="v6-greet-avatar" data-action="'+who.accountAction+'" aria-label="'+(who.accountAction==='profile-open'?'Editar mi perfil':'Iniciar sesión')+'"><span class="v6-avatar">'+who.avatar+'</span></button></div>'+
  '<div class="v6-grid"><div class="v6-stack"><section class="v6-hero"><span class="v6-eyebrow">HOY PUEDE SER UN GRAN COMIENZO</span>'+iskra()+'<h2>¿Cuánto te queda hoy?</h2><p class="v6-hero-lead">Un minuto también es avanzar. Tú eliges el ritmo.</p>'+
  '<div class="v6-modes">'+modes+'</div>'+
  '<button type="button" class="v6-primary v6-start" data-action="start-micro" data-mode="'+selectedMode+'">Empezar mi misión de '+(choices.find(x=>x.id===selectedMode)?.minutes||3)+' min '+icon('arrow',17)+'</button>'+
  '<p class="v6-clarifier">Las micro-misiones son práctica adicional. Tu objetivo diario se completa con los tres retos de Escucha, Habla y Recuerda.</p></section>'+
  '<section class="v6-note"><span class="v6-note-icon">✴</span><div><strong>'+(completed===3?'¡Lo hiciste! Ahora toca disfrutarlo.':'Vas a tu ritmo, y eso cuenta.')+'</strong><p>'+(completed===3?'Puedes regresar mañana para descubrir otra frase útil.':'No necesitas memorizarlo todo de golpe. Lo importante es volver a practicar.')+'</p></div></section></div>'+
  '<div class="v6-stack"><section class="v6-card"><div class="v6-row"><span class="v6-eyebrow">TU RUSO DE HOY</span><span class="v6-badge">'+completed+' de '+total+'</span></div><h2>'+(completed===total?'¡Qué buen día de ruso!':'Tres pasos, una frase real.')+'</h2><p>Escucha una frase, dilo en voz alta y recuérdala.</p>'+
  '<div class="v6-daily-path">'+steps+'</div><button type="button" class="v6-primary" data-action="daily-start" data-task="'+nextTask+'">'+(completed===total?'Repetir: Escucha':'Continuar: '+(next?.label||'Escucha'))+' '+icon('arrow',17)+'</button>'+
  '<p class="v6-small-status">'+(completed===total?'✓ Objetivo de hoy completado':(total-completed)+' '+(total-completed===1?'reto pendiente':'retos pendientes'))+' · '+streak()+' '+(streak()===1?'día':'días')+' de racha</p></section>'+
  '<section class="v6-phrase"><div class="v6-row"><span class="v6-eyebrow">UNA FRASE PARA HOY</span>'+icon('spark',19)+'</div>'+phrase+'</section>'+
  '<div class="v6-extra"><button type="button" data-action="nav" data-page="dialogs">'+icon('chat',22)+'<b>Diálogo cotidiano</b><small>Algo que sí dirías</small></button><button type="button" data-action="nav" data-page="review">'+icon('review',22)+'<b>Volver a recordar</b><small>'+due+' '+(due===1?'tarjeta pendiente':'tarjetas pendientes')+'</small></button></div>'+
  '<button type="button" class="v6-listen" data-action="'+(lesson?'next-lesson':'nav')+'" '+(lesson?'':'data-page="stats"')+'>'+icon('course',17)+' '+(lesson?'Seguir con las lecciones: '+esc(lesson.title):'Ver mis logros')+'</button>'+
  '</div></div></div>';
}
function decorateNavigation(){
 const bottom=APP.querySelector('.mobile-nav');
 if(bottom){bottom.innerHTML=navMarkup(sections);bottom.setAttribute('aria-label','Navegación principal');}
 const navs=APP.querySelectorAll('.sidebar .side-nav');
 if(navs.length>=2){navs[0].innerHTML=navMarkup(sections.slice(0,3));navs[1].innerHTML=navMarkup(sections.slice(3));}
 const captions=APP.querySelectorAll('.side-caption');if(captions[0])captions[0].textContent='TU APRENDIZAJE';
 if(captions[1])captions[1].textContent='TU ESPACIO';
 const top=APP.querySelector('.topbar-metrics');
 if(top){top.insertAdjacentHTML('afterbegin','<button type="button" class="v6-theme-toggle" data-action="v6-theme" title="Cambiar tema" aria-label="Cambiar a tema '+(theme==='dark'?'claro':'oscuro')+'">'+(theme==='dark'?'☀':'☾')+'</button>');}
}
function tabs(current){
 const entries=[['dialogs','Diálogos'],['review','Repasar'],['alphabet','Alfabeto']];
 return '<nav class="v6-tabs" aria-label="Tipos de práctica">'+entries.map(([id,name])=>'<button type="button" data-action="nav" data-page="'+id+'" class="'+(id===current?'v6-current':'')+'">'+name+'</button>').join('')+'</nav>';
}
function decorateSecondary(main){
 if(page==='dialogs'||page==='review'||page==='alphabet'){
  main.insertAdjacentHTML('afterbegin',tabs(page));
 }
 if(page==='course')main.insertAdjacentHTML('afterbegin','<div class="v6-options"><div><strong>Un pequeño paso, a tu ritmo</strong><small>También puedes aprender el alfabeto de forma independiente.</small></div><button type="button" class="v6-small-btn" data-action="nav" data-page="alphabet">Ver letras</button></div>');
 if(page==='stats'){
  const totalLessons=Object.values(state.lessons||{}).filter(x=>x?.completed).length;
  const dialogues=Object.keys(state.dialogues?.completed||{}).length;
  main.insertAdjacentHTML('afterbegin','<h2 class="v6-section-heading">Cada avance cuenta ✦</h2><div class="v6-badgeboard"><article><b>'+state.xp+'</b><small>XP ganados</small></article><article><b>'+totalLessons+'</b><small>Lecciones completadas</small></article><article><b>'+dialogues+'</b><small>Diálogos realizados</small></article></div>');
 }
 if(page==='settings'){
  const who=identity();
  main.insertAdjacentHTML('afterbegin','<div class="v6-profile-preview"><span class="v6-avatar">'+who.avatar+'</span><div><span class="v6-eyebrow" style="color:#604E6E">MI ESPACIO</span><br><strong>'+who.name+'</strong><p>Tu nombre, tus preferencias y tu camino al ruso.</p></div><button type="button" data-action="'+who.accountAction+'">'+(who.accountAction==='cloud-open'?'Entrar':'Editar')+'</button></div>'+
  '<div class="v6-options"><div><strong>Ambiente: '+(theme==='dark'?'Noche menta':'Claro cálido')+'</strong><small>Puedes cambiarlo cuando quieras.</small></div><button type="button" class="v6-small-btn" data-action="v6-theme">'+(theme==='dark'?'☀ Tema claro':'☾ Tema oscuro')+'</button></div>'+
  '<div class="v6-options"><div><strong>Искра, tu chispa</strong><small>Compañía discreta en tu pantalla de inicio.</small></div><button type="button" class="v6-small-btn v6-companion-toggle" data-action="v6-iskra" aria-pressed="'+showIskra+'">'+(showIskra?'Activada':'Oculta')+'</button></div>'+
  '<div class="v6-options"><div><strong>Movimiento</strong><small>Reducir rebotes y animaciones decorativas en este dispositivo.</small></div><button type="button" class="v6-small-btn v6-companion-toggle" data-action="v6-motion" aria-pressed="'+(!reduceMotion)+'">'+(reduceMotion?'Reducido':'Animado')+'</button></div>');
 }
}
function refreshHome(){if(page!=='home')return;const main=APP.querySelector('.main-content');if(main)main.innerHTML=home();}
function decorate(){
 applyTheme();
 decorateNavigation();
 const main=APP.querySelector('.main-content');
 if(!main)return;
 if(page==='home')main.innerHTML=home();
 else decorateSecondary(main);
 document.title='СЛОВО 6.0 — Ruso a tu ritmo';
}
render=function(){previousRender();decorate()};
APP.addEventListener('click',event=>{
 const btn=event.target.closest('[data-action]');if(!btn||btn.disabled)return;
 const action=btn.dataset.action;
 if(action==='v6-mode'){
  if(!['tiny','normal','focus'].includes(btn.dataset.mode))return;
  selectedMode=btn.dataset.mode;writePref(K_MODE,selectedMode);
  const cards=APP.querySelectorAll('.v6-mode');cards.forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===selectedMode)));
  const start=APP.querySelector('.v6-start');if(start){start.dataset.mode=selectedMode;start.innerHTML='Empezar mi misión de '+(choices.find(x=>x.id===selectedMode)?.minutes||3)+' min '+icon('arrow',17);}
 }else if(action==='v6-theme'){
  theme=theme==='dark'?'light':'dark';writePref(K_THEME,theme);render();
 }else if(action==='v6-iskra'){
  showIskra=!showIskra;writePref(K_ISKRA,showIskra?'on':'off');render();
 }else if(action==='v6-motion'){
  reduceMotion=!reduceMotion;writePref(K_REDUCE,reduceMotion?'on':'off');render();
 }
});
render();
})();
