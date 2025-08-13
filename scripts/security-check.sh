#!/bin/bash
# Security check script for detecting exposed credentials

echo "🔐 Ejecutando verificación de seguridad..."

# Check for common credential patterns (excluding generated files)
echo "Buscando patrones de credenciales..."
if find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.md" -o -name "*.sh" -o -name "*.txt" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.cache/*" \
    -not -path "./.next/*" \
    -not -name "*.local" \
    -not -name "security-check.sh" \
    -exec grep -l -i "auth_token.*=.*[a-zA-Z0-9]\{20,\}" {} \; | head -5; then
    echo "❌ ALERTA: Posibles tokens de autenticación expuestos"
    exit 1
fi

if find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.md" -o -name "*.sh" -o -name "*.txt" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.cache/*" \
    -not -path "./.next/*" \
    -not -name "*.local" \
    -not -name "security-check.sh" \
    -exec grep -l -i "api.*key.*=.*[a-zA-Z0-9]\{25,\}" {} \; | head -5; then
    echo "❌ ALERTA: Posibles API keys expuestos"
    exit 1
fi

if find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.md" -o -name "*.sh" -o -name "*.txt" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.cache/*" \
    -not -path "./.next/*" \
    -not -name "*.local" \
    -not -name "security-check.sh" \
    -exec grep -l -i "password.*=.*[a-zA-Z0-9]\{8,\}" {} \; | head -5; then
    echo "❌ ALERTA: Posibles contraseñas expuestas"
    exit 1
fi

# Check for .env files in git tracking
if git ls-files | grep -E "\.env$" ; then
    echo "❌ ALERTA: Archivo .env está siendo rastreado por git"
    exit 1
fi

# Verify .env.local is in .gitignore
if ! grep -q "\.env\.local" .gitignore ; then
    echo "❌ ALERTA: .env.local no está en .gitignore"
    exit 1
fi

echo "✅ Verificación de seguridad completada - No se encontraron credenciales expuestas"
exit 0