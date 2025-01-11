#!/bin/bash

# Verificar si se proporcionaron suficientes argumentos
if [ "$#" -ne 1 ]; then
    echo "Uso: $0 <id>"
    exit 1
fi

# Asignar argumentos a variables
archivo_json=../infrastructure/db/tweets.json
id=$1

# Usar jq para encontrar el subarray y extraer los campos tweet sin comillas
resultado=$(jq --raw-output --arg id "$id" '
    .[]
    | select(any(.[]; .id == $id))
    | .[].tweet
' "$archivo_json")

# Comprobar si se encontró algún resultado
if [ -z "$resultado" ]; then
    echo "No se encontró ningún objeto con el ID proporcionado."
else
    echo "$id" > "turra_$id.txt"
    echo "$resultado" >> "turra_$id.txt"
fi
