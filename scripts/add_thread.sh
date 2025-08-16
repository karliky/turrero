#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Uso: $0 <tweet_id>"
    echo "Ejemplo: $0 967375698976477184"
    exit 1
fi

id=$1

# Validate that ID is numeric
if ! [[ "$id" =~ ^[0-9]+$ ]]; then
    echo "Error: El ID del tweet debe ser numérico"
    exit 1
fi

echo "Scraping thread $id (auto-detecting username and content)"
deno run --allow-all ./scripts/recorder.ts

echo "Adding scraped tweet $id to turras.csv"
deno run --allow-all ./scripts/add-scraped-tweet.ts $id
# To debug:
# deno run --allow-all ./scripts/recorder.ts --test $id

echo "Enriching tweets for thread $id" 
deno run --allow-all ./scripts/tweets_enrichment.ts

echo "Generating algolia index for thread $id"
deno run --allow-all ./scripts/make-algolia-db.ts

echo "Generating books for thread $id"
deno run --allow-all ./scripts/generate-books.ts

echo "Enriching books for thread $id" 
deno run --allow-all ./scripts/book-enrichment.ts

echo "Generating metadata images for thread $id"
deno task images

echo "Adding thread $id to graph" 
python ./scripts/create_graph.py 

echo "Moving metadata to public for thread $id"
mv -v ./scripts/metadata/* ./public/metadata/ 2>/dev/null || echo "No metadata files to move"

echo "Generating prompts for thread $id"
./scripts/generate_prompts.sh $id

echo "Make sure to modify the following files tweets_summary.json, tweets_exam.json y tweets_map.json"
echo "Delete manually the prompt txt files and the turra txt file"
echo "Please update the date on components/header.tsx" 