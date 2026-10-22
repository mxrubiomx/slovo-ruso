// СЛОВО 6.2 · Evaluación rusa solo con Azure Speech F0.
// Audio nunca se guarda en Storage, Postgres ni logs.
import postgres from "npm:postgres@3.4.7";
const ORIGIN = "https://mxrubiomx.github.io";
const MAX_BYTES = 16000 * 2 * 12 + 44;
const PHRASES: Record<string, string> = {
  privet: "Привет!", kak_dela: "Как дела?", hello: "Привет! Как дела?",
  spasibo: "Спасибо!", pozhaluysta: "Пожалуйста.",
  menya_zovut: "Меня зовут Алекс.", ne_ponimayu: "Я не понимаю.",
  do_svidaniya: "До свидания!",
};
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Vary": "Origin",
};
const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const ready = () =>
  Deno.env.get("AZURE_SPEECH_ENABLED") === "true" &&
  Deno.env.get("AZURE_SPEECH_TIER") === "F0" &&
  !!Deno.env.get("AZURE_SPEECH_KEY") &&
  /^[a-z0-9-]{3,30}$/.test(Deno.env.get("AZURE_SPEECH_REGION") || "");

async function identifyUser(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization") || "";
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(h)) return null;
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !anon) return null;
  const result = await fetch(base + "/auth/v1/user", {
    headers: { authorization: h, apikey: anon }, signal: AbortSignal.timeout(6000),
  });
  if (!result.ok) return null;
  const user = await result.json();
  return /^[a-f0-9-]{36}$/.test(user?.id || "") ? user.id : null;
}
function decodeAndInspect(encoded: string) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length < 500 || encoded.length > 550000)
    throw Error("Formato de audio incorrecto");
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, x => x.charCodeAt(0));
  if (bytes.length > MAX_BYTES || bytes.length < 3244) throw Error("La grabación debe durar entre 0,1 y 12 segundos");
  const view = new DataView(bytes.buffer);
  const ascii = (start:number,len:number) => String.fromCharCode(...bytes.slice(start,start+len));
  const wav = ascii(0,4)==="RIFF" && ascii(8,4)==="WAVE" && ascii(12,4)==="fmt " &&
    view.getUint16(20,true)===1 && view.getUint16(22,true)===1 &&
    view.getUint32(24,true)===16000 && view.getUint16(34,true)===16 &&
    ascii(36,4)==="data";
  if (!wav) throw Error("Se requiere WAV PCM mono a 16 kHz");
  const samples = view.getUint32(40,true);
  if (samples !== bytes.length - 44 || samples % 2) throw Error("Audio truncado");
  let energy=0;
  for(let i=44;i<bytes.length;i+=256) energy+=Math.abs(view.getInt16(i,true));
  if(energy<200)throw Error("No se detectó audio. Comprueba tu micrófono.");
  return { bytes, seconds:Math.max(1,Math.ceil(samples/32000)+2) };
}
function encodeHeader(reference:string) {
  const json=JSON.stringify({
    ReferenceText:reference, GradingSystem:"HundredMark",Granularity:"Word",
    Dimension:"Comprehensive",EnableMiscue:"True",EnableProsodyAssessment:"False",
  });
  return btoa(Array.from(new TextEncoder().encode(json),b=>String.fromCharCode(b)).join(""));
}
let db: ReturnType<typeof postgres> | null = null;
async function reserve(userId:string,seconds:number) {
  const conn=Deno.env.get("SUPABASE_DB_URL");
  if (!conn) throw Error("Missing database connection");
  db ||= postgres(conn,{max:1,prepare:false,ssl:"require",idle_timeout:10,connect_timeout:6});
  const result=await db.unsafe("select slovo_private.reserve_pronunciation($1::uuid,$2::int) as quota",[userId,seconds]);
  return result[0]?.quota as {ok:boolean;reason?:string;month_used?:number;day_used?:number};
}
function cap(value:unknown) {
  const n=Number(value);return value==null||!Number.isFinite(n)?null:Math.min(100,Math.max(0,Math.round(n)));
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="GET" && req.method!=="POST")return respond(405,{error:"Método no permitido"});
  if(req.headers.get("origin") && req.headers.get("origin")!==ORIGIN)
    return respond(403,{error:"Origen no autorizado"});
  try {
    const userId=await identifyUser(req);
    if(!userId)return respond(401,{error:"Inicia sesión para evaluar tu pronunciación"});
    if(req.method==="GET")return respond(200,{available:ready(),locale:"ru-RU",maxSeconds:12,monthlyBudgetSeconds:14400});
    if(!ready())return respond(503,{error:"La evaluación Azure F0 todavía no está activada. Puedes seguir practicando con escucha y grabación local.",code:"not_configured"});
    const length=Number(req.headers.get("content-length")||0);
    if(length>750000)return respond(413,{error:"Grabación demasiado grande"});
    const raw=await req.text();
    if(raw.length>750000)return respond(413,{error:"Grabación demasiado grande"});
    const data=JSON.parse(raw);
    const phraseId=String(data?.phraseId||"");
    const reference=PHRASES[phraseId];
    if(!reference)return respond(400,{error:"Frase no admitida"});
    const {bytes,seconds}=decodeAndInspect(String(data?.audioBase64||""));
    const quota=await reserve(userId,seconds);
    if(!quota?.ok)return respond(429,{
      error:quota?.reason==="daily_limit"?"Llegaste a tu límite diario de 5 minutos. Vuelve mañana.":"Se agotó el presupuesto gratuito de evaluación de este mes.",
      code:quota?.reason||"quota_exhausted",
    });
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    let answer:Response;
    try {
      const region=Deno.env.get("AZURE_SPEECH_REGION")!;
      answer=await fetch(
        "https://"+region+".stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=ru-RU&format=detailed",
        { method:"POST",signal:controller.signal,
          headers:{
            "Ocp-Apim-Subscription-Key":Deno.env.get("AZURE_SPEECH_KEY")!,
            "Pronunciation-Assessment":encodeHeader(reference),
            "Content-Type":"audio/wav; codecs=audio/pcm; samplerate=16000",
            "Accept":"application/json",
          },
          body:bytes,
        });
    } finally {clearTimeout(timer)}
    if(!answer.ok){
      if(answer.status===429||answer.status===403)
        return respond(503,{error:"El servicio gratuito de Azure no está disponible o alcanzó su límite. No volveremos a intentarlo automáticamente.",code:"azure_quota"});
      return respond(502,{error:"Azure no pudo analizar el audio. Reintenta más tarde."});
    }
    const result=await answer.json();
    if(result.RecognitionStatus!=="Success" || !result.NBest?.length)
      return respond(422,{error:"No se detectó suficiente voz. Intenta hablar con claridad, cerca del micrófono."});
    const best=result.NBest[0],score=best.PronunciationAssessment || {};
    const words=(best.Words||[]).slice(0,15).map((w:{Word?:string;PronunciationAssessment?:{AccuracyScore?:number;ErrorType?:string}})=>({
      word:String(w.Word||"").slice(0,40),
      accuracy:cap(w.PronunciationAssessment?.AccuracyScore),
      error:String(w.PronunciationAssessment?.ErrorType||"None").slice(0,32),
    }));
    return respond(200,{
      phraseId,reference,recognized:String(best.Display||result.DisplayText||"").slice(0,130),
      pronunciation:cap(score.PronScore),accuracy:cap(score.AccuracyScore),
      fluency:cap(score.FluencyScore),completeness:cap(score.CompletenessScore),
      words,note:"Puntuación orientativa del motor de Azure; no equivale a una evaluación humana.",
    });
  }catch(err){
    const message=String(err instanceof Error?err.message:err);
    if(/audio|WAV|grabación|micrófono|truncado/i.test(message))
      return respond(400,{error:message});
    return respond(503,{error:"No se pudo completar la evaluación sin riesgo para la cuota gratuita.",code:"temporarily_unavailable"});
  }
});
