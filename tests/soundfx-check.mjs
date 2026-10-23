import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('soundfx.js','utf8');
const css=readFileSync('soundfx.css','utf8');
const cloud=readFileSync('cloud.js','utf8');
const index=readFileSync('index.html','utf8');
const sw=readFileSync('sw.js','utf8');
new vm.Script(source,{filename:'soundfx.js'});
assert.ok(index.includes('href="./soundfx.css"')&&index.includes('src="./soundfx.js"'),'Audio no está conectado al HTML');
assert.ok(index.indexOf('src="./v6.js"')<index.indexOf('src="./soundfx.js"'),'El audio debe cargarse tras V6');
assert.ok(index.indexOf('src="./cloud.js"')<index.indexOf('src="./soundfx.js"'),'Las preferencias deben existir antes del motor sonoro');
assert.ok(sw.includes("'./soundfx.js'")&&sw.includes("'./soundfx.css'"),'La PWA necesita cachear los efectos');
assert.ok(cloud.includes('SLOVO_SOUND_PREFS'),'El motor debe usar la preferencia de sonido existente');
assert.ok(!cloud.includes('if(prefs.sound)try{const C='),'No duplicar el sonido de celebraciones V5');
assert.ok(css.includes('var(--v6-paper)')&&css.includes('var(--v6-text)'),'Panel claro y oscuro');
assert.ok(!source.includes('fetch(')&&!source.includes('new Audio('),'Los efectos deben sintetizarse sin red ni archivos');

const listeners={},saved=new Map(),sounds=[];
let clock=0;
let isEnabled=true,speaking=false,feedback='good';
const main={querySelector:()=>null,insertAdjacentHTML(){}};
const APP={
 querySelector(selector){
  if(selector==='.main-content')return main;
  if(selector==='.quiz-card .feedback')return {classList:{contains:name=>name===feedback}};
  return null;
 },
 addEventListener(type,fn){listeners[type]=fn},
};
class AudioContextStub {
 constructor(){this.state='running';this.currentTime=1}
 createOscillator(){
  const node={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:'sine',connect(){return this},start(){sounds.push('start')},stop(){},disconnect(){}};
  return node;
 }
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this},disconnect(){}}}
 suspend(){this.state='suspended';return Promise.resolve()}
 resume(){this.state='running';return Promise.resolve()}
}
const fake={
 APP,page:'settings',render(){},
 state:{dailyTasks:{}},today:()=> '2026-10-23',
 localStorage:{getItem:key=>saved.has(key)?saved.get(key):null,setItem:(key,val)=>saved.set(key,val)},
 document:{hidden:false,getElementById:()=>null},
 window:{AudioContext:AudioContextStub,speechSynthesis:{get speaking(){return speaking},pending:false},SLOVO_SOUND_PREFS:{get:()=>isEnabled,set:value=>{isEnabled=value}},
 addEventListener(){}
 },
 Date:{now:()=>{clock+=150;return clock}},Math,
};
vm.runInNewContext(source,fake,{filename:'soundfx.js'});
assert.equal(typeof fake.window.SLOVO_SFX.play,'function');
assert.equal(fake.window.SLOVO_SFX.getVolume(),35);
assert.equal(fake.window.SLOVO_SFX.getEnabled(),true);

const click=(action,extra={})=>listeners.click({target:{closest:()=>({dataset:{action,...extra},disabled:false})}});
click('answer',{value:'Привет'});
assert.ok(sounds.length>0,'Acierto debe generar audio');
const n=sounds.length;
isEnabled=false;
click('sfx-preview',{sound:'complete'});
assert.equal(sounds.length,n,'No debe reproducir efectos cuando están desactivados');
click('sfx-toggle');assert.equal(isEnabled,true,'El control debería reactivar preferencias');
assert.ok(sounds.length>n,'Al activar debe probar sonido');
speaking=true;const m=sounds.length;
click('answer',{value:'Привет'});
assert.equal(sounds.length,m,'No tapar la pronunciación rusa');
speaking=false;
fake.window.SLOVO_SFX.setVolume(0);
assert.equal(fake.window.SLOVO_SFX.getVolume(),0);
assert.equal(saved.get('slovo_sfx_volume_v1'),'0');
const muted=sounds.length;
click('sfx-preview',{sound:'complete'});
assert.equal(sounds.length,muted,'El volumen cero debe silenciar completamente');
fake.window.SLOVO_SFX.setVolume(45);
feedback='bad';
click('answer',{value:'Incorrecto'});
assert.ok(sounds.length>muted,'Los errores deben tener respuesta sonora');
assert.ok(source.includes('daily-answer')&&source.includes('micro-answer')&&source.includes('dialog-choice')&&source.includes('grade'),'Cubrir todos los motores de aprendizaje');
console.log('✓ Audio 6.1: Web Audio, acierto/error, silencio, volumen, preferencias y compatibilidad PWA');
