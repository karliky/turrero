# Hybrid Runtime Architecture

This document describes the hybrid Node.js + Deno architecture implemented in the Turrero project.

## Overview

The Turrero project uses a **hybrid runtime architecture** that combines the strengths of both Node.js and Deno:

- **Node.js**: Powers the Next.js 15 frontend application
- **Deno**: Powers all data processing scripts and tooling

This architecture provides:
- Modern TypeScript runtime for scripts (Deno)
- Production-ready web framework (Next.js on Node.js)
- Unified development pipeline
- Enhanced type safety across both environments

## Architecture Components

### Frontend (Node.js Runtime)
```
/app/                   - Next.js 15 App Router pages
/infrastructure/        - Shared TypeScript utilities
/public/               - Static assets and metadata
```

**Technologies:**
- Next.js 15 with App Router
- React 19 with TypeScript
- TailwindCSS with Preline UI
- Node.js 22+ runtime

### Scripts (Deno Runtime)
```
/scripts/
├── libs/              - Shared Deno utilities
├── tweets_enrichment.ts - Tweet data enrichment
├── make-algolia-db.ts  - Search index generation
├── generate-books.ts   - Book reference processing
├── recorder.ts         - X.com thread scraping
└── dev-pipeline.ts     - Unified development commands
```

**Technologies:**
- Deno 1.41+ runtime
- Native TypeScript support
- NPM compatibility via `npm:` specifiers
- Built-in tooling (fmt, lint, check)

## Development Workflow

### 1. Frontend Development
```bash
# Start Next.js development server
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

### 2. Script Development
```bash
# Run individual scripts
deno task scrape
deno task enrich
deno task books
deno task algolia

# Development tools
deno check scripts/tweets_enrichment.ts
deno fmt scripts/
deno lint scripts/
```

### 3. Unified Pipeline
```bash
# Validate both environments
npm run pipeline:validate

# Build complete project
npm run pipeline:build

# Run all tests
npm run pipeline:test

# Complete pipeline
npm run pipeline:full
```

## Configuration Files

### deno.json
Central configuration for Deno runtime:
- Import maps for dependency resolution
- NPM package compatibility
- TypeScript compiler options
- Built-in tasks and scripts
- Linting and formatting rules

### package.json
Node.js configuration with dual commands:
- Standard Next.js scripts
- Deno task integration
- Pipeline commands for unified development

### tsconfig.json
TypeScript configuration for Node.js environment (Next.js frontend)

## Import Strategy

### Deno Scripts
Use import maps defined in `deno.json`:
```typescript
// Local modules
import { createLogger } from "@/infrastructure/logger.ts";
import { createDataAccess } from "@/scripts/libs/data-access.ts";

// Standard library
import { join } from "@std/path";

// NPM packages
import puppeteer from "puppeteer";
import algoliasearch from "algoliasearch";
```

### Next.js Application
Standard Node.js imports:
```typescript
import { Tweet } from "@/infrastructure/types";
import { formatDate } from "date-fns";
```

## Type Safety

### Shared Types
Common TypeScript interfaces are defined in `/infrastructure/types/` and used by both environments:
- `Tweet` interface
- `EnrichedTweetData` interface
- `ImageMetadata` interface
- Error types and contextual interfaces

### Environment-Specific Types
- **Deno**: Enhanced strict mode with `exactOptionalPropertyTypes`
- **Node.js**: Next.js compatible TypeScript configuration
- **Validation**: Both `deno check` and `npx tsc --noEmit` must pass

## Deployment

### Vercel Deployment (Production)
- **Frontend**: Node.js runtime with Next.js
- **Build process**: Standard Next.js build
- **Scripts**: Local development only (not deployed)
- **Static assets**: Generated metadata and images

### Local Development
- **Dual runtime**: Both Node.js and Deno available
- **Pipeline validation**: Ensures compatibility
- **Hot reloading**: Next.js Fast Refresh
- **Script development**: Deno watch mode

## Benefits

1. **Modern Development**: Deno provides cutting-edge TypeScript experience
2. **Production Ready**: Next.js on Node.js for stable deployment
3. **Type Safety**: Strict TypeScript in both environments
4. **Unified Tooling**: Single pipeline for validation and testing
5. **NPM Compatibility**: Deno can use existing NPM packages
6. **Performance**: Native TypeScript execution in Deno
7. **Maintainability**: Clear separation of concerns

## Migration Notes

The project was migrated from a Node.js-only architecture to this hybrid system:
- All data processing scripts moved to Deno
- Frontend remains on Node.js for Vercel compatibility
- Shared type definitions maintained for consistency
- Development pipeline unified for seamless workflow

## Troubleshooting

### Common Issues

1. **Import Map Issues**: Ensure `deno.json` import maps are correctly configured
2. **NPM Package Compatibility**: Use `npm:` prefix for Node.js packages in Deno
3. **Type Conflicts**: Verify shared types are compatible in both environments
4. **Path Resolution**: Use absolute imports with import maps

### Validation Commands
```bash
# Check Deno scripts
deno check scripts/tweets_enrichment.ts

# Check Next.js types
npx tsc --noEmit

# Full pipeline validation
npm run pipeline:validate
```

This hybrid architecture provides the best of both worlds: modern development experience with Deno and proven production deployment with Next.js on Node.js.