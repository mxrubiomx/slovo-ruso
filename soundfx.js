/* СЛОВО 6.1 · Diseño sonoro sin archivos, redes ni servicios externos.
   Amplía el interruptor preexistente del perfil y no altera XP/progreso.
 */
(()=>{
'use strict';
const VOLUME_KEY='slovo_sfx_volume_v1';
const SETTING_ID='slovo-sfx-controls';
const DEFAULT_VOLUME=35;
const preset={
  tap:[{f:460,ms:42,g:.27,type:'sine',at:0}],
  step:[{f:470,ms:55,g:.36,at:0},{f:610,ms:80,g:.30,at:51}],
  correct:[{f:523.25,ms:92,g:.55,at:0},{f:659.26,ms:132,g:.52,at:82}],
  incorrect:[{f:330,ms:98,g:.34,at:0,to:285},{f:277.18,ms:113,g:.24,at:91}],
  reward:[{f:659.26,ms:90,g:.49,at:0},{f:783.99,ms:115,g:.53,at:87}],
  complete:[{f:392,ms:115,g:.48,at:0},{f:523.25,ms:117,g:.51,at:120},{f:659.26,ms:140,g:.53,at:238},{f:783.99,ms:210,g:.50,at:390}],
};
let context=null;
let volume=DEFAULT_VOLUME;
let lastSound=0;
try{const previous=Number(localStorage.getItem(VOLUME_KEY));if(Number.isFinite(previous)&&previous>=0&&previous<=100&&localStorage.getItem(VOLUME_KEY)!==null)volume=Math.round(previous);}catch(e){}
const enabled=()=>window.SLOVO_SOUND_PREFS?.get?.()!==false;
const activeSpeech=()=>{try{return !!(window.speechSynthesis?.speaking||window.speechSynthesis?.pending);}catch(e){return false;}};
const activeRecording=()=>{try{return (typeof dailyRecorder!=='undefined')&&!!dailyRecorder?.state&&dailyRecorder.state==='recording';}catch(e){return false;}};
function play(name,{preview=false}={}){
 if(!preset[name]||!enabled()||volume===0||document.hidden)return false;
 if(!preview&&(activeSpeech()||activeRecording()))return false;
 const now=Date.now();
 if(!preview&&name==='tap'&&now-lastSound<125)return false;
 if(!preview&&now-lastSound<35)return false;
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return false;
 try{
  if(!context||context.state==='closed')context=new AC({latencyHint:'interactive'});
  if(context.state==='closed')return false;
  lastSound=now;
  const render=()=>{
   if(context.state!=='running')return;
   const start=context.currentTime+.012;
   for(const note of preset[name]){
    const oscillator=context.createOscillator(),gain=context.createGain();
    const t=start+(note.at||0)/1000,end=t+note.ms/1000;
    const strength=.11*(volume/100)*note.g;
    oscillator.type=note.type||'sine';
    oscillator.frequency.setValueAtTime(note.f,t);
    if(note.to)oscillator.frequency.exponentialRampToValueAtTime(note.to,end);
    gain.gain.setValueAtTime(.00001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001,strength),t+.012);
    gain.gain.exponentialRampToValueAtTime(.00001,end);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(t);oscillator.stop(end+.015);
    oscillator.onended=()=>{try{oscillator.disconnect();gain.disconnect()}catch(e){}};
   }
  };
  if(context.state==='suspended')void context.resume().then(render).catch(()=>{});
  else render();
  return true;
 }catch(e){return false;}
}
function setVolume(value){
 const next=Math.max(0,Math.min(100,Math.round(Number(value)||0)));
 volume=next;
 try{localStorage.setItem(VOLUME_KEY,String(next));}catch(e){}
 const v=document.getElementById('sfx-volume-value');
 if(v)v.textContent=next+'%';
 const slider=document.getElementById('sfx-volume');
 if(slider&&slider.value!==String(next))slider.value=String(next);
}
function settingsMarkup(){
 return '<section class="sfx-panel" id="'+SETTING_ID+'" aria-labelledby="sfx-title">'+
 '<div class="sfx-heading"><div><span class="v6-eyebrow">AMBIENTE · EFECTOS</span><h2 id="sfx-title">Pequeños sonidos, grandes avances</h2><p>Aciertos, errores, navegación y objetivos cumplidos. La voz rusa se reproduce por separado.</p></div>'+
 '<button type="button" class="sfx-switch" role="switch" data-action="sfx-toggle" aria-checked="'+enabled()+'" aria-label="Efectos de sonido">'+(enabled()?'Activados':'Silenciados')+'</button></div>'+
 '<div class="sfx-controls"><label for="sfx-volume">Volumen de los efectos <strong id="sfx-volume-value">'+volume+'%</strong></label>'+
 '<input id="sfx-volume" type="range" min="0" max="100" step="5" value="'+volume+'" aria-label="Volumen de los efectos de sonido" '+(!enabled()?'disabled':'')+'>'+
 '<div class="sfx-presets"><button type="button" data-action="sfx-preview" data-sound="correct" '+(!enabled()?'disabled':'')+'>♫ Acierto</button>'+
 '<button type="button" data-action="sfx-preview" data-sound="incorrect" '+(!enabled()?'disabled':'')+'>♫ Intentar de nuevo</button>'+
 '<button type="button" data-action="sfx-preview" data-sound="complete" '+(!enabled()?'disabled':'')+'>♫ Meta completa</button></div></div>'+
 '<p class="sfx-footnote">Sonidos creados en el dispositivo, sin descargar archivos ni usar servicios de pago. Ajuste de volumen local a este dispositivo.</p></section>';
}
function decorate(){
 if(typeof page==='undefined'||page!=='settings')return;
 const main=APP.querySelector('.main-content');
 if(main&&!main.querySelector('#'+SETTING_ID))main.insertAdjacentHTML('afterbegin',settingsMarkup());
}
const originalRender=render;
render=function(){originalRender();decorate();};
function classify(action,btn){
 if(action==='speak'||action==='daily-play'||action==='daily-record'||action==='export'||action==='import'||action==='reset'||action==='sfx-preview')return null;
 if(action==='answer') {
   const f=APP.querySelector('.quiz-card .feedback');
   return f?(f.classList.contains('good')?'correct':'incorrect'):null;
 }
 if(action==='micro-answer'){
   const f=APP.querySelector('.mini-feedback');
   return f?(f.classList.contains('is-right')?'correct':'incorrect'):null;
 }
 if(action==='daily-answer'){
   const f=APP.querySelector('.daily-feedback');
   if(!f)return null;
   const tasks=state.dailyTasks?.[today()]?.tasks||{};
   if(f.classList.contains('needs-practice'))return 'incorrect';
   if(['listen','speak','recall'].every(k=>tasks[k]))return 'complete';
   return 'correct';
 }
 if(action==='daily-speech') {
   const tasks=state.dailyTasks?.[today()]?.tasks||{};
   return ['listen','speak','recall'].every(k=>tasks[k])?'complete':'reward';
 }
 if(action==='dialog-choice'){
   const strong=APP.querySelector('.dialog-coach strong');
   if(!strong)return null;
   return strong.textContent.includes('Bien respondido')?'correct':'incorrect';
 }
 if(action==='grade')return btn.dataset.value==='again'?'incorrect':'reward';
 if(action==='quiz-advance'){
  const r=APP.querySelector('.result-card .result-icon');
  return r?(r.classList.contains('success')?'complete':'step'):'step';
 }
 if(action==='micro-advance'||action==='micro-finish'){
  return APP.querySelector('.mini-result')?'complete':'step';
 }
 if(action==='dialog-next')return APP.querySelector('.dialog-summary')?'complete':'step';
 if(action==='reveal-review'||action==='daily-reveal')return 'step';
 if(action==='v6-mode'||action==='v6-theme'||action==='v6-iskra'||action==='v6-motion'||action==='expand-alpha'||action==='close-alpha')return 'tap';
 if(['nav','open-lesson','start-micro','daily-start','start-review','next-lesson','open-dialogue','dialog-restart','retry-lesson','next-study','micro-next','micro-exit','micro-advance','daily-next','set-goal','set-week-goal'].includes(action))return 'tap';
 return null;
}
APP.addEventListener('click',event=>{
 const btn=event.target.closest('[data-action]');
 if(!btn||btn.disabled)return;
 const action=btn.dataset.action;
 if(action==='sfx-toggle'){
   const next=!enabled();
   window.SLOVO_SOUND_PREFS?.set?.(next);
   if(next)play('correct',{preview:true});
   return;
 }
 if(action==='sfx-preview'){play(btn.dataset.sound,{preview:true});return;}
 const type=classify(action,btn);
 if(type)play(type);
});
APP.addEventListener('input',event=>{
 if(event.target?.id==='sfx-volume')setVolume(event.target.value);
});
APP.addEventListener('change',event=>{
 if(event.target?.id==='sfx-volume')play('correct',{preview:true});
 if(event.target?.dataset?.action==='profile-sound'&&event.target.checked)play('correct',{preview:true});
});
window.addEventListener('pagehide',()=>{if(context&&context.state==='running')void context.suspend().catch(()=>{});});
window.SLOVO_SFX={play,getEnabled:enabled,getVolume:()=>volume,setVolume};
render();
})();