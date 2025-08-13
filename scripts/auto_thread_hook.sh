#!/bin/bash

# Auto Thread Processor Hook for Claude Code
# This script automatically processes new X.com threads when detected in user prompts

# Read input from Claude Code hook via stdin
input=$(cat)
prompt=$(echo "$input" | jq -r '.prompt // empty')

# Log the hook activation for debugging
echo "$(date): Auto thread hook activated" >> ~/.claude/thread_hook.log
echo "Prompt: $prompt" >> ~/.claude/thread_hook.log

# Extract thread ID (15-20 digit number) and first tweet line from prompt
thread_id=$(echo "$prompt" | grep -oE '[0-9]{15,20}' | head -1)
first_tweet_line=$(echo "$prompt" | sed -n 's/.*[0-9]\{15,20\}[[:space:]]*\(.*\)/\1/p' | head -1 | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')

# Validate extracted data
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
else
    echo "❌ No se pudo extraer thread ID o primera línea del prompt"
    echo "💡 Formato esperado: 'add thread [ID] [primera línea del tweet]'"
    echo "📖 Ejemplo: 'add thread 1234567890123456789 Este es el primer tweet del hilo'"
    echo "$(date): Invalid format - ID: '$thread_id', Line: '$first_tweet_line'" >> ~/.claude/thread_hook.log
fi

# Always exit successfully to avoid blocking Claude
exit 0