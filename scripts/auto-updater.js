const csvdata = require('csvdata');
const fs = require('fs');

const fetch=(u)=>new Promise((x)=>require('https').request(u,{headers:{'User-Agent':'n^'}},(r)=>{let b='';r.on('data',(d)=>b+=d);r.on('end',()=>x(b));}).end());

(async () => {
    
    // read ../db/turras.csv
    const turras = await csvdata.load(__dirname + '/../db/turras.csv');
    // get new tweet id from user input argv
    const newTweetId = process.argv[2];
    if (!newTweetId) {
        console.log('No tweet id provided');
        return process.exit(1);
    }

    // check that this tweet is not already in the db
    const exists = turras.find((t) => t.id === newTweetId);
    if (exists) {
        console.log('Tweet already exists in db');
        return process.exit(1);
    }

    const url = `https://api.microlink.io/?url=https%3A%2F%2Ftwitter.com%2FRecuenco%2Fstatus%2F${newTweetId}&palette=false&audio=false&video=false&iframe=true`;
    const response = await fetch(url);
    const json = JSON.parse(response);
    const { data } = json;
    const { description } = data;
    const trimmed = description.trim().split("\n").filter(line => line.trim() !== "").join("");
    const newTurras = [{ id: newTweetId, content: trimmed, categoria: '' }, ...turras];
    console.log('newTweetId', newTweetId);
    console.log('description', trimmed);
    await csvdata.write('../db/turras.csv', newTurras, { header: 'id,content,categoria' });
    console.log('Done!');
})()