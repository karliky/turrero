# El Turrero Post

Archivo de las "turras" (hilos de X) de Javier G. Recuenco y la Comunidad CPS sobre resolución de problemas complejos: lectura cómoda, categorías, búsqueda, autores, glosario, biblioteca de libros citados, exámenes y grafo de relaciones.

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
| `threads` | Turras: tweet raíz, autor, título, fecha, examen (JSON) y podcast. |
| `tweets` | Tweets de cada turra, en orden, con sus estadísticas. |
| `media`, `links`, `quotes` | Fotos/GIFs/vídeos, tarjetas de enlaces y tweets citados de cada tweet. |
| `categories`, `thread_categories` | Categorías (slug, nombre, descripción) y su asignación a turras. |
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
