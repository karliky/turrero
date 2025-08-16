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

# Note: turras.csv has been removed - scraping goes directly to tweets.json
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

echo "Processing AI prompts for thread $id"
deno task ai-process $id

echo "AI prompt processing completed - JSON database files have been updated automatically"
echo "Generated prompt files and temporary files will be cleaned up automatically"
echo "Please update the date on components/header.tsx" 