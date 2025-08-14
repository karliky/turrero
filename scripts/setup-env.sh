#!/bin/bash
# Environment setup script

echo "🔧 Configurando el entorno de desarrollo..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creando .env.local desde .env.example..."
    cp .env.example .env.local
    echo "✅ Archivo .env.local creado"
    echo ""
    echo "⚠️  IMPORTANTE: Debes completar las credenciales en .env.local:"
    echo "   - auth_token: Token de autenticación de X/Twitter"
    echo "   - ct0: Token CSRF de X/Twitter"
    echo "   - Y otras variables necesarias para el scraping"
    echo ""
    echo "🔒 Nunca commits este archivo - está ignorado por git automáticamente"
else
    echo "✅ .env.local ya existe"
fi

# Verify .env.local is in .gitignore
if grep -q "\.env\.local" .gitignore; then
    echo "✅ .env.local está protegido en .gitignore"
else
    echo "⚠️  ADVERTENCIA: .env.local no está en .gitignore"
fi

# Check if there's an .env file (which shouldn't exist)
if [ -f ".env" ]; then
    echo "❌ PELIGRO: Archivo .env encontrado - debe ser eliminado por seguridad"
    echo "   Este archivo puede contener credenciales expuestas"
else
    echo "✅ No se encontró archivo .env (correcto por seguridad)"
fi

echo ""
echo "🎯 Configuración completada. Para usar las credenciales:"
echo "   source .env.local  # antes de ejecutar scripts de Deno"
echo "   deno run --allow-all scripts/recorder.ts"