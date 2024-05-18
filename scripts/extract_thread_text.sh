#!/bin/bash

# Verificar si se proporcionaron suficientes argumentos
if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <archivo_json> <id>"
    exit 1
fi

# Asignar argumentos a variables
archivo_json=$1
id=$2

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
    echo "$id"
    echo "$resultado"
fi
