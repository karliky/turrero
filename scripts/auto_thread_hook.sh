#!/bin/bash

# Auto Thread Processor Hook for Claude Code
# This script automatically processes new X.com threads when detected in user prompts

# Read input from Claude Code hook via stdin
input=$(cat)
prompt=$(echo "$input" | jq -r '.prompt // empty')

# Log the hook activation for debugging
echo "$(date): Auto thread hook activated" >> ~/.claude/thread_hook.log
echo "Prompt: $prompt" >> ~/.claude/thread_hook.log

# VALIDATION 1: Only process if prompt explicitly contains "add thread" pattern
if ! echo "$prompt" | grep -qiE "add thread"; then
    echo "❌ Patrón 'add thread' no encontrado, ignorando prompt"
    echo "💡 Formato esperado: 'add thread [ID] [primera línea del tweet]'"
    echo "$(date): Skipped - no 'add thread' pattern found" >> ~/.claude/thread_hook.log
    exit 0
fi

# Extract thread ID (15-20 digit number) and first tweet line from prompt
# Use case-insensitive matching for "add thread"
thread_id=$(echo "$prompt" | grep -oiE "add thread[[:space:]]+[0-9]{15,20}" | grep -oE '[0-9]{15,20}' | head -1)
first_tweet_line=$(echo "$prompt" | sed -n 's/.*add thread[[:space:]]*[0-9]\{15,20\}[[:space:]]*\(.*\)/\1/pi' | head -1 | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')

# VALIDATION 2: Check if content was extracted
if [[ -z "$thread_id" || -z "$first_tweet_line" ]]; then
    echo "❌ No se pudo extraer thread ID o primera línea del prompt"
    echo "💡 Formato esperado: 'add thread [ID] [primera línea del tweet]'"
    echo "📖 Ejemplo: 'add thread 1234567890123456789 Este es el primer tweet del hilo'"
    echo "$(date): Invalid format - ID: '$thread_id', Line: '$first_tweet_line'" >> ~/.claude/thread_hook.log
    exit 0
fi

# VALIDATION 3: Reject if content contains HTML tags
if echo "$first_tweet_line" | grep -q '<\|>'; then
    echo "❌ Contenido rechazado: contiene HTML tags"
    echo "💡 Proporciona solo el texto del tweet, sin HTML"
    echo "$(date): Rejected HTML content for thread $thread_id" >> ~/.claude/thread_hook.log
    exit 0
fi

# VALIDATION 4: Reject if content is too long (tweets are max 280 chars, allow up to 500 for safety)
content_length=${#first_tweet_line}
if [ $content_length -gt 500 ]; then
    echo "❌ Contenido rechazado: demasiado largo ($content_length caracteres)"
    echo "💡 La primera línea debe ser el inicio del tweet (max ~280 caracteres)"
    echo "$(date): Rejected - content too long ($content_length chars) for thread $thread_id" >> ~/.claude/thread_hook.log
    exit 0
fi

# VALIDATION 5: Reject if content is empty after trimming
if [[ -z "${first_tweet_line// }" ]]; then
    echo "❌ Contenido rechazado: primera línea vacía"
    echo "💡 Proporciona el texto de la primera línea del tweet"
    echo "$(date): Rejected - empty content for thread $thread_id" >> ~/.claude/thread_hook.log
    exit 0
fi

# All validations passed - proceed with thread processing
if [[ -n "$thread_id" && -n "$first_tweet_line" ]]; then
    echo "🚀 Iniciando procesamiento automático del thread: $thread_id"
    echo "📝 Primera línea: $first_tweet_line"
    
    # Change to project root directory
    cd "$(dirname "$0")/.." || exit 1
    
    # Execute the complete automated thread addition workflow
    echo "⚙️  Ejecutando flujo automatizado de adición de thread..."
    ./scripts/add_thread.sh "$thread_id" "$first_tweet_line"
    
    # Check if the automated script succeeded
    if [ $? -eq 0 ]; then
        echo "✅ Thread $thread_id procesado completamente"
        echo "🔍 Datos disponibles en infrastructure/db/"
        echo "🔄 Ejecuta 'npm run dev' para verificar los cambios en localhost:3000"
        
        # Log success
        echo "$(date): Successfully processed thread $thread_id" >> ~/.claude/thread_hook.log
        
        # Notify Claude to use ai-prompt-processor agent for step 10
        echo "💡 Nota: El agente 'ai-prompt-processor' debe procesar los prompts generados"
    else
        echo "❌ Error al procesar el thread $thread_id"
        echo "🔧 Revisa los logs para más detalles"
        echo "$(date): Failed to process thread $thread_id" >> ~/.claude/thread_hook.log
    fi
fi

# Always exit successfully to avoid blocking Claude
exit 0