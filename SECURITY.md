# Guía de Seguridad

## ⚠️ VULNERABILIDAD CRÍTICA RESUELTA

**Fecha de resolución**: 2025-08-13
**Problema**: Auth token de X/Twitter expuesto en archivo `.env`

### Medidas Tomadas

1. ✅ **Archivo .env eliminado** del repositorio
2. ✅ **Credenciales migradas** a `.env.local` (no rastreado por git)
3. ✅ **Archivo .env.example creado** como template seguro
4. ✅ **.gitignore actualizado** para proteger archivos de entorno
5. ✅ **Scripts de seguridad implementados** para prevenir futuras exposiciones

### Archivos de Configuración

#### Archivos Seguros (pueden estar en git)
- `.env.example` - Template sin credenciales reales

#### Archivos Sensibles (NUNCA en git)
- `.env.local` - Credenciales de desarrollo
- `.env` - Archivos de entorno (todos ignorados por seguridad)

### Scripts de Seguridad

#### Configuración Inicial
```bash
./scripts/setup-env.sh
```
Configura automáticamente el entorno de desarrollo copiando `.env.example` a `.env.local`.

#### Verificación de Seguridad
```bash
./scripts/security-check.sh
```
Busca credenciales expuestas y verifica la configuración de seguridad.

### Configuración de Desarrollo

1. **Copiar template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Completar credenciales** en `.env.local`:
   - `auth_token`: Token de autenticación de X/Twitter
   - `ct0`: Token CSRF
   - `guest_id`: ID de guest
   - Otras variables según necesidad

3. **Cargar variables** antes de ejecutar scripts:
   ```bash
   source .env.local
   deno run --allow-all scripts/recorder.ts
   ```

### Buenas Prácticas

#### ✅ Hacer
- Usar `.env.local` para credenciales locales
- Ejecutar `./scripts/security-check.sh` regularmente
- Revisar commits antes de push
- Usar variables de entorno en el código (`process.env.VARIABLE`)

#### ❌ Nunca Hacer
- Commitear archivos `.env*` excepto `.env.example`
- Hardcodear credenciales en el código fuente
- Compartir credenciales por canales inseguros
- Ignorar las alertas del script de seguridad

### Estructura de Archivos Protegidos

```
.gitignore contiene:
.env.local           # Credenciales locales
.env.development.local
.env.test.local
.env.production.local
.env                 # Cualquier archivo .env
.env.*               # Todos los archivos de entorno
!.env.example        # Excepción: template sí puede estar en git
```

### En Caso de Exposición Accidental

1. **Eliminar inmediatamente** el archivo comprometido
2. **Rotar credenciales** expuestas (generar nuevas)
3. **Ejecutar verificación** de seguridad completa
4. **Revisar historial** de git para asegurar limpieza completa
5. **Documentar incidente** y medidas correctivas

### Contacto de Seguridad

Para reportar problemas de seguridad, contacta al equipo de desarrollo inmediatamente.

---

**Última actualización**: 2025-08-13
**Estado**: Vulnerabilidad resuelta, medidas preventivas implementadas