import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const index=readFileSync('index.html','utf8');
const cloud=readFileSync('cloud.js','utf8');
const css=readFileSync('v6.css','utf8');
const js=readFileSync('v6.js','utf8');
const sw=readFileSync('sw.js','utf8');
const manifest=JSON.parse(readFileSync('manifest.webmanifest','utf8'));
new vm.Script(js,{filename:'v6.js'});
assert.ok(index.includes('<link rel="stylesheet" href="./v6.css"'),'Faltan estilos V6');
assert.ok(index.indexOf('src="./v6.js"')>index.indexOf('src="./cloud.js"'),'V6 debe cargar después de autenticación');
assert.ok(cloud.includes('window.SLOVO_PROFILE_VIEW'),'V6 necesita nombre y foto del perfil autenticado');
assert.ok(sw.includes('v6.css')&&sw.includes('v6.js'),'V6 debe funcionar desde la caché PWA');
assert.equal(manifest.display,'standalone');
assert.ok(index.includes('safe-area-inset-top'),'Respetar Dynamic Island del iPhone');
assert.ok(css.includes('prefers-reduced-motion:reduce'),'Respetar reducción de movimiento');

assert.ok(css.includes('html body #app .topbar{'),'iPhone: la cabecera V6 debe vencer la regla oscura con #app de V5');
assert.ok(css.includes('html[data-v6-theme="light"]::before'),'PWA: el status bar translúcido necesita contraste');
assert.ok(css.includes('pointer-events:none;z-index:10'),'Zona segura debe ser decorativa, sin capturar toques');
assert.ok(css.includes('background:var(--v6-paper)!important;'),'Logros: eliminar gradientes oscuros heredados');
for(const selector of ['.stats-summary','.stats-ring>div','.review-stats.wide>div','.daily-stats-section','.daily-stats-grid>div','.micro-stats-section','.micro-stats-box>div','.micro-log>div']){
 assert.ok(css.includes(selector),'Falta tematizar componente de Logros: '+selector);
}

assert.ok(js.includes("data-action=\"daily-start\"")&&js.includes("data-action=\"start-micro\""),'V6 debe preservar las acciones existentes');
assert.ok(!js.includes('.from(')&&!js.includes('updateUser('),'La capa V6 no debe escribir en Supabase');

const finalCall=/\nrender\(\);\s*\}\)\(\);\s*$/;
assert.ok(finalCall.test(js),'Formato inesperado del boot V6');
const modified=js.replace(finalCall,"\nglobalThis.__V6_TEST__={home,identity,navMarkup};\n})();");
const saved=new Map(),events={};
const ctx={
 localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
 window:{SLOVO_PROFILE_VIEW:()=>({name:'Маша',avatarUrl:'',loggedIn:true})},
 document:{documentElement:{dataset:{}},querySelector:()=>null},
 APP:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(type,cb)=>events[type]=cb},
 render(){},page:'home',
 state:{xp:42,dailyTasks:{},lessons:{},cards:{},dialogues:{}},
 DAILY_CHALLENGES:[
  {id:'listen',label:'Escucha',icon:'sound'},
  {id:'speak',label:'Habla',icon:'chat'},
  {id:'recall',label:'Recuerda',icon:'review'}
 ],
 today:()=> '2026-10-21',
 dailyCompletedCount:r=>r?Object.values(r.tasks||{}).filter(Boolean).length:0,
 dailyTarget:()=>({ru:'Привет',es:'Hola',speak:'Привет'}),
 nextLesson:()=>({title:'Mi primera lección'}),
 dueCards:()=>[],
 streak:()=>1,
 icon:name=>'<svg data-icon="'+name+'"></svg>',
 esc:str=>String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'),
};
vm.runInNewContext(modified,ctx,{filename:'v6-integration.js'});
const view=ctx.__V6_TEST__;
assert.ok(view);
let markup=view.home();
assert.ok(markup.includes('Привет, Маша')&&markup.includes('0 de 3'));
assert.ok(markup.includes('¿Cuánto te queda hoy?'));
assert.ok(markup.includes('data-action="cloud-open"')===false,'Usuario con Google ya conectado no debe parecer invitado');
assert.ok(markup.includes('data-action="profile-open"'));
assert.ok(markup.includes('data-action="daily-start" data-task="listen"'));
assert.ok(markup.includes('data-action="start-micro" data-mode="normal"'));
assert.ok(markup.includes('1 <small>min</small>')&&markup.includes('7 <small>min</small>'));
ctx.state.dailyTasks['2026-10-21']={tasks:{listen:true,speak:true}};
markup=view.home();
assert.ok(markup.includes('2 de 3')&&markup.includes('Continuar: Recuerda'));
assert.ok(markup.includes('lang="ru">Привет'));
ctx.state.dailyTasks['2026-10-21'].tasks.recall=true;
markup=view.home();
assert.ok(markup.includes('3 de 3')&&markup.includes('Repetir: Escucha'));
ctx.window.SLOVO_PROFILE_VIEW=()=>({name:'<Masha>',avatarUrl:'',loggedIn:false});
assert.ok(view.home().includes('&lt;Masha&gt;'),'El nombre debe estar protegido contra HTML');
assert.ok(view.home().includes('data-action="cloud-open"'));
assert.equal(saved.size,0,'La vista V6 no debe alterar localStorage de 5.1');
const pronunciation=readFileSync('pronunciation.js','utf8');
const pronunciationCss=readFileSync('pronunciation.css','utf8');
const backend=readFileSync('supabase/functions/pronunciation-assess/index.ts','utf8');
new vm.Script(pronunciation,{filename:'pronunciation.js'});
assert.ok(index.includes('src="./pronunciation.js"')&&index.includes('href="./pronunciation.css"'),'No se cargó el módulo de voz');
assert.ok(index.indexOf('src="./v6.js"')<index.indexOf('src="./pronunciation.js"'),'Pronunciación debe cargar tras el tema 6');
assert.ok(sw.includes('pronunciation.js')&&sw.includes('pronunciation.css'),'PWA necesita audio y estilos offline');
assert.ok(cloud.includes('SLOVO_SPEECH_CLIENT'),'Cliente autenticado no está disponible');
assert.ok(backend.includes('AZURE_SPEECH_TIER')&&backend.includes('=== "F0"'),'Bloquear cualquier nivel que no sea F0');
assert.ok(backend.includes('reserve_pronunciation'),'Reservar cuota antes de enviar audio');
assert.ok(backend.includes('PHRASES[phraseId]'),'Solo frases permitidas en el servidor');
assert.ok(backend.includes('Authorization')||backend.includes('authorization'),'Requiere autenticar usuario');
assert.ok(backend.includes('SUPABASE_DB_URL'),'La cuota exige Postgres en servidor');
assert.ok(!pronunciation.includes('AZURE_SPEECH_KEY'),'No exponer secreto de Microsoft al navegador');
assert.ok(pronunciationCss.includes('var(--v6-paper)'),'Mantener tema claro y oscuro');

console.log('✓ СЛОВО 6.0: flujo real de retos, perfil, seguridad y PWA verificados');
