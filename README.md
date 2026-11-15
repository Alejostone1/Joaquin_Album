# Joaquín — Mi pequeño universo

Experiencia web privada, cinematográfica y en 3D para guardar la historia de Joaquín, hijo de Leidy y Hernán: su llegada, su crecimiento, sus aventuras, fotos, videos y cartas para cuando sea grande.

- **Portada**: bosque prehistórico en 3D con cámara cinematográfica. Un estegosaurio sale de entre los helechos, mira a la cámara y aparece el título. Se puede tocar a los dinosaurios y abrir los huevos.
- **La historia** (`/historia`): siete capítulos conectados, cada uno con su color, su dinosaurio acompañante en 3D y nueve estilos distintos para presentar los recuerdos.
- **Administrador familiar** (`/admin`): subir fotos y videos, crear recuerdos, línea de tiempo, datos del nacimiento, etapas, cartas, títulos de capítulos y personas con acceso.

Todo es privado: hace falta iniciar sesión para ver cualquier foto, y nada se indexa en buscadores.

---

## 1. Requisitos

- **Node.js 20 o superior** (recomendado 22) — https://nodejs.org
- **PostgreSQL 16**. La forma más fácil es con Docker Desktop (incluido `docker-compose.yml`). También sirve un PostgreSQL instalado o uno en la nube (Neon, Supabase, Railway…).

## 2. Puesta en marcha (primera vez)

En una terminal dentro de esta carpeta:

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de configuración
#    Windows (PowerShell):  copy .env.example .env
#    macOS / Linux:         cp .env.example .env
```

Abre `.env` y cambia como mínimo:

| Variable | Qué poner |
|---|---|
| `AUTH_SECRET` | Un texto largo y aleatorio. Genera uno con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Los datos del primer administrador (mín. 8 caracteres de clave) |
| `COOKIE_SECURE` | `false` mientras pruebas en tu equipo por `http://`. En producción con HTTPS, `true` |
| `DATABASE_URL` | Ya viene lista para el Docker incluido |

```bash
# 3. Encender la base de datos (con Docker Desktop abierto)
docker compose up -d

# 4. Crear las tablas, el administrador, las etapas y cargar las fotos de la habitación
npm run setup

# 5. Abrir en modo desarrollo
npm run dev
```

Entra a **http://localhost:3000**, elige "Con sonido" o "Sin sonido", disfruta la intro y toca **Entrar a mi historia** con el correo y la clave del administrador.

## 3. Uso diario

| Quiero… | Dónde |
|---|---|
| Subir fotos y videos (varias a la vez, arrastrando) | Administrador → **Fotos y videos** |
| Contar un momento con fotos | **Recuerdos → Nuevo recuerdo**: título, texto, fecha, capítulo, etiquetas, fotos (ordenables, con foto principal ★), estilo de presentación y Borrador/Publicado |
| Ver los borradores antes de publicarlos | **Recuerdos → Vista previa con borradores** |
| Cambiar el orden de los recuerdos | Arrastra las filas en **Recuerdos** |
| Registrar meses, cumpleaños, primeras palabras, primeros pasos, viajes… | **Línea de tiempo** |
| Completar fecha, hora, peso, estatura y el primer encuentro | **Nacimiento** (lo que quede vacío se muestra como "Pronto"; nunca se inventa) |
| Escribir una carta para el futuro | En la historia, capítulo 7 → **Escribir una carta**. Puede quedar abierta, sellada hasta sus 18 años o hasta una fecha |
| Dar acceso a la familia | **Personas** (sólo administradores) |
| Cambiar los títulos o frases de los capítulos, u ocultar uno | **Capítulos** |

### Roles

| Rol | Puede |
|---|---|
| **Administrador** | Todo, incluido dar y quitar acceso |
| **Editor** | Subir archivos, crear, editar y publicar recuerdos, momentos, etapas y cartas |
| **Familia** | Ver la historia y escribir cartas |

### Estilos de presentación de un recuerdo

Cine (pantalla completa con franjas), Parallax, Zoom suave, Editorial, Superpuestas (polaroids en abanico), Collage, Secuencia (las fotos se suceden al bajar), Revelado progresivo y Máscara (se descubre a través de un huevo). "Automático" elige uno según la cantidad de fotos y evita repetir el anterior.

## 4. Privacidad y seguridad

- Sesiones con cookie `httpOnly` (el token nunca se guarda en claro en la base de datos), renovación automática y cierre de sesión real.
- Permisos comprobados **en el servidor** en cada página, acción y ruta de archivos.
- Fotos y videos guardados en `storage/` (fuera de la carpeta pública). Sólo se sirven con **sesión válida + enlace firmado que caduca en pocas horas**.
- Las fotos originales se guardan **sin modificar**. Para mostrarlas se generan versiones optimizadas (WebP) **sin metadatos** (se elimina la ubicación GPS). El original sólo lo pueden descargar editores y administradores.
- El formato real de cada archivo se comprueba por su contenido, no por la extensión.
- Las cartas selladas **no salen del servidor** hasta su fecha (sólo quien la escribió puede releerla).
- Límite de intentos de inicio de sesión, protección de origen en las subidas, cabeceras `noindex` + `robots.txt` que bloquean buscadores.

### Copias de seguridad

```bash
npm run backup                                    # crea backups/AAAA-MM-DD_HHMM (base de datos + archivos)
npm run backup -- --restore backups/2026-12-01_2030   # restaura una copia (reemplaza lo actual)
```

Guarda la carpeta `backups/` también fuera del equipo (disco externo o nube privada). Hazlo, por ejemplo, una vez al mes.

## 5. Publicarlo en internet (Vercel)

El proyecto ya está preparado para Vercel:

- **Archivos**: en Vercel no hay disco permanente, así que las fotos y videos van a un **Vercel Blob privado**. El navegador sube directo al almacenamiento (sin el límite de 4,5 MB de las funciones) con un token de un solo uso que sólo reciben editores; después el servidor valida el archivo y crea las versiones optimizadas. Para mostrarlas, la app comprueba la sesión y su propia firma y redirige a un **enlace firmado de Blob que caduca en 15 minutos**.
- **Base de datos**: cualquier PostgreSQL. En producción se usa un **esquema aislado** (`joaquin`) dentro de un proyecto de Supabase, con un usuario de base de datos propio que sólo puede ver ese esquema.
- **Despliegue**: el script `vercel-build` aplica las migraciones, crea el administrador y carga las fotos iniciales (sólo la primera vez) y luego compila.

Variables de entorno en Vercel:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Cadena del pooler de Supabase (puerto 6543) con el usuario `joaquin_app.<ref>` |
| `DB_SCHEMA` | `joaquin` |
| `DATABASE_SSL` | `true` |
| `AUTH_SECRET` | Secreto largo y aleatorio |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Primer administrador |
| `COOKIE_SECURE` | `true` |
| `NEXT_PUBLIC_STORAGE` | `blob` |
| `BLOB_READ_WRITE_TOKEN` | Lo crea Vercel al conectar el Blob store privado |

En otro servidor (VPS o un computador de la casa) también funciona sin Blob: los archivos se guardan en `STORAGE_DIR`.

## 6. Rendimiento y accesibilidad

- Calidad gráfica adaptativa (alta, media, baja) según el equipo, con ajuste automático si baja la fluidez. Se puede forzar con `?calidad=low` (o `high`, `medium`, `static`).
- Sin WebGL, con ahorro de datos o en `?calidad=static`, se muestra una versión **2D ilustrada en acuarela**.
- Respeta "reducir movimiento" del sistema: se salta la intro y se desactivan los efectos de scroll.
- El sonido nunca suena sin permiso: hay que elegir "Con sonido". Toda la música y los efectos se generan en el navegador (no hay archivos de audio).
- Fotos con miniatura borrosa mientras cargan, `srcset` por tamaño de pantalla y carga diferida.

## 7. Arquitectura

```
app/
  page.tsx                 Portada cinematográfica (+ acceso)
  historia/                La historia (7 capítulos) y la acción de escribir cartas
  admin/                   Administrador familiar (páginas + actions.ts con todas las acciones)
  api/auth/                Inicio y cierre de sesión
  api/media/               Subida en streaming y entrega privada con enlaces firmados y rangos (video)
components/
  three/                   Bosque 3D y dinosaurios procedurales (Three.js + React Three Fiber)
  intro/                   Orquestación de la portada, acceso, alternativa 2D
  story/                   Capítulos, 9 presentaciones, línea de tiempo, cartas, acompañante 3D
  admin/                   Biblioteca, subidas, formularios
  audio/                   Motor de sonido generativo (Web Audio API)
  ui/                      Letras burbuja, acuarelas, ilustraciones 2D
db/schema.ts               Modelo de datos (Drizzle ORM) · db/migrations/ SQL
lib/                       auth, storage, story (datos), constantes, calidad gráfica
scripts/                   migrate, seed, backup
seed-photos/               Las cuatro fotografías reales de la habitación (se importan con el seed)
```

**Herramientas y responsabilidades**

| Herramienta | Para qué |
|---|---|
| Next.js 15 + React 19 + TypeScript | Aplicación, servidor y acciones |
| Three.js + React Three Fiber + Drei | Escenarios, personajes, cámara, luz, materiales |
| GSAP + ScrollTrigger | Cámara de la intro, secuencias narrativas y efectos ligados al scroll |
| Framer Motion | Interfaz: botones, menús, modales, letras, reordenar |
| Tailwind CSS | Sistema de diseño |
| PostgreSQL + **Drizzle ORM** | Datos |
| sharp | Versiones optimizadas de las fotos |

> **Nota sobre Prisma**: el encargo lo sugería, pero Prisma necesita descargar binarios propios que no estaban disponibles en el entorno donde se construyó y probó este proyecto. Se usó **Drizzle ORM** (100 % JavaScript, sin binarios, misma base PostgreSQL y migraciones SQL versionadas), lo que permitió probar todo de punta a punta.

**Personajes**: los cuatro dinosaurios (estegosaurio, triceratops, pterodáctilo y el bebé en su huevo) están construidos 100 % con geometría procedural en código, con texturas de manchas acuareladas generadas en tiempo real, ojos grandes con brillo, mejillas rosadas y animaciones propias (caminar, correr, saltar, parpadear, mover la cola, mirar al cursor, dormir, celebrar, volar, posarse, salir del huevo).

**Tipografía**: Fredoka (títulos y letras burbuja), Baloo 2 (encabezados), Nunito (textos) y Quicksand (interfaz), servidas desde el propio proyecto.

## 8. Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo en http://localhost:3000 |
| `npm run build` / `npm start` | Compilar y ejecutar en producción |
| `npm run setup` | Migraciones + datos iniciales (se puede repetir sin duplicar) |
| `npm run db:generate` | Crear una migración nueva tras cambiar `db/schema.ts` |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run backup` | Copia de seguridad |
| `npm run typecheck` | Revisión de tipos |
