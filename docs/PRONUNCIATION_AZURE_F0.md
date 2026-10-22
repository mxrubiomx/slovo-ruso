# СЛОВО 6.2 — Evaluación de pronunciación con Azure F0

Estado: **backend seguro desplegado; frontend en rama de desarrollo; llamadas a Azure desactivadas hasta configurar F0**.

## Seguridad y gratuidad
- Azure Speech **Free F0**, no usar **S0**. La tarifa F0 anuncia 5 horas de Speech to Text mensuales para transcripción en tiempo real.
- La función exige `AZURE_SPEECH_TIER=F0`, `AZURE_SPEECH_ENABLED=true`, región y clave válidas. En ausencia de esa configuración devuelve 503 sin contactar a Azure.
- Cuota adicional en Postgres, atómica e inaccesible para usuarios: **16 200 segundos por mes entre todos** y **300 segundos al día por usuario**. Se reserva antes de usar Azure y no se reembolsa una reserva fallida (conservador).
- **El presupuesto de 4 horas y 30 minutos no garantiza por sí solo una factura cero** si el mismo recurso Azure se usa fuera de СЛОВО. Se debe crear un recurso **exclusivamente F0**, verificar su etiqueta y mantener deshabilitadas otras funciones y recursos.
- Requiere sesión auténtica de СЛОВО. El servidor acepta solo ocho frases predefinidas, WAV mono 16 kHz, máximo 12 segundos.
- No se guardan audios ni claves en GitHub, Supabase Storage ni las tablas de progreso. Microsoft recibe el audio para analizarlo cuando el servicio está activado. Informar al usuario y pedir permiso de micrófono.
- Una clave de Azure nunca se pega en chats ni en un commit; guardarla exclusivamente en **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (ruta puede variar).

## Qué debe hacer el propietario
1. Abrir https://portal.azure.com y confirmar que su tipo de suscripción no tendrá cargos por el recurso Speech F0. Si Azure requiere datos de pago, leer condiciones antes de aceptar, **no seleccionar servicios pagados**.
2. Crear un recurso **Azure AI Speech**, tarifa **Free F0**, exclusivamente para СЛОВО.
3. Anotar la **región** y la **clave** del recurso, sin compartirlas. Verificar su SKU F0 en Azure.
4. En el proyecto Supabase `tqikpiqyxyjzndhbsary`, guardar estos secretos:
   - `AZURE_SPEECH_TIER=F0`
   - `AZURE_SPEECH_REGION=<región de Azure>`
   - `AZURE_SPEECH_KEY=<clave secreta>`
   - `AZURE_SPEECH_ENABLED=true` **solo tras comprobar F0 y presupuesto**.
   - `SUPABASE_DB_URL`: conexión PostgreSQL **solo servidor**, cuando no esté incluida automáticamente. Usar cadena de conexión de Supabase; nunca en frontend ni GitHub.
5. Solicitar una prueba con cuenta real y una grabación corta. Verificar respuesta 200 y puntuación por palabra, con la aplicación en iPhone Safari y en la PWA instalada.

## Implantación
- Función Supabase ya desplegada: `pronunciation-assess` (requiere JWT).
- DB: `slovo_private.pronunciation_usage`, `slovo_private.reserve_pronunciation(uuid, integer)`. Esquema privado; acceso denegado a `anon` y `authenticated`.
- Frontend: `pronunciation.js` + `pronunciation.css`, visible desde Practicar y Repasar.
- Rama: `feature/v6.2-pronunciation-azure-f0`. **No fusionar hasta completar la configuración y una prueba real.**
- Backup estable: `backup/v5.1-stable-2026-10-21`. Producción actual permanece СЛОВО 6.0.1.

## Límites
- El motor proporciona **orientación** y puede equivocarse con acentos o ruido. No ofrecer certificado de pronunciación.
- Evaluación de palabras y fluidez compatible con ruso (`ru-RU`). No atribuir funciones solo disponibles en inglés a ruso.
- Se usa reconocimiento de audio corto y no conversaciones infinitas. Si hay error/cuota, se bloquea evaluación sin reintentos automáticos.

## Actualización de cuota — 21 de octubre de 2026

Límite mensual compartido: **16 200 segundos = 270 minutos = 4 h 30 min**; 90 % de los 18 000 segundos anunciados en F0. El límite individual sigue siendo 300 segundos diarios. El cupo está reservado por la función privada `slovo_private.reserve_pronunciation` en Supabase; no se modifica el registro de progreso ni la autenticación.

**Importante:** La tarifa F0 tiene limitaciones propias y el tope de СЛОВО no evita cargos de otros recursos dentro de una suscripción Azure. Solo usar el recurso dedicado F0, sin upgrade a S0. Azure puede contabilizar por una ventana mensual distinta a la nuestra; vigilar los contadores y detener el servicio si se alcanza el tope del proveedor.

El Dashboard de Supabase inyecta `SUPABASE_DB_URL` automáticamente. **No crear manualmente un secreto con prefijo `SUPABASE_`**, que está reservado para la plataforma.
