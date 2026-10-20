# СЛОВО · Ruso útil desde cero

Aplicación PWA gratuita con desafíos diarios, miniconversaciones, lecciones, audio y cuentas individuales sincronizadas con Supabase.

## Estado de publicación

- App web: GitHub Pages mediante rama `main` y carpeta `/(root)`.
- URL prevista: https://mxrubiomx.github.io/slovo-ruso/
- Supabase: proyecto `slovo-ruso`, tabla `public.slovo_progress` con RLS por `auth.uid()`.
- Proyecto estático: `index.html`, `cloud.js`, `cloud.css`, `supabase-config.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`.

## Para activar GitHub Pages

En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**. La URL aparecerá después del despliegue.

## Configurar Supabase Auth

En Supabase > Authentication > URL Configuration:

- Site URL: `https://mxrubiomx.github.io/slovo-ruso/`
- Redirect URLs: `https://mxrubiomx.github.io/slovo-ruso/**`

Antes de compartir con testers, comprobar confirmación de correo, límites del SMTP y prueba de dos cuentas separadas. Los datos se almacenan localmente si no hay conexión; cada usuario puede exportar su JSON desde Ajustes.

No subas claves `service_role`, `sb_secret_` ni tokens personales. La clave `sb_publishable_` que aparece en `supabase-config.js` es pública y está protegida por RLS.
