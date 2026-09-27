#!/bin/bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <id> <first_tweet_line>"
    exit 1
fi

id=$1
first_tweet_line=$2

echo "Adding thread $id to turras.csv"
npm run add-tweet -- "$id" "$first_tweet_line"

echo "Obtaining thread $id"
npm run scrape
# To debug:
# npm run scrape -- --test $id

echo "Enriching tweets for thread $id"
npm run enrich

echo "Generating algolia index for thread $id"
npm run algolia

echo "Generating books for thread $id"
npm run books

echo "Enriching books for thread $id"
npm run book-enrich

echo "Adding thread $id to graph"
npm run graph

echo "Moving metadata to public for thread $id"
if compgen -G "./metadata/*" > /dev/null; then
    mv -v ./metadata/* ./public/metadata/
fi

echo "Processing thread $id with local AI (summary, categories, exam)..."
npm run ai-local -- "$id"
