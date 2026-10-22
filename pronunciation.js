/* СЛОВО 6.2 · Práctica de pronunciación Azure F0. Audio efímero. */
(()=>{
'use strict';
const phrases=[
{id:'privet',ru:'Привет!',es:'¡Hola!'},
{id:'kak_dela',ru:'Как дела?',es:'¿Cómo estás?'},
{id:'hello',ru:'Привет! Как дела?',es:'¡Hola! ¿Cómo estás?'},
{id:'spasibo',ru:'Спасибо!',es:'¡Gracias!'},
{id:'pozhaluysta',ru:'Пожалуйста.',es:'Por favor / de nada'},
{id:'menya_zovut',ru:'Меня зовут Алекс.',es:'Me llamo Alex'},
{id:'ne_ponimayu',ru:'Я не понимаю.',es:'No entiendo'},
{id:'do_svidaniya',ru:'До свидания!',es:'Hasta luego'},
];
const originalRender=render;
let open=false,chosen='privet',working=false,available=null,message='',result=null,recording=false,capture=null;
const escp=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current=()=>phrases.find(p=>p.id===chosen)||phrases[0];
const account=()=>window.SLOVO_PROFILE_VIEW?.()?.loggedIn===true;
function status(){if(available===false)return 'La evaluación está en preparación. Podrás grabarte y escucharte mientras configuramos Azure F0.';return !account()?'Inicia sesión en СЛОВО para recibir una puntuación.':available===true?'Pronunciación asistida por Azure F0 · ruso ru-RU':'Comprobando disponibilidad del evaluador.'}
function panel(){const p=current();return '<section class="pron-shell"><div class="pron-top"><button data-action="pron-back" class="pron-quiet" type="button">← Volver a practicar</button><span class="v6-eyebrow">PRONUNCIACIÓN · A0</span></div><h1>Tu ruso, con tu voz.</h1><p class="pron-intro">Escucha la frase, repítela y descubre qué palabras conviene mejorar. Sin prisas y sin castigos.</p><div class="pron-card"><span class="v6-eyebrow">ELIGE UNA FRASE</span><div class="pron-pills">'+phrases.map(x=>'<button type="button" class="pron-pill '+(chosen===x.id?'selected':'')+'" data-action="pron-select" data-id="'+x.id+'">'+escp(x.ru)+'</button>').join('')+'</div><div class="pron-sentence"><span lang="ru">'+escp(p.ru)+'</span><small>'+escp(p.es)+'</small></div><div class="pron-controls"><button class="pron-quiet" type="button" data-action="pron-listen">♫ Escuchar</button><button class="pron-record" type="button" data-action="pron-record" '+(working?'disabled':'')+'>'+(recording?'■ Detener grabación':working?'Analizando…':'🎙 Grabar mi voz')+'</button></div><p class="pron-status">'+escp(status())+'</p>'+(message?'<p class="pron-message" role="status">'+escp(message)+'</p>':'')+'</div>'+(result?'<div class="pron-result"><div class="pron-result-top"><span>Tu evaluación</span><strong>'+(result.pronunciation==null?'—':result.pronunciation+'/100')+'</strong></div><div class="pron-scores">'+[['Precisión',result.accuracy],['Fluidez',result.fluency],['Integridad',result.completeness]].map(([k,v])=>'<div><b>'+(v==null?'—':v)+'</b><small>'+k+'</small></div>').join('')+'</div><p>El sistema escuchó: <strong>'+escp(result.recognized||'—')+'</strong></p><div class="pron-words">'+(result.words||[]).map(w=>'<span class="'+(w.accuracy!=null&&w.accuracy<65?'needs-work':'')+'">'+escp(w.word)+' '+(w.accuracy??'—')+'</span>').join('')+'</div><p class="pron-disclaimer">Puntuación orientativa. No sustituye la evaluación de un profesor.</p></div>':'')+'<p class="pron-privacy">El micrófono solo se activa al pulsar grabar. El audio se envía a Azure únicamente cuando la evaluación F0 está disponible; no se almacena en СЛОВО.</p></section>';}
function renderPanel(){const main=APP.querySelector('.main-content');if(main&&open){main.innerHTML=panel();}}
render=function(){originalRender();if(page==='review'||page==='dialogs'){const main=APP.querySelector('.main-content');if(main&&!main.querySelector('.pron-entry'))main.insertAdjacentHTML('afterbegin','<button class="pron-entry" data-action="pron-open" type="button">🎙 Practicar mi pronunciación <span>→</span></button>');}renderPanel()};
async function probe(){
 if(!window.supabase||!window.SLOVO_SUPABASE_CONFIG||!account()){available=false;renderPanel();return;}
 try{const auth=await window.SLOVO_SPEECH_CLIENT?.auth?.getSession();const token=auth?.data?.session?.access_token;if(!token){available=false;renderPanel();return}
 const url=window.SLOVO_SUPABASE_CONFIG.url+'/functions/v1/pronunciation-assess';
 const response=await fetch(url,{headers:{Authorization:'Bearer '+token,apikey:window.SLOVO_SUPABASE_CONFIG.publishableKey},signal:AbortSignal.timeout(8000)});
 const data=await response.json();available=response.ok&&data.available===true;
 }catch(e){available=false}
 renderPanel();
}
async function wav(){
 const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
 const A=window.AudioContext||window.webkitAudioContext;if(!A){stream.getTracks().forEach(t=>t.stop());throw Error('Este dispositivo no permite capturar audio.')}
 const ctx=new A();const source=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(4096,1,1),gain=ctx.createGain();gain.gain.value=0;
 const chunks=[];source.connect(proc);proc.connect(gain);gain.connect(ctx.destination);
 proc.onaudioprocess=e=>{if(recording)chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))};
 const started=Date.now();let stopped=false;
 return {stop:async()=>{if(stopped)return null;stopped=true;recording=false;proc.disconnect();source.disconnect();gain.disconnect();stream.getTracks().forEach(t=>t.stop());
 const sampleRate=ctx.sampleRate;await ctx.close();
 const count=chunks.reduce((n,c)=>n+c.length,0);if(count<sampleRate*.15)throw Error('Grabación demasiado breve.');
 const input=new Float32Array(count);let index=0;for(const c of chunks){input.set(c,index);index+=c.length;}
 const size=Math.min(Math.floor(count*16000/sampleRate),16000*12);const pcm=new Int16Array(size);for(let i=0;i<size;i++){const p=i*sampleRate/16000,j=Math.floor(p),blend=p-j;const x=(input[j]||0)*(1-blend)+(input[j+1]||0)*blend;pcm[i]=Math.round(Math.max(-1,Math.min(1,x))*32767);}
 const b=new ArrayBuffer(44+size*2),v=new DataView(b);function put(at,str){for(let k=0;k<str.length;k++)v.setUint8(at+k,str.charCodeAt(k))}
 put(0,'RIFF');v.setUint32(4,36+size*2,true);put(8,'WAVE');put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);put(36,'data');v.setUint32(40,size*2,true);
 pcm.forEach((n,i)=>v.setInt16(44+i*2,n,true));
 const bytes=new Uint8Array(b);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {audioBase64:btoa(binary),duration:Math.round((Date.now()-started)/1000)};
 }};
}
async function submit(audioBase64){
 const cl=window.SLOVO_SPEECH_CLIENT,config=window.SLOVO_SUPABASE_CONFIG;
 if(!cl||!config)throw Error('Debes iniciar sesión antes de recibir una puntuación.');
 const {data:{session}}=await cl.auth.getSession();if(!session)throw Error('Tu sesión ha caducado. Inicia sesión de nuevo.');
 const r=await fetch(config.url+'/functions/v1/pronunciation-assess',{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey,Authorization:'Bearer '+session.access_token},body:JSON.stringify({phraseId:chosen,audioBase64}),signal:AbortSignal.timeout(24000)});
 const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo evaluar la grabación');return data;
}
APP.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el)return;
 const action=el.dataset.action;
 if(action==='pron-open'){open=true;result=null;message='';render();void probe();}
 if(action==='pron-back'){if(capture){await capture.stop().catch(()=>{});capture=null;}open=false;recording=false;working=false;page='dialogs';render();}
 if(action==='pron-select'){if(working||recording)return;chosen=el.dataset.id;result=null;message='';renderPanel();}
 if(action==='pron-listen'){speak(current().ru)}
 if(action==='pron-record'){
  if(recording){working=true;message='Preparando evaluación…';renderPanel();try{const audio=await capture.stop();capture=null;if(!audio)throw Error('Grabación interrumpida.');if(available!==true){message='Grabación finalizada. Activa Azure F0 para recibir una puntuación.';return;}result=await submit(audio.audioBase64);message='¡Muy bien! Puedes repetir la frase para practicar.';}catch(err){message=err.message||'No se pudo evaluar el audio';}finally{working=false;renderPanel();}return}
  try{capture=await wav();recording=true;message='Grabando… Pulsa «Detener grabación» al terminar (máximo 12 segundos).';result=null;renderPanel();
  }catch(err){message=err.message||'No se pudo activar el micrófono';renderPanel();}
 }
});
})();