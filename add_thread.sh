#!/bin/bash


if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <id> <first_tweet_line>"
    exit 1
fi

id=$1
first_tweet_line=$2


echo "Adding thread $id to turras.csv"
node ./scripts/add-new-tweet.js "$id" "$first_tweet_line"

echo "Obtaining thread $id"

deno run --allow-all scripts/recorder.ts
# To debug:
# deno run --allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run scripts/recorder.ts --test $id


echo "Enriching tweets for thread $id" 
node ./scripts/tweets_enrichment.js

echo "Generating algolia index for thread $id"
node ./scripts/make-algolia-db.js

echo "Generating books for thread $id"
node ./scripts/generate-books.js

echo "Enriching books for thread $id" 
node ./scripts/book-enrichment.js

echo "Adding thread $id to graph" 
python ./scripts/create_graph.py 

echo "Moving metadata to public for thread $id"
mv -v ./metadata/* ./public/metadata/

echo "Processing AI prompts for thread $id"
deno task ai-process "$id"

echo "AI prompt processing completed - JSON database files have been updated automatically"
echo "Generated prompt files and temporary files will be cleaned up automatically"
echo "Please update the date on components/header.tsx"
