# СЛОВО 6.1 — Diseño sonoro sin dependencias externas

## Propósito
Integrar sonido útil, breve y agradable, sin interrumpir audio ruso ni recurrir a recursos o servicios de pago. Respetar diseño claro/oscuro, iPhone PWA y continuidad de cuentas, XP y progreso.

## Sonidos
| Suceso | Preset | Principio |
| --- | --- | --- |
| Navegación/selección | `tap` | Un toque mínimo y discreto |
| Avance de un ejercicio | `step` | Dos tonos cortos ascendentes |
| Respuesta correcta | `correct` | Dos notas ascendentes cálidas |
| Respuesta incorrecta | `incorrect` | Caída suave, sin sonido de penalización |
| Autovaloración oral/repaso | `reward` | Recompensa discreta |
| Lección/misión/diálogo/meta terminados | `complete` | Cuatro notas cortas de celebración |

## Preferencias y accesibilidad
- **Interruptor principal de efectos**: reutiliza `prefs.sound` de `cloud.js` y el control de perfil existente, incluidas preferencias separadas por cuenta.
- **Volumen**: 0–100 %, inicial 35 %, se almacena solo en el dispositivo en `slovo_sfx_volume_v1`. Puedes escuchar una vista previa de tres efectos.
- **Voz rusa**: la voz sintetizada `speechSynthesis` sigue siendo independiente. Los efectos se silencian durante voz activa, pendiente o grabación de reto.
- Audio sintetizado mediante Web Audio API, sin MP3 ni descargas, sin red; funciona incluso offline tras cachear los archivos.
- Sin reproducción automática al abrir la página: el contexto de audio se activa mediante clic/tap del usuario, compatible con la política de Safari/iOS.
- Si Web Audio no está disponible, la app funciona sin efectos.
- Controles táctiles de al menos 44px y foco visible en el panel.

## Archivos
- `soundfx.js`: presets, AudioContext reutilizable, preferencias y eventos de interacción.
- `soundfx.css`: controles y tokens visuales de СЛОВО 6.
- `cloud.js`: puente de preferencia, elimina sonido legacy duplicado, mantiene confeti independiente.
- `index.html` y `sw.js`: carga después de cloud/v6 y precache PWA.
- `tests/soundfx-check.mjs` + `.github/workflows/quality.yml`: QA automatizado.

## Seguridad y releases
- Implementado en `feature/v6.1-sound-effects` desde el `main` que ya contiene los ajustes de contraste AP1-001.
- No realizar cambios en el borrador `feature/v6.2-pronunciation-azure-f0` ni activar Microsoft Azure Speech.
- No cambia tablas ni Edge Functions de Supabase.
- Conservar backup de 5.1 y cache `slovo-v6.1-soundfx` para distribuir correctamente actualizaciones a iPhone.
- Pruebas manuales pendientes: Safari iPhone instalado, altavoz en modo silencio, VoiceOver, volumen de sistema y modo oscuro/claro.
