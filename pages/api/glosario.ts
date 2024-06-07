import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

type Data = {
    word: string;
    definition: string;
    sources?: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<Data[] | { error: string }>) {
    const results: Data[] = [];

    const filePath = path.join(process.cwd(), 'db', 'glosario.csv');
    fs.createReadStream(filePath)
        .pipe(csv({
            separator: ',', escape: '"', headers: ['word', 'definition', 'sources']

        }))
        .on('data', (data) => {
            console.log(data);
            return results.push({
                word: data.word, definition: data.definition, sources: data.sources || ''
            });
        })
        .on('end', () => {
            res.status(200).json(results.sort((a, b) => a.word.localeCompare(b.word)));
        })
        .on('error', (error) => {
            res.status(500).json({ error: 'Failed to read CSV file' });
        });
}
