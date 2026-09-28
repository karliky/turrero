# El Turrero Post

Archivo de las "turras" (hilos de X) de Javier G. Recuenco y la Comunidad CPS sobre resolución de problemas complejos: lectura cómoda, archivo filtrable por año, categoría y autor (`/turras`), búsqueda, autores, una guía de por dónde empezar con las series completas (`/empieza-aqui`, datos en `app/empieza-aqui/guia.ts`), glosario, un mapa de ideas (`/mapa-de-ideas`: qué conceptos del glosario aparecen cada año y qué turras citan a cuáles, calculado en el build con `lib/concepts.ts`), biblioteca de libros citados y exámenes.

Web: https://turrero.vercel.app

## Arquitectura

```
X API v2 ──► lib/x.ts ──► lib/ingest.ts ──► data/turrero.db (SQLite) ──► lib/queries.ts ──► Next.js
                            ▲                                                        │
              OpenAI ──► lib/ai.ts                                      /api/search (FTS5)
```

- **Una sola fuente de verdad**: `data/turrero.db`, un fichero SQLite versionado en git. El esquema está en `data/migrations/`.
- **La web** (Next.js 16, App Router) se genera estática en el build leyendo la base de datos. Sólo la búsqueda (`/api/search`) y el proxy de vídeo (`/api/tweet-video`) se ejecutan en runtime.
- **Añadir una turra** consulta la API oficial de X, normaliza el hilo al modelo propio y lo guarda; después OpenAI genera título, categorías, examen y categorías de los libros enlazados.

### Modelo de datos

| Tabla | Contenido |
|---|---|
| `authors` | Autores (handle, id de X, nombre). |
| `threads` | Turras: tweet raíz, autor, título, fecha, examen (JSON) y fecha de la última sincronización. |
| `tweets` | Tweets de cada turra, en orden, con sus estadísticas. |
| `media`, `links`, `quotes` | Fotos/GIFs/vídeos, tarjetas de enlaces y tweets citados de cada tweet. |
| `categories`, `thread_categories` | Categorías (slug, nombre, meta description, introducción y criterios de clasificación) y su asignación a turras; `position` 0 es la categoría principal. |
| `books` | Libros de Goodreads; sus menciones salen de `links`. |
| `glossary` | Glosario CPS. |
| `search` | Índice de texto completo (FTS5), derivado de `tweets`. |

El código está en `lib/` (dominio, base de datos, X, IA), `app/` (páginas) y `scripts/` (comandos).

## Puesta en marcha

Requiere Node.js 22.13 o superior.

```bash
npm install
cp .env.example .env.local   # sólo necesario para añadir o refrescar turras
npm run db:migrate           # aplica migraciones pendientes del esquema
npm run dev                  # http://localhost:3000
```

## Añadir una turra

```bash
npm run turra:add -- https://x.com/usuario/status/123456789
```

Acepta la URL o el id de cualquier tweet del hilo. Descarga sólo la cadena de tweets en la que el autor se responde a sí mismo (nunca las respuestas de otras personas), descarga las imágenes de las tarjetas de enlaces a `public/metadata/` (las de X caducan), registra al autor si es nuevo, guarda los tweets y los enriquece con IA. Si la IA falla o no hay `OPENAI_API_KEY`, la turra queda guardada con un título provisional y se completa con `npm run turra:enrich -- <id>`.

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run turra:discover -- [--author Recuenco] [--since AAAA-MM-DD] [--add]` | Busca las turras del autor publicadas en sábado desde la última archivada (posts que mencionan "hilo"/"turra", con 8 tweets o más). Con `--add` las importa. |
| `npm run turra:sync -- <id> [--delete-missing]` | Vuelve a descargar una turra de X conservando título, categorías y examen. Con `--delete-missing` la borra si ya no existe en X. |
| `npm run turra:enrich -- <id> [--refresh]` | Regenera título, categorías y examen con OpenAI. |
| `npm run turra:export-obsidian -- --out <carpeta> [--id <id>] [--overwrite]` | Exporta turras como notas Markdown para Obsidian. |

Tras cualquier cambio, `data/turrero.db` se commitea como el resto del código.

Las llamadas a X y a OpenAI son de pago, así que sus respuestas completas se guardan en `.cache/api/` (ignorado por git) y se reutilizan: repetir un `turra:add` o un `turra:enrich` no vuelve a pagar la misma petición. `turra:sync` siempre pide datos frescos (y actualiza la caché); `turra:enrich --refresh` fuerza una respuesta nueva de OpenAI.

## Categorías

Las 15 categorías salen de leer las 269 turras completas (septiembre de 2026). Todo el proceso está versionado en `data/categorization/`:

- `notes/`: una nota por turra con su tema real, escrita sin ver las categorías antiguas.
- `taxonomy.json`: las categorías, con reglas generales, qué entra, qué no y cómo desempatar con las vecinas, y los slugs retirados con su redirección.
- `pass-a/` y `pass-b/`: dos clasificaciones independientes con una cita literal que justifica cada categoría. Coincidieron en la principal en el 97,8 % de las turras.
- `resolutions.json` y `disagreements.md`: los desacuerdos decididos a mano y su motivo.
- `assignments.json`: el resultado, que `npx tsx scripts/categorize-migration.ts NNNN_nombre` convierte en una migración.

Cada turra tiene una categoría principal y hasta dos secundarias. Los criterios de `taxonomy.json` están en la base de datos (`categories.criteria`), y OpenAI los usa para clasificar las turras nuevas. Las URLs de categorías retiradas redirigen con 301 (`LEGACY_CATEGORY_URLS` en `lib/site.ts`), y `tests/categorization.test.ts` comprueba que la base de datos y `data/categorization/` coinciden.

### Libros de la biblioteca

Los libros tienen 11 categorías temáticas propias, con el mismo método que las turras: `books-taxonomy.json`, dos pasadas independientes (`books-pass-a/`, `books-pass-b/`), desacuerdos resueltos en `books-resolutions.json` y resultado en `books-assignments.json`. `npx tsx scripts/categorize-books.ts NNNN_nombre` genera la migración. Cada libro tiene 1 categoría principal y como mucho 1 secundaria.

`npm run books:metadata` rellena el autor y la portada de los libros que no la tienen. La fuente principal es la página de Goodreads del propio libro, que es exacta; después Open Library y, por último, Google Books. Las búsquedas por título se aceptan solo si también coincide el subtítulo. Las respuestas se cachean en `.cache/api/` y las portadas se guardan en `public/metadata/book-<id>.jpg`. Con `--dry-run` solo escribe el informe `.cache/books-report.md` para revisarlo.

## Glosario

`/glosario` tiene 90 términos. Cada uno lleva:
- una definición corta y una explicación;
- su origen;
- las turras que lo explican (enlazadas al tweet concreto);
- sus términos relacionados.

En las turras, la primera aparición de cada término queda enlazada, con la definición corta al pasar el ratón (`lib/glossary-links.ts`).

El contenido versionado está en `data/glossary/glossary.json` y `redirects.json` (anclas antiguas → nuevas). Para cambiarlo:
1. Edita `glossary.json`.
2. Genera una migración con `npx tsx scripts/glossary-migration.ts NNNN_nombre`.
3. Aplícala con `npm run db:migrate`.

`scripts/glossary-evidence.ts` busca en qué turras aparece cada término candidato, y `tests/glossary.test.ts` comprueba el estilo, las referencias y las fuentes.

## Ebook

`npm run build` genera antes `public/ebook/el-turrero-post.epub` (EPUB 3 con todas las turras, validado con EPUBCheck), que se descarga desde `/ebook`. El fichero no se versiona: se regenera en cada build desde la base de datos. Para generarlo sin compilar la web: `npm run ebook`.

Las imágenes se reducen (fotos a 600 px, fotogramas de GIF/vídeo a 360 px, JPEG comprimido) para que el libro pese ~25 MB; los ajustes están en `scripts/build-ebook.ts`. Las imágenes descargadas y procesadas se cachean en `.cache/ebook-images/`.

## Tests y comprobaciones

```bash
npm test          # vitest
npm run check     # typecheck + lint + tests
npm run build
```

Los tests no llaman a X ni a OpenAI: usan respuestas simuladas (`tests/fixtures/`).

## Variables de entorno

| Variable | Uso |
|---|---|
| `X_API_KEY`, `X_API_KEY_SECRET` | Credenciales de la app de X (`turra:add`, `turra:sync`); con ellas se obtiene un token app-only. |
| `X_API_BEARER_TOKEN` | Alternativa a las dos anteriores: el token app-only directamente. |
| `OPENAI_API_KEY` | Enriquecimiento con IA (`turra:add`, `turra:enrich`). |
| `OPENAI_MODEL` | Opcional; modelo de OpenAI (por defecto `gpt-5.4-mini`). |

La web no necesita ninguna variable para compilar ni para servirse.
