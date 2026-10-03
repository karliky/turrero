# El Turrero Post

[![Web](https://img.shields.io/website?url=https%3A%2F%2Fturrero.vercel.app&label=turrero.vercel.app)](https://turrero.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Vercel](https://img.shields.io/badge/Vercel-deploy-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![Licencia: Unlicense](https://img.shields.io/badge/licencia-Unlicense-blue)](LICENSE.md)
[![Último commit](https://img.shields.io/github/last-commit/karliky/turrero)](https://github.com/karliky/turrero/commits)

Archivo de las turras (hilos de X) de Javier G. Recuenco y la Comunidad CPS sobre resolución de problemas complejos.

**Qué hay en la web:**
- **Las turras:** 268, con buscador y filtros por año, categoría y autor.
- **`/empieza-aqui`:** por dónde empezar, los cuatro pilares del CPS y las series que se leen seguidas.
- **`/glosario`:** 90 conceptos, enlazados dentro de las turras. Cada uno tiene su página (`/glosario/<slug>`) con la definición y las turras donde aparece.
- **`/mapa-de-ideas`:** qué conceptos aparecen cada año y qué turras citan a cuáles.
- **`/biblioteca`:** los 327 libros citados.
- **`/ebook`:** todo el archivo en EPUB.
- **Modo claro y oscuro:** sigue al sistema, con interruptor, y con contraste AA comprobado por tests.

## Cómo funciona

```
X API ──► lib/x.ts ──► lib/ingest.ts ──► data/turrero.db ──► lib/queries.ts ──► Next.js (estático)
                           ▲
               OpenAI ──► lib/ai.ts
```

- **Una sola fuente de verdad:** `data/turrero.db`, un SQLite versionado en git. El esquema y cada cambio de datos van en `data/migrations/`, y nunca se edita a mano.
- **Build estático:** la web se genera entera en el build. En runtime solo se ejecutan:
  - la búsqueda, `/api/search`, con FTS5;
  - el proxy de vídeos de X, `/api/tweet-video`;
  - la redirección de las URLs antiguas de tweets a su turra.
- **Añadir una turra:** se descarga de la API de X (solo la cadena en la que el autor se responde a sí mismo) y OpenAI le pone título, categorías y examen.
- **Llamadas de pago:** las respuestas de X y OpenAI se guardan completas en `.cache/api/`, así que la misma petición nunca se paga dos veces.

## Puesta en marcha

Requiere **Node.js 24**.

```bash
npm install
npm run dev          # http://localhost:3000
```

La web no necesita variables de entorno. Solo hacen falta para añadir o refrescar turras:

```bash
cp .env.example .env.local
```

| Variable | Para qué |
|---|---|
| `X_API_KEY`, `X_API_KEY_SECRET` (o `X_API_BEARER_TOKEN`) | Descargar turras de X |
| `OPENAI_API_KEY`, `OPENAI_MODEL` (opcional) | Título, categorías y examen |

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run turra:add -- <url o id>` | Importa una turra y la enriquece con IA |
| `npm run turra:discover -- [--add]` | Busca (e importa) las turras de los sábados posteriores a la última archivada |
| `npm run turra:sync -- <id> [--delete-missing]` | Vuelve a descargar una turra conservando título, categorías y examen |
| `npm run turra:enrich -- <id> [--refresh]` | Regenera título, categorías y examen |
| `npm run turra:export-obsidian -- --out <carpeta>` | Exporta las turras como notas de Obsidian |
| `npm run books:metadata` | Completa autor y portada de los libros (Goodreads, Open Library, Google Books) |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run ebook` | Genera `public/ebook/el-turrero-post.epub` (también lo hace `npm run build`) |
| `npm run check` | Typecheck, lint y tests. Tiene que pasar antes de cualquier cambio |

Los tests no llaman a X ni a OpenAI: usan `tests/fixtures/`.

## Contenido editorial

Todo es reproducible y está versionado:
- **Categorías** (15 temas de turras y 11 de libros), en `data/categorization/`:
  - notas por turra;
  - taxonomía con criterios;
  - dos clasificaciones independientes y sus desacuerdos resueltos.

  Los scripts `scripts/categorize-*.ts` generan la migración. Las URLs de categorías retiradas redirigen con 301 (`LEGACY_CATEGORY_URLS` en `lib/site.ts`).
- **Glosario**, en `data/glossary/glossary.json`. Para cambiarlo, edita ese fichero, ejecuta `npx tsx scripts/glossary-migration.ts NNNN_nombre` y después `npm run db:migrate`. Los tests comprueban que las citas sean literales.
- **Guía de lectura y pilares**, en `app/empieza-aqui/guia.ts`, también con citas literales comprobadas por tests.

## Despliegue

En Vercel, sin configuración extra: `npm run build` genera el EPUB y la web.

- **Funciones:** en ellas solo va lo necesario (base de datos y código); el resto queda fuera con `outputFileTracingExcludes` en `next.config.ts`.
- **`public/`:** lo sirve la CDN.
- **`design/`:** los ficheros fuente de logos y promo, que no se publican.

## Licencia

[Unlicense](LICENSE.md): dominio público. Las turras son de sus autores.
