#!/bin/bash


if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <id> <first_tweet_line>"
    exit 1
fi

id=$1
first_tweet_line=$2


# Paso 1: Añadir nuevo tweet a turras.csv
node ./scripts/add-new-tweet.js $id $first_tweet_line

# Paso 2: Scrappear el hilo
node ./scripts/recorder.js

# Paso 3: enriquecer twwets
node ./scripts/tweets_enrichment.js

# Paso 4: generar imagenes
node ./scripts/image-card-generator.js

# Paso 5: generar indice de búsqueda de hilos
node ./scripts/make-algolia-db.js

# Paso 6: extraer los libros del hilo
node ./scripts/generate-books.js

# Paso 7: enriquecer información de los libros
node ./scripts/book-enrichment.js

# Paso 8: mover los datos de los hilos
mv -v ./metadata/* ./public/metadata/

# Paso 9: generar los prompts
./scripts/generate_prompts.sh

# Paso 10
echo "Asegurate de modificar los archivos tweets_summary.json, tweets_exam.json y tweets_map.json"

# Paso 11
npm run dev