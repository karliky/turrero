import {
  createScriptLogger,
  getScriptDirectory,
  runWithErrorHandling,
} from "./libs/common-utils.ts";
import {
  createDataAccess,
  getBooksFromGoodReads,
} from "./libs/data-access.ts";
import type {
  BookToEnrich,
  EnrichedTweetData,
} from "../infrastructure/types/index.ts";

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger("generate-books");
const dataAccess = createDataAccess(scriptDir);

interface BookWithTurraId extends EnrichedTweetData {
  turraId: string;
}

async function generateBooks(): Promise<void> {
  const books = await getBooksFromGoodReads(dataAccess) as BookWithTurraId[];

  logger.info("Total books from GoodReads", books.length);

  // Filter out author pages
  const filteredBooks = books.filter((book: BookWithTurraId) =>
    book.url && book.url.indexOf("/author/") === -1
  );

  await dataAccess.saveBooksNotEnriched(
    filteredBooks as unknown as BookToEnrich[],
  );
  logger.info("Books generation completed successfully!");
}

// Run with standardized error handling
runWithErrorHandling(
  generateBooks,
  logger,
  "Generating books from enrichments",
);
