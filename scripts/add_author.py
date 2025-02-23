import json
from pathlib import Path

def add_author_to_tweets():
    # Ruta al archivo de tweets
    tweets_path = Path(__file__).parent.parent / 'infrastructure' / 'db' / 'tweets.json'
    
    # Leer el archivo JSON
    with open(tweets_path, 'r', encoding='utf-8') as f:
        tweets = json.load(f)
    
    # Añadir el campo author a cada tweet en cada hilo
    for thread in tweets:
        for tweet in thread:
            if 'author' not in tweet:
                tweet['author'] = 'https://x.com/Recuenco'
    
    # Guardar el archivo actualizado
    with open(tweets_path, 'w', encoding='utf-8') as f:
        json.dump(tweets, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    add_author_to_tweets()
    print('Campo "author" añadido exitosamente a todos los tweets.') 