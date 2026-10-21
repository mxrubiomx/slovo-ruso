# СЛОВО 6.0 — Blueprint de experiencia (propuesta A)

**Estado:** Concepto estratégico, no implementado.  
**Identidad:** «Las palabras cobran vida».  
**Rama de diseño:** `design/v6-ux-blueprint`.  
**Versión estable preservada:** `backup/v5.1-stable-2026-10-21` en `334ee6baf3c77b8a29dc0962dd6558021b55a9d1`.  
**Producción:** GitHub Pages desde `main`, sin alterar.  
**Backend:** Supabase existente, sin migraciones en la primera fase del rediseño.

---

## 1. Problema a resolver

СЛОВО 5.1 funciona y permite practicar ruso desde PC e iPhone, guardar progreso en Supabase, autenticarse con Google o contraseña y personalizar nombre/foto. Sin embargo, la interfaz todavía se percibe rígida y técnica: demasiadas tarjetas, duplicidad de bloques principales y un lenguaje visual más próximo a un panel de control que a una experiencia de aprendizaje.

**Objetivo de СЛОВО 6.0:** lograr que el usuario sepa qué hacer hoy en menos de cinco segundos, disfrute cada interacción y reconozca una identidad propia sin copiar la estética de Duolingo.

**Principios innegociables:**
1. **Primero practicar:** el contenido prioritario debe ser el selector «¿Cuánto te queda hoy?» de 1, 3 y 7 minutos. Sin otro banner grande por encima.
2. **Una meta inequívoca:** completar Escucha + Habla + Recuerda (0/3 a 3/3). Las micro-misiones son práctica *adicional*, no equivalen automáticamente a esos tres retos.
3. **Celebrar, no castigar:** reconocer el esfuerzo, sin culpa por ausencias ni rachas punitivas.
4. **Un humano, no un dashboard:** menos métricas en portada, mensajes personales y lenguaje cotidiano.
5. **Una sola cuenta:** preservar Supabase Auth, perfil, foto, XP, diálogos, lecciones y tarjetas; sin registrar usuarios otra vez.
6. **Pequeña y rápida:** experiencia móvil excelente, modo PWA iPhone fiable, peso contenido, animaciones degradables.

## 2. Personalidad de marca

**Promesa:** «Un poco de ruso que sí vas a usar».  
**Arquetipo:** compañero curioso + mentor paciente.  
**Voz:** cercana, breve, inteligente; nunca infantilizante, condescendiente ni demasiado festiva.  
**Tres palabras:** cálida · expresiva · tranquila.

**Ejemplos de microcopy:**

| Situación | Antes (tono sistema) | Después (tono СЛОВО) |
|---|---|---|
| Inicio | DESAFÍO DEL DÍA | «Hoy aprendemos algo que sí dirías» |
| Meta 0/3 | 0/3 retos | «Tres pasos cortitos. Tú eliges cuándo» |
| Escucha terminada | Reto completado | «¡Bien oído! Una menos» |
| Respuesta incorrecta | Incorrecto | «Casi. Escúchala otra vez» |
| Sesión de 1 min | MÍNIMO VIABLE | «Solo un minuto. Cuenta» |
| Meta completada | OBJETIVO CONSEGUIDO | «Ya tienes tu ruso de hoy. ¡Bien hecho!» |
| Reaparición | Racha perdida | «Qué bueno verte por aquí» |

Nota: no afirmar falsamente que el sistema evalúa la pronunciación. La actividad Habla actual es guiada/autoevaluada, no un reconocimiento de voz fiable.

## 3. Dirección visual — «Las palabras cobran vida»

### 3.1 Estilo elegido
**Playful editorial / pocket language studio:** apariencia amable, pulida y moderna. Superficies redondeadas, capas de papel, sombras físicas suaves, tipografía expresiva y pequeñas ilustraciones de palabras/burbujas. Uso restringido de métricas e iconografía administrativa.

**No copiar:** personaje, estructura de pantallas, sonidos o animaciones reconocibles de Duolingo. Diseñar componentes originales.

### 3.2 Temas
**Principal: claro cálido**, para romper el aspecto «panel tecnológico». **Alternativo: noche menta** para conservar lo mejor de СЛОВО 5.1. Selección persistida por usuario *localmente en primera entrega*; la sincronización de preferencias entre dispositivos se evaluará por separado.

| Token | Tema claro | Tema oscuro |
|---|---|---|
| Canvas | `#F7F5EF` | `#111D20` |
| Surface | `#FFFEFA` | `#1C2B2E` |
| Text | `#243029` | `#EFF8F4` |
| Muted | `#64736C` | `#A7BBB6` |
| Primary mint | `#79DCAF` | `#89EBC1` |
| Primary text | `#14382B` | `#14382B` |
| Peach | `#FFC3A2` | `#B6745A` |
| Lavender | `#CEBBFA` | `#9E8CD9` |
| Sky | `#A5DEFA` | `#73AFCF` |
| Border | `#DDE7DE` | `#3E5550` |

Verificar contraste AA de todos los estados reales. No comunicar resultados solo mediante color.

### 3.3 Tipografía
**Rubik** como fuente primaria de interfaz y ruso (comprobar subconjuntos cirílicos y latinos). Pesos 400/500/600/700; máximo tres pesos por pantalla. Fallback a sistema iOS/Android/Windows cuando esté offline. Titulares humanos y con menos mayúsculas; ruso como acento, nunca como ruido ornamental.

Escala objetivo móvil: Hero 30–34 px, H2 21–24 px, texto 15–16 px, secundario >= 12–13 px, área táctil >= 44 × 44 CSS px.

### 3.4 Materialidad, color y profundidad
- Radio amplio: tarjeta 22 px, botón 16 px, chip 999 px.
- Tarjetas principales con sombra de profundidad suave (altura óptica de 2–4 px) y desplazamiento real al tocar; evitar bordes triples y brillos agresivos.
- Una superficie «estrella» por pantalla. Resto, fondos sencillos.
- Iconos orgánicos redondeados, pictogramas propios para Escucha/Habla/Recuerda.
- Evitar tarjetas dentro de tarjetas: usar espacio, subtítulos y separadores livianos.

## 4. Nueva arquitectura de información

Navegación móvil, hasta cinco pestañas:
- **Hoy:** tiempo disponible y objetivo 3/3; una recomendación personal.
- **Ruta:** lecciones ordenadas, alfabeto, progreso curricular.
- **Practicar:** diálogos, repaso espaciado y ejercicios adicionales.
- **Logros:** métricas semanales, hitos, insignias, historial.
- **Perfil:** nombre, foto, métodos de acceso, ajustes, privacidad y copias.

En PC: navegación lateral compacta con los mismos cinco destinos. Los IDs y estados existentes permanecen iguales internamente; el cambio de navegación no debe cambiar el formato de progreso.

### 4.1 Wireframe de Inicio — iPhone 390 px

```text
┌────────────────────────────────────────┐
│ [safe area: Dynamic Island / status]   │
│ СЛОВО              [Avatar] Привет!   │
│                                        │
│ ¿Cuánto te queda hoy?                  │
│ Un minuto también es avanzar.          │
│ ┌──────────┬──────────┬──────────────┐ │
│ │    1'    │    3'    │     7'       │ │
│ │ ligero   │ tranquilo│ con ganas    │ │
│ └──────────┴──────────┴──────────────┘ │
│                                        │
│ Tu ruso de hoy             1 de 3     │
│ ● Escucha ── ○ Habla ── ○ Recuerda     │
│ ┌────────────────────────────────────┐ │
│ │ ▶ Continuar: Habla                 │ │
│ └────────────────────────────────────┘ │
│                                        │
│  ✦ Mensaje contextual personal        │
│    «Ya descubriste una frase útil»    │
│                                        │
│  Más para explorar                    │
│  [Diálogo cotidiano] [Repasar]         │
│                                        │
│ [safe bottom nav: Hoy Ruta ... Perfil] │
└────────────────────────────────────────┘
```

**Prioridades de lectura:** tiempo disponible > meta diaria > siguiente acción > exploración. El nombre y avatar aparecen en una cabecera compacta, sin competir con «¿Cuánto te queda hoy?».

**Distinguir:** tocar 1/3/7 inicia una micro-misión. Tocar «Continuar» inicia el siguiente paso de la meta diaria. Mostrar esta distinción en texto y mantener ambos registros independientes.

### 4.2 Ruta
Camino vertical de nodos suaves en lugar de tabla; unidades con narrativa (Primeras palabras → Conversaciones → Más autonomía). Lecciones completadas con marcas visibles, siguientes desbloqueadas y bloqueadas accesibles a lectura (sin crear falsa frustración). El alfabeto vive como bloque especializado.

### 4.3 Practicar
Dos tarjetas editoriales superiores: «Tu siguiente diálogo» y «Lo que conviene repasar». Entrada al catálogo por debajo. Fichas de conversación con pequeñas escenas en lugar de filas mecánicas.

### 4.4 Logros
Dar protagonismo a **habilidades** (frases recordadas, ejercicios escuchados, diálogos realizados), no solo XP. Gráfico semanal ligero, personal, sin comparaciones públicas. Insignias por hitos reales; el sistema de XP actual se conserva.

### 4.5 Perfil
Foto y nombre prominentes; identidad y preferencias; opciones de cuenta Google/contraseña ya existentes, cambio de tema, sonidos, animaciones, datos y exportación. Preservar configuración OAuth y privacidad de avatares.

## 5. Companion visual opcional: «Искра / Chispa»

Concepto de una pequeña chispa redondeada integrada en una burbuja de diálogo; no mascota animal ni figura infantil copiada. Estados: tranquila, curiosa, celebrando, escuchando y descansando. Aparece ocasionalmente en Inicio/resultado, nunca tapa ejercicios ni impide tocar botones. Versión estática siempre disponible. **Es una propuesta creativa pendiente de aprobar**, no componente bloqueante de 6.0.

## 6. Sistema de motion y sonido

| Interacción | Movimiento sugerido | Sonido |
|---|---|---|
| Presionar botón | descenso 2 px + escala 0.985, 90 ms | clic suave opcional |
| Respuesta correcta | cambio de superficie + rebote 220–350 ms | nota corta opcional |
| Respuesta incorrecta | 2 desplazamientos suaves, 180 ms | silencio o golpe muy tenue |
| Completar 1 reto | progreso animado 350 ms | 1 nota, no confeti completo |
| Completar 3/3 | aparición de sello + 10–16 partículas, <= 1.2 s | secuencia breve opcional |
| Desbloquear lección | expansión escalonada 300–500 ms | opcional |
| Navegar pantallas | fade+translate de 6 px, 150–220 ms | sin sonido |
| Companion en reposo | animación ocasional >= 8 s | sin sonido |

**Reglas:** `prefers-reduced-motion` anula movimiento decorativo, el botón de animaciones funciona también por usuario, y el sonido no se reproduce automáticamente antes de interacción explícita del usuario. Animar `transform` y `opacity`, evitar layout thrashing, cargar sonidos ligeros localmente. Priorizar 60 FPS en un iPhone de rendimiento medio; reducir partículas y efectos en equipos lentos. No prometer vibración háptica en iOS Web Apps (soporte limitado).

## 7. Personalización con significado

**Fase primera (sin DB):** saludo por nombre/foto desde `slovo_profiles`; recomendaciones basadas en datos existentes (retos pendientes, `dueCards()`, siguientes lecciones/diálogos); tema y nivel de animación como preferencias locales; cero atributos sensibles inventados.

**Fase posterior (requiere revisar DB):** motivo para aprender ruso, situaciones que interesan (viaje, charla, cultura), velocidad de TTS, objetivo semanal elegido, sincronizar preferencias entre PC/iPhone. No inferir metas privadas de personas que comparten dispositivos. Mantener privado por defecto.

**Recomendador determinista inicial:** prioridad (1) siguiente reto diario (2) tarjetas vencidas (3) siguiente diálogo sin practicar (4) siguiente lección; mostrar *por qué* se recomienda («Tienes 4 frases por repasar»). No venderlo como IA adaptativa si no existe un modelo que la impulse.

## 8. Alcance V6.0 / fuera de alcance

**En alcance:** tema claro/oscuro, jerarquía de Inicio rediseñada, navegación coherente, tarjetas/estados físicos, feedback a ejercicios, animaciones configurables, copy humano, flujo de progreso visual y perfil integrado.

**Fuera de alcance en el primer lanzamiento:** chat generativo con IA, puntuación automática de pronunciación, gamificación competitiva pública, nuevos esquemas de XP, pagos o publicidad, reescritura total de lógica de aprendizaje, cambios en políticas SQL. Pueden planificarse después de pruebas.

## 9. Implementación por hitos seguros

**M0 — Línea base**: branch `backup/v5.1-stable-2026-10-21`; confirmar acceso Google/contraseña, perfil/foto, XP y sincronización, exportación JSON.

**M1 — Sistema visual**: tokens semánticos y CSS aislado; tipografías, profundidad, escalas de espacio, temas. Mantener estructura y lógica de datos.

**M2 — Inicio**: reemplazar bloque visual por selector 1/3/7 + línea Escucha/Habla/Recuerda con CTA y progreso; comprobar todos los casos 0/3–3/3; cambiar solo presentación.

**M3 — Navegación y pantallas**: nuevas agrupaciones Ruta/Practicar/Logros/Perfil; proteger iOS safe area y modal Google/contraseña.

**M4 — Motion/recompensas**: microinteracciones, sonidos opt-in, accesibilidad, mascot solo si se aprueba. Respeto por reduced motion y sesiones offline.

**M5 — Beta gradual**: pruebas PC, iPhone Safari e iPhone PWA instalada; dos cuentas, apertura desde OAuth, copia JSON, foto y recuperación tras offline; publicación únicamente tras aprobar con usuario.

**Estrategia Git:** crear `feature/v6-redesign` a partir de `main`; publicar desde PR o merge aprobado. No escribir rediseño directamente en `main` mientras se valida. Mantener `backup/v5.1-stable-2026-10-21` sin nuevas confirmaciones.

### Criterios de aceptación observables

- Usuario nuevo identifica en <= 5 segundos el selector de tiempo y el objetivo 3/3 (objetivo de usabilidad a validar con testers).
- La meta diaria y las micro-misiones nunca se confunden en textos, contadores o efectos.
- Botones y cuenta accesibles en PWA iPhone con Dynamic Island y safe areas.
- Navegación < 250 ms percibidos en dispositivo de prueba sin red.
- `prefers-reduced-motion` y el modo sin sonido no producen sorpresas.
- Google, contraseña y restablecimiento de clave conservan el mismo usuario.
- Perfil, foto, XP, racha y tarjetas recuperables al cambiar de dispositivo.
- Ninguna operación visual reescribe `slovo_progress` ni sus políticas.
- Acciones principales no quedan ocultas bajo overlays / barras.
- Restauración de V5.1 probada en un entorno de prueba antes de publicar V6.

## 10. Rollback operativo

**Código estable fijado:** `334ee6baf3c77b8a29dc0962dd6558021b55a9d1`; `backup/v5.1-stable-2026-10-21`.

Cuando sea necesario revertir producción:
1. Confirmar el HEAD de `main` y que no haya cambios concurrentes ni migraciones de datos incompatibles.
2. Crear commit de restauración sobre `main` con el contenido de la rama protegida, sin borrar la rama `main`.
3. Verificar que GitHub Pages redepliega y recarga `index.html`, `cloud.js`, `cloud.css` y `sw.js`.
4. Probar inicio Google, contraseña y recuperación de progreso después de reiniciar la PWA; no borrar almacenamiento local.
5. Mantener `slovo_profiles`, `slovo_progress`, Supabase Auth y Storage intactos. Restaurar código **no** restaura instantáneas de base de datos.

Si se trabaja localmente con Git:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git restore --source origin/backup/v5.1-stable-2026-10-21 --staged --worktree .
git commit -m "Rollback de la interfaz a SLOVO 5.1 estable"
git push origin main
```

Estas instrucciones reemplazan los archivos rastreados de `main` por los del respaldo y generan un commit reversible. Revisar `git status` y `git diff --cached` antes de confirmar; no emplear `git reset --hard` ni push forzado en producción.

La reversión de datos de Supabase no está cubierta por este procedimiento. Para V6 visual, prohibir cambios estructurales de base de datos que lo requieran.

## 11. Decisiones de producto pendientes de confirmar

1. ¿Tema claro cálido como predeterminado y oscuro disponible como opción? (recomendación: sí).
2. ¿Companion «Искра» sutil, ocasional y desactivable? (recomendación: prototipar antes de incluir).
3. ¿Pantalla de éxito con sello personal y confeti solo para completar 3/3? (recomendación: sí).
4. ¿Mantener sesión gratuita 1/3/7 como acceso prioritario de Inicio? (requisito heredado: sí).

**Próximo entregable tras aprobar este blueprint:** prototipo de alta fidelidad de Inicio + pantalla de reto + Perfil en claro y oscuro, antes de implementar sobre la app en producción.

---

## 12. Prototipo interactivo listo para evaluación (21 oct 2026)

**Archivo:** [prototypes/slovo-6/index.html](../prototypes/slovo-6/index.html)  
**Rama exclusiva:** `design/v6-ux-blueprint`; **la app en `main` no se modificó**.  
**Versión estable recuperable:** `backup/v5.1-stable-2026-10-21`.

La maqueta es una página HTML independiente. Estática, sin Supabase, sin acceso a Google ni a contraseñas reales. Funciona con datos de demostración guardados bajo la clave local `slovo_v6_demo_only` del navegador donde se abre, separados del progreso de СЛОВО 5.1.

**Pantallas desarrolladas en el prototipo:**
- **Hoy:** portada personal, elección interactiva 1/3/7 minutos, itinerario Escucha/Habla/Recuerda y siguiente acción.
- **Ejercicio:** avance por preguntas, pronunciación opcional del dispositivo, feedback y recompensa al completar.
- **Perfil:** nombre, foto de demostración, tema cálido / noche menta, controles de movimiento, sonido e Искра.
- **Ruta / Practicar / Logros:** pantallas conceptuales; aún no recrean el contenido real.

**Pruebas de lógica y eventos efectuadas:** script válido; navegación, selección de 7 min, flujo micro-misión, feedback correcto, siguiente pregunta, cambio de tema, edición de nombre y avance 1/3 del objetivo diario. **Pendiente:** revisión visual y táctil en Safari/iPhone, accesibilidad con VoiceOver y pruebas de rendimiento.

**Cómo probar localmente:** descargar `prototypes/slovo-6/index.html` desde GitHub y abrirlo en un navegador. No reemplazar el `index.html` de producción; no ingresar contraseñas en un visor externo del prototipo.

**Decisiones pendientes:** composición móvil, tema por defecto, el personaje Искра y el tratamiento de la pantalla «Reto terminado».
