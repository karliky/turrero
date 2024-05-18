import csv
import json

def read_csv_ids(filename):
    ids = set()
    with open(filename, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            ids.add(row['id'])
    return ids

def read_json_ids(filename):
    ids = set()
    with open(filename, 'r', encoding='utf-8') as jsonfile:
        data = json.load(jsonfile)
        for entry in data:
            ids.add(entry['id'])
    return ids

def main():
    files = {
        'turras.csv': read_csv_ids('db/turras.csv'),
        'tweets_exam.json': read_json_ids('db/tweets_exam.json'),
        'tweets_map.json': read_json_ids('db/tweets_map.json'),
        'tweets_summary.json': read_json_ids('db/tweets_summary.json')
    }

    all_ids_sets = list(files.values())
    all_ids_union = set.union(*all_ids_sets)
    intersection_ids = set.intersection(*all_ids_sets)

    if len(intersection_ids) == len(all_ids_union):
        print("Todos los IDs están presentes en todos los ficheros.")
    else:
        print("Se encontraron IDs faltantes en los siguientes ficheros:")
        for filename, ids in files.items():
            missing = all_ids_union - ids
            if missing:
                print(f"Fichero {filename}: IDs faltantes -> {missing}")

if __name__ == '__main__':
    main()
