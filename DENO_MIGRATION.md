# Migración a Deno - Plan y Estado

## Estado de la Migración

### ✅ Fase 0: Preparación y Salvaguardas
- [x] Configuración base de Deno (deno.json)
- [x] Import maps para dependencias
- [x] Configuración VS Code
- [x] Actualización .gitignore
- [x] Documentación rollback

### 🔄 Fase 1: Deno para Tooling (En Progreso)
- [ ] Migración scripts Node.js → Deno
- [ ] Wrappers compatibilidad Vercel
- [ ] Actualización package.json scripts

### ⏳ Fase 2: Tipos y Chequeos
- [ ] Tipos estándar Deno
- [ ] Pipeline deno check
- [ ] Pre-push hooks Deno

### ⏳ Fase 3: Paridad Funcional
- [ ] Runtime híbrido Next.js/Deno
- [ ] Builds optimizados
- [ ] Compatibilidad Vercel 100%

### ⏳ Fase 4: Documentación Final
- [ ] CLAUDE.md actualizado
- [ ] PRD-create MCP
- [ ] Guías developers

## Arquitectura Objetivo

### Runtime Híbrido
- **Frontend**: Next.js 15 + Node.js (sin cambios)
- **Scripts**: Deno runtime para tooling
- **Deployment**: Vercel compatible (Next.js)
- **Development**: Comandos unificados

### Beneficios Esperados
- **Performance**: Scripts más rápidos con Deno
- **Security**: Permisos granulares
- **Simplicidad**: Menos dependencias NPM
- **Type Safety**: TypeScript nativo

## Plan de Rollback

### En caso de problemas críticos:

1. **Revertir configuraciones**:
   ```bash
   git checkout fix/AI-driven-fixes -- deno.json .vscode/settings.json
   ```

2. **Restaurar scripts Node.js**:
   ```bash
   git checkout fix/AI-driven-fixes -- scripts/
   ```

3. **Verificar funcionalidad**:
   ```bash
   npm run dev
   npm run build
   ```

### Comandos de emergencia:
```bash
# Revertir rama completa
git reset --hard fix/AI-driven-fixes

# Limpiar archivos Deno
rm -rf .deno_cache/
rm -f deno.lock

# Verificar estado original
npm install
npm run lint
```

## Dependencias Críticas

### Deno Runtime:
- Versión mínima: 1.41+
- Permisos requeridos: `--allow-all` (desarrollo)
- Dependencias web: std@0.224.0

### Compatibilidad:
- Next.js: Mantener Node.js runtime
- Vercel: Sin cambios en deployment
- TypeScript: Dual compatibility

## Validaciones Continuas

### Por cada fase:
1. `deno check scripts/*.ts`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. Playwright smoke test

### Criterios de éxito:
- ✅ Zero errores TypeScript
- ✅ Zero errores Deno
- ✅ Web funcionando 100%
- ✅ Scripts funcionando 100%
- ✅ Pipeline Vercel OK

## Notas de Desarrollo

### Import Maps configurados:
- `@/`: Raíz del proyecto
- `@/infrastructure/`: Tipos y utilidades
- `@/scripts/`: Scripts Deno
- `@std/`: Deno standard library
- `puppeteer`: Deno Puppeteer
- `csv`: CSV processing
- `jimp`: Image processing (NPM)

### Tasks disponibles:
- `deno task scrape`: Scraping threads
- `deno task enrich`: Enrichment tweets
- `deno task books`: Generate books
- `deno task algolia`: Update search index
- `deno task validate`: Type validation

## Contacto

Para problemas o dudas:
- Revertir usando plan de rollback
- Documentar error en logs
- Contactar equipo desarrollo