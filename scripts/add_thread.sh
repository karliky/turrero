#!/bin/bash


if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <id> <first_tweet_line>"
    exit 1
fi

id=$1
first_tweet_line=$2


echo "Adding thread $id to turras.csv"
npx deno ./scripts/add-new-tweet.ts $id $first_tweet_line

echo "Obtaining thread $id"
npx deno ./scripts/recorder.ts

echo "Enriching tweets for thread $id" 
node ./scripts/tweets_enrichment.js

echo "Generating images for thread $id"
node ./scripts/image-card-generator.js

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

echo "Generating prompts for thread $id"
./scripts/generate_prompts.sh $id

echo "Make sure to modify the following files tweets_summary.json, tweets_exam.json y tweets_map.json"
echo "Please update the date on components/header.js"
