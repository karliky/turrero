-- Goodreads pads some author names with runs of spaces ("Adam   Rogers"): collapse them
UPDATE books SET author = trim(replace(replace(replace(author, '    ', ' '), '   ', ' '), '  ', ' ')) WHERE author IS NOT NULL;
UPDATE books SET author = replace(author, '  ', ' ') WHERE author LIKE '%  %';
