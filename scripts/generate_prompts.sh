#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Uso: $0 <id>"
    exit 1
fi

id=$1
turra_file="turra_$id.txt"
summary_file="prompt_summary_$id.txt"
map_file="prompt_map_$id.txt"
exam_file="prompt_exam_$id.txt"
books_file="prompt_books_$id.txt"

echo "Extrayendo texto del hilo..."
scripts/extract_thread_text.sh $id

echo "Generando prompt para db/tweets_summary.json..."
if [ -f "$turra_file" ]; then
    echo "Create a short headline from this text and do it in Spanish, never use these words in your headline: turras, hoy, hilo. Also, answer me in JSON format including the first word from my text which is an id and your headline but the property of the headline should be called \"summary\":" > $summary_file
    echo "<text>" >> $summary_file
    cat $turra_file >> $summary_file
    echo "</text>" >> $summary_file
    echo "Prompt generado para db/tweets_summary.json..."
else
    echo "No se encontró ningún fichero con el ID proporcionado: $turra_file."
fi

echo "Generando prompt para db/tweets_map.json..."
if [ -f "$turra_file" ]; then
    
    echo "I need you to categorize the text in any of these categories, you should include at least one and maximum 5 categories." > $map_file
    echo "Return the output in a JSON format where id is the first word of the text and categories is a comma separated list of the selected categories:" >> $map_file
    echo "for example:" >> $map_file
    echo "<example>" >> $map_file
    echo "{ \"id\": \"1763816753929347384\", \"categories\": \"factor-x,sociología,estrategia,leyes-y-sesgos\" }," >> $map_file
    echo "</example>" >> $map_file
    echo "<categories>" >> $map_file
    echo "resolución-de-problemas-complejos" >> $map_file
    echo "sistemas-complejos" >> $map_file
    echo "marketing" >> $map_file
    echo "estrategia" >> $map_file
    echo "factor-x" >> $map_file
    echo "sociología" >> $map_file
    echo "gestión-del-talento" >> $map_file
    echo "leyes-y-sesgos" >> $map_file
    echo "trabajo-en-equipo" >> $map_file
    echo "libros" >> $map_file
    echo "futurismo-de-frontera" >> $map_file
    echo "personotecnia" >> $map_file
    echo "orquestación-cognitiva" >> $map_file
    echo "gaming" >> $map_file
    echo "lectura-de-señales" >> $map_file
    echo "el-contexto-manda" >> $map_file
    echo "desarrollo-de-habilidades" >> $map_file
    echo "otras-turras-del-querer" >> $map_file
    echo "</categories>" >> $map_file
    echo "<text>" >> $map_file
    cat $turra_file >> $map_file
    echo "</text>" >> $map_file
    echo "Prompt generado para db/tweets_map.json..."
else
    echo "No se encontró ningún fichero con el ID proporcionado: $turra_file."
fi

echo "Generando prompt para db/tweets_exam.json..."
if [ -f "$turra_file" ]; then
    echo "You are an expert teacher, your task is to create an exam for your students. Create a multiple choice test exam from this text. Every question should have a maximum of 3 options and make the options as concised as possible, create a maximum of 3 questions. Make sure your response is in Spanish and as a JSON format following this structure { "id":"first word of the text", "questions": [ { "question": "", "options": [ ], "answer": answerIndex }] } where answerIndex is the index of the option from the array of options and the answerIndex starts from 1 and not 0. Please create the JSON in one single line." > $exam_file
    echo "<text>" >> $exam_file
    cat $turra_file >> $exam_file
    echo "</text>" >> $exam_file
    echo "Prompt generado para db/tweets_exam.json..."
else
    echo "No se encontró ningún fichero con el ID proporcionado: $turra_file."
fi

echo "Generando prompt para db/tweets_books.json..."
echo "Categoriza estos libros en alguna de las siguientes categorías, puedes incluir varias si es necesario. Responde solo las categorías por libro, no expliques nada mas, no busques en internet, usa el contexto para llegar a conclusiones, nunca respondas categorias fuera de la lista que te proveo:" > $books_file
echo "El formato de salida es en formato JSON donde espero este formato como ejemplo:" >> $books_file
echo "<ejemplo>" >> $books_file
echo "\"title\": \"Título del libro aquí\"," >> $books_file
echo "\"categories\": [" >> $books_file
echo "    \"Psychology\"," >> $books_file
echo "    \"Nonfiction\"" >> $books_file
echo "    ]" >> $books_file
echo "</ejemplo>" >> $books_file
echo "<Categorias>" >> $books_file
echo "Nonfiction" >> $books_file
echo "Psychology" >> $books_file
echo "History" >> $books_file
echo "Business" >> $books_file
echo "Self Help" >> $books_file
echo "Personal Development" >> $books_file
echo "Technology" >> $books_file
echo "Science" >> $books_file
echo "Biography" >> $books_file
echo "Health" >> $books_file
echo "Economics" >> $books_file
echo "Education" >> $books_file
echo "Artificial Intelligence" >> $books_file
echo "Games" >> $books_file
echo "Fiction" >> $books_file
echo "</categorias>" >> $books_file
echo "<libros>" >> $books_file
node scripts/book-enrichment.js >> $books_file
echo "</libros>" >> $books_file
echo "Prompt generado para db/tweets_books.json..."
