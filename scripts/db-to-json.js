import fs from 'fs';

// Cargamos el archivo JSON original.
import Tweets from '../db/tweets.json' assert { type: 'json' };

console.log(Tweets);

// Transformamos el array de arrays a un array de objetos con las propiedades 'id' y 'tweets'.
const transformedTweets = Tweets.map(tweetArray => ({
  id: tweetArray[0].id,
  tweets: tweetArray
}));

// Convertimos el nuevo array de objetos a un string JSON.
const jsonString = JSON.stringify(transformedTweets, null, 4);

// Guardamos el nuevo formato en un archivo JSON.
fs.writeFile("../db/transformed_tweets.json", jsonString, err => {
  if (err) {
    console.error("Error al escribir el archivo", err);
  } else {
    console.log("Archivo guardado con éxito.");
  }
});
