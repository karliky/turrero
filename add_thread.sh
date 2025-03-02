#!/bin/bash


if [ "$#" -ne 1 ]; then
    echo "Uso: $0 <id>"
    exit 1
fi

id=$1
#DENO_FLAGS="--allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run"

echo "Obtaining thread $id"
deno run --allow-all scripts/recorder.ts --id $i
# To debug:
# deno run --allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run scripts/recorder.ts --test "$id"


echo "Enriching tweets for thread $id" 
deno run --allow-all ./scripts/tweets_enrichment.ts --id $id

echo "Generating algolia index for thread $id"
$(echo "node ./scripts/make-algolia-db.js")

echo "Generating books for thread $id"
node ./scripts/generate-books.js

echo "Enriching books for thread $id" 
node ./scripts/book-enrichment.js

echo "Adding thread $id to graph" 
python ./scripts/create_graph.py 

echo "Moving metadata to public for thread $id"
mv -v ./metadata/* ./public/metadata/

echo "Generating prompts for thread $id"
./scripts/generate_prompts.sh "$id"

echo "Make sure to modify the following files tweets_summary.json, tweets_exam.json y tweets_map.json"
echo "Delete manually the prompt txt files and the turra txt file"
echo "Please update the date on components/header.tsx"
