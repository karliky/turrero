#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <id> <first_tweet_line>"
    exit 1
fi

id=$1
first_tweet_line=$2

echo "Adding thread $id to turras.csv"
deno run --allow-all ./scripts/add-new-tweet.ts $id "$first_tweet_line"

echo "Obtaining thread $id"
deno run --allow-all ./scripts/recorder.ts
# To debug:
# deno run --allow-all ./scripts/recorder.ts --test $id

echo "Enriching tweets for thread $id"
deno task enrich

# Note: image-card-generator.ts doesn't exist yet, skipping image generation
# echo "Generating metadata images for thread $id"
# deno task images

echo "Generating algolia index for thread $id"
deno task algolia

echo "Generating books for thread $id"
deno task books

echo "Enriching books for thread $id"
deno task book-enrich

echo "Adding thread $id to graph" 
python ./scripts/create_graph.py 

echo "Moving metadata to public for thread $id"
mv -v ./metadata/* ./public/metadata/

echo "Processing thread $id with local AI (summary, categories, exam)..."
deno task ai-local $id

echo "Please update the date on components/header.tsx"