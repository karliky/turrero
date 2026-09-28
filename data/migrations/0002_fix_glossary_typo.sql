-- Typo in the glossary entry "Asertividad"
UPDATE glossary SET definition = replace(definition, 'Qualidad comunicativa', 'Calidad comunicativa') WHERE term = 'Asertividad';
