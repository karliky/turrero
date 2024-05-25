import json
import csv

def read_json(filename):
    with open(filename, 'r', encoding='utf-8') as file:
        data = json.load(file)

    if isinstance(data, list):
        if 'categories' in data[0]:
            # Manejar como archivo de categorías
            return {item['id']: item['categories'].split(',') if isinstance(item['categories'], str) else item['categories'] for item in data}
        elif 'summary' in data[0]:
            # Manejar como archivo de resúmenes
            return {item['id']: item['summary'] for item in data}
        else:
            # Manejar como archivo de hilos de tweets
            return {sublist[0]['id']: sublist for sublist in data if sublist}
    else:
        raise ValueError("El formato del archivo JSON no es reconocido")

def parse_stat(value):
    value = str(value).replace(',', '')
    if 'K' in value:
        return int(float(value.replace('K', '')) * 1000)
    elif 'M' in value:
        return int(float(value.replace('M', '')) * 1000000)
    return int(value) if value else 0

def process_threads(threads_data, summaries, categories):
    graph_data = []

    # Preparar diccionario para hilos relacionados basado en metadata embeds
    related_threads = {}
    for thread in threads_data.values():
        for tweet in thread:
            embed = tweet.get("metadata", {}).get("embed", {})
            if embed.get("type") == "embed":
                parent_id = thread[0]['id']
                related_threads.setdefault(embed["id"], []).append(parent_id)

    for thread_id, thread in threads_data.items():
        stats_total = {"replies": 0, "likes": 0, "bookmarks": 0, "views": 0}
        for tweet in thread:
            stats = tweet.get("stats", {})
            for key in stats_total:
                stats_total[key] += parse_stat(stats.get(key, 0))

        summary = summaries.get(thread_id, "")
        cat_list = categories.get(thread_id, [])
        if isinstance(cat_list, str):
            cat_list = cat_list.split(',')

        related_ids = [rid for rid in related_threads.get(thread_id, []) if rid != thread_id]

        graph_data.append({
            "id": thread_id,
            "url": f"https://twitter.com/Recuenco/status/{thread_id}",
            "replies": stats_total['replies'],
            "likes": stats_total['likes'],
            "bookmarks": stats_total['bookmarks'],
            "views": stats_total['views'],
            "summary": summary,
            "categories": cat_list,
            "related_threads": related_ids
        })

    return graph_data

def main():
    threads_data = read_json('db/tweets.json')
    summaries = read_json('db/tweets_summary.json')
    categories = read_json('db/tweets_map.json')

    result = process_threads(threads_data, summaries, categories)

    with open('db/processed_graph_data.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()
