#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <id> <first_tweet_line>"
    exit 1
fi

id=$1
first_tweet_line=$2

echo "Adding thread $id to turras.csv"
npx tsx ./scripts/add-new-tweet.ts $id "$first_tweet_line"

echo "Obtaining thread $id"
deno run --allow-all ./scripts/recorder.ts
# To debug:
# deno run --allow-all ./scripts/recorder.ts --test $id

echo "Enriching tweets for thread $id" 
npx tsx ./scripts/tweets_enrichment.ts

echo "Generating algolia index for thread $id"
npx tsx ./scripts/make-algolia-db.ts

echo "Generating books for thread $id"
npx tsx ./scripts/generate-books.ts

echo "Enriching books for thread $id" 
npx tsx ./scripts/book-enrichment.ts

echo "Adding thread $id to graph" 
python ./scripts/create_graph.py 

echo "Moving metadata to public for thread $id"
mv -v ./metadata/* ./public/metadata/

echo "Generating prompts for thread $id"
./scripts/generate_prompts.sh $id

echo "Make sure to modify the following files tweets_summary.json, tweets_exam.json y tweets_map.json"
echo "Delete manually the prompt txt files and the turra txt file"
echo "Please update the date on components/header.tsx" 