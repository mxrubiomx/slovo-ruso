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

## Activar inicio de sesión con Google (OAuth gratuito)

La interfaz incluye **Continuar con Google** desde la versión 4.3. Para que funcione el administrador debe configurar OAuth. El botón no puede iniciar sesión hasta completar este paso.

1. En [Google Cloud Console](https://console.cloud.google.com/) crea o selecciona un proyecto. En **Google Auth Platform**, configura **Branding**, **Audience** (External para amigos) y los permisos mínimos `openid`, `email` y `profile`. Para probar con terceros, añade esas cuentas como usuarios de prueba si mantienes el proyecto en modo Testing o publica la app para permitir un público más amplio.
2. En **Clients** crea un **OAuth Client ID** de tipo **Web application**. En **Authorized JavaScript origins** añade `https://mxrubiomx.github.io` (sin ruta). En **Authorized redirect URIs** añade `https://tqikpiqyxyjzndhbsary.supabase.co/auth/v1/callback`.
3. Copia Client ID y Client Secret desde Google Cloud **directamente** en [Supabase → Authentication → Sign In / Providers → Google](https://supabase.com/dashboard/project/tqikpiqyxyjzndhbsary/auth/providers). Activa Google y guarda.
4. En [Supabase URL Configuration](https://supabase.com/dashboard/project/tqikpiqyxyjzndhbsary/auth/url-configuration), confirma Site URL `https://mxrubiomx.github.io/slovo-ruso/` y Redirect URLs `https://mxrubiomx.github.io/slovo-ruso/**`.
5. Prueba el acceso Google en un navegador privado; confirma que se crea la identidad en Supabase Auth y que los avances pertenecen solo a ese usuario. Repite en iPhone.

**Seguridad:** NO subas nunca el Client Secret de Google ni las claves `service_role`/`sb_secret_` al repositorio. Las credenciales OAuth de Google se guardan solamente en Supabase. No son necesarias para el navegador. No necesitas activar facturación de Google Cloud para el flujo básico de acceso social; el plan Free de Supabase incluye proveedores OAuth bajo sus límites.

**Nota sobre usuarios con correo y contraseña existentes:** Si una cuenta de Google usa el mismo correo que una cuenta confirmada de СЛОВО, Supabase puede enlazar automáticamente la identidad según sus reglas de autenticación. Comprueba antes de asumir que los datos antiguos se habrán fusionado.
