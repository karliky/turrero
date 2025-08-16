import { dirname, join } from "@std/path";
import { createDenoLogger } from "../infrastructure/logger.ts";
import type {
    ThreadId,
    Tweet,
    TweetSummary,
    CategorizedTweet,
    TweetExam,
    QuizQuestion,
    CurrentBook,
    BookToEnrich
} from "../infrastructure/types/index.ts";

// Import Phase 1 infrastructure
import {
    validateTweets,
    validateTweetsSummary,
    validateTweetsMap,
    validateTweetsExam,
    validateBooks,
    validateBooksNotEnriched,
    type TweetSummaryObject,
    type TweetMapObject,
    type TweetExamObject,
    type BookObject,
    type ExamQuestion
} from "../infrastructure/schemas/database-schemas.ts";
import {
    safeReadDatabase,
    safeWriteDatabase,
    atomicMultiWrite,
    tweetExists,
    type AtomicOperationResult,
    type DatabaseBackupInfo
} from "./lib/atomic-db-operations.ts";

// Initialize logger
const logger = createDenoLogger("ai-prompt-processor");

// Get script directory
const scriptDir = dirname(new URL(import.meta.url).pathname);
const projectRoot = join(scriptDir, '../');
const dbPath = join(projectRoot, 'infrastructure/db');
const tempPath = join(scriptDir, 'temp');

// Configuration
interface ProcessorOptions {
    threadId: ThreadId;
    claudeAvailable: boolean;
    testMode: boolean;
    verbose: boolean;
    noClaudeForce: boolean;
}

interface ProcessingResult {
    success: boolean;
    processedFiles: string[];
    errors: ProcessingError[];
    claudeUsed: boolean;
    duration: number;
    backups: DatabaseBackupInfo[];
    validationResults: ValidationResult[];
}

interface ValidationResult {
    fileName: string;
    success: boolean;
    error?: string;
}

interface ClaudeRetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    exponentialBackoff: boolean;
}

enum ErrorType {
    CLAUDE_UNAVAILABLE = 'claude_unavailable',
    INVALID_JSON = 'invalid_json',
    SCHEMA_VALIDATION = 'schema_validation',
    FILE_IO = 'file_io',
    THREAD_NOT_FOUND = 'thread_not_found',
    COMMAND_EXECUTION = 'command_execution',
    RESPONSE_VALIDATION = 'response_validation',
    ATOMIC_OPERATION = 'atomic_operation',
    BACKUP_FAILURE = 'backup_failure',
    RETRY_EXHAUSTED = 'retry_exhausted'
}

interface ProcessingError {
    type: ErrorType;
    message: string;
    context: Record<string, unknown>;
    recoverable: boolean;
}

// Categories for validation
const THREAD_CATEGORIES = [
    "resolución-de-problemas-complejos",
    "sistemas-complejos", 
    "marketing",
    "estrategia",
    "factor-x",
    "sociología",
    "gestión-del-talento",
    "leyes-y-sesgos",
    "trabajo-en-equipo",
    "libros",
    "futurismo-de-frontera",
    "personotecnia",
    "orquestación-cognitiva",
    "gaming",
    "lectura-de-señales",
    "el-contexto-manda",
    "desarrollo-de-habilidades",
    "otras-turras-del-querer"
];

const BOOK_CATEGORIES = [
    "Nonfiction",
    "Psychology", 
    "History",
    "Business",
    "Self Help",
    "Personal Development",
    "Technology",
    "Science",
    "Biography",
    "Health",
    "Economics",
    "Education",
    "Artificial Intelligence",
    "Games",
    "Fiction"
];

/**
 * Main AI Prompt Processor class
 */
class AIPromptProcessor {
    private options: ProcessorOptions;
    private startTime: number;
    private backupPaths: Map<string, string> = new Map();
    private retryConfig: ClaudeRetryConfig;
    private validationResults: ValidationResult[] = [];

    constructor(options: ProcessorOptions) {
        this.options = options;
        this.startTime = Date.now();
        this.retryConfig = {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            exponentialBackoff: true
        };
    }

    /**
     * Main processing function
     */
    async process(): Promise<ProcessingResult> {
        const result: ProcessingResult = {
            success: false,
            processedFiles: [],
            errors: [],
            claudeUsed: false,
            duration: 0,
            backups: [],
            validationResults: []
        };

        try {
            logger.info(`Starting AI Prompt Processor for thread ID: ${this.options.threadId}`);
            
            // Ensure temp directories exist
            await this.createTempDirectories();

            // Validate thread exists using Phase 1 infrastructure
            if (!tweetExists(this.options.threadId)) {
                result.errors.push({
                    type: ErrorType.THREAD_NOT_FOUND,
                    message: `Thread ${this.options.threadId} not found in tweets.json`,
                    context: { threadId: this.options.threadId },
                    recoverable: false
                });
                return result;
            }

            // Extract thread text with validation
            const threadText = await this.extractThreadText(this.options.threadId);
            if (!threadText) {
                result.errors.push({
                    type: ErrorType.THREAD_NOT_FOUND,
                    message: `Failed to extract thread text for ID ${this.options.threadId}`,
                    context: { threadId: this.options.threadId },
                    recoverable: false
                });
                return result;
            }

            // Check Claude availability
            if (!this.options.noClaudeForce) {
                this.options.claudeAvailable = await this.detectClaudeAvailability();
                result.claudeUsed = this.options.claudeAvailable;
            }

            if (this.options.claudeAvailable && !this.options.testMode) {
                // Process with Claude CLI
                await this.processWithClaude(threadText, result);
            } else {
                // Generate prompt files for manual processing
                await this.generatePromptFiles(threadText, result);
            }

            result.success = result.errors.length === 0;
            result.duration = Date.now() - this.startTime;
            result.validationResults = this.validationResults;

            if (result.success) {
                logger.info(`Processing completed successfully in ${result.duration}ms`);
                logger.info(`Validation results: ${result.validationResults.length} files checked`);
            } else {
                logger.error(`Processing failed with ${result.errors.length} errors`);
                // Log validation results for debugging
                for (const validation of result.validationResults) {
                    if (!validation.success) {
                        logger.error(`Validation failed for ${validation.fileName}: ${validation.error}`);
                    }
                }
            }

        } catch (error) {
            result.errors.push({
                type: ErrorType.COMMAND_EXECUTION,
                message: `Unexpected error: ${error}`,
                context: { error: String(error) },
                recoverable: false
            });
        }

        return result;
    }

    /**
     * Extract thread text from tweets.json with Zod validation
     */
    private async extractThreadText(threadId: ThreadId): Promise<string | null> {
        try {
            // Use atomic operations for safe reading
            const result = safeReadDatabase<typeof validateTweets>('tweets.json');
            if (!result.success || !result.data) {
                logger.error(`Failed to read tweets.json: ${result.error}`);
                this.validationResults.push({
                    fileName: 'tweets.json',
                    success: false,
                    error: result.error
                });
                return null;
            }

            this.validationResults.push({
                fileName: 'tweets.json',
                success: true
            });

            // Find the thread containing the specified ID
            const thread = (result.data as unknown as Tweet[][]).find((tweetArray: Tweet[]) => 
                tweetArray.some((tweet: Tweet) => tweet.id === threadId)
            );

            if (!thread) {
                logger.warn(`Thread with ID ${threadId} not found`);
                return null;
            }

            // Extract all tweet text from the thread (similar to jq operation)
            const tweetTexts = thread.map((tweet: Tweet) => tweet.tweet).filter((text: string) => text.trim());
            
            // Format: ID on first line, then tweet text
            const output = [threadId, ...tweetTexts].join('\n');
            
            logger.debug(`Extracted ${tweetTexts.length} tweets from thread ${threadId}`);
            return output;

        } catch (error) {
            logger.error(`Failed to extract thread text: ${error}`);
            this.validationResults.push({
                fileName: 'tweets.json',
                success: false,
                error: String(error)
            });
            return null;
        }
    }

    /**
     * Detect if Claude CLI is available
     */
    private async detectClaudeAvailability(): Promise<boolean> {
        try {
            const command = new Deno.Command("claude", {
                args: ["--version"],
                stdout: "piped",
                stderr: "piped"
            });

            const { success } = await command.output();
            
            if (success) {
                logger.info("Claude CLI detected and available");
                return true;
            } else {
                logger.info("Claude CLI not available - will generate prompt files");
                return false;
            }
        } catch {
            logger.info("Claude CLI not found in PATH - will generate prompt files");
            return false;
        }
    }

    /**
     * Process all prompts with Claude CLI using atomic operations
     */
    private async processWithClaude(threadText: string, result: ProcessingResult): Promise<void> {
        logger.info("Processing prompts with Claude CLI using atomic operations...");

        const operations: Array<{
            fileName: 'tweets_summary.json' | 'tweets_map.json' | 'tweets_exam.json' | 'books.json';
            data: any;
            skipValidation?: boolean;
        }> = [];

        try {
            // Process each prompt type and collect data for atomic write
            const summaryData = await this.processSummaryPromptData(threadText);
            if (summaryData) {
                const currentSummaries = safeReadDatabase<typeof validateTweetsSummary>('tweets_summary.json');
                if (currentSummaries.success && currentSummaries.data) {
                    const filtered = (currentSummaries.data as unknown as TweetSummary[]).filter((s: TweetSummary) => s.id !== this.options.threadId);
                    filtered.push(summaryData);
                    operations.push({ fileName: 'tweets_summary.json', data: filtered });
                }
            }

            const categoryData = await this.processCategoryPromptData(threadText);
            if (categoryData) {
                const currentMap = safeReadDatabase<typeof validateTweetsMap>('tweets_map.json');
                if (currentMap.success && currentMap.data) {
                    const filtered = (currentMap.data as unknown as CategorizedTweet[]).filter((m: CategorizedTweet) => m.id !== this.options.threadId);
                    filtered.push(categoryData);
                    operations.push({ fileName: 'tweets_map.json', data: filtered });
                }
            }

            const examData = await this.processExamPromptData(threadText);
            if (examData) {
                const currentExam = safeReadDatabase<typeof validateTweetsExam>('tweets_exam.json');
                if (currentExam.success && currentExam.data) {
                    const filtered = (currentExam.data as unknown as TweetExam[]).filter((e: TweetExam) => e.id !== this.options.threadId);
                    filtered.push(examData);
                    operations.push({ fileName: 'tweets_exam.json', data: filtered });
                }
            }

            const booksData = await this.processBooksPromptData();
            if (booksData.length > 0) {
                const currentBooks = safeReadDatabase<typeof validateBooks>('books.json');
                if (currentBooks.success && currentBooks.data) {
                    const updatedBooks = [...(currentBooks.data as unknown as CurrentBook[])];
                    for (const newBook of booksData) {
                        const existingIndex = updatedBooks.findIndex(b => b.title === newBook.title);
                        if (existingIndex >= 0 && newBook.categories && updatedBooks[existingIndex]) {
                            updatedBooks[existingIndex]!.categories = newBook.categories;
                        }
                    }
                    operations.push({ fileName: 'books.json', data: updatedBooks });
                }
            }

            // Perform atomic multi-write operation
            if (operations.length > 0) {
                const atomicResult = atomicMultiWrite(operations);
                if (atomicResult.success) {
                    result.backups = atomicResult.data?.backups || [];
                    result.processedFiles = operations.map(op => op.fileName);
                    logger.info(`Successfully updated ${operations.length} database files atomically`);
                } else {
                    result.errors.push({
                        type: ErrorType.ATOMIC_OPERATION,
                        message: `Atomic write failed: ${atomicResult.error}`,
                        context: { operations: operations.map(op => op.fileName) },
                        recoverable: true
                    });
                }
            }

        } catch (error) {
            logger.error(`Error during Claude processing: ${error}`);
            result.errors.push({
                type: ErrorType.COMMAND_EXECUTION,
                message: `Claude processing failed: ${error}`,
                context: { error: String(error) },
                recoverable: true
            });
        }
    }

    /**
     * Generate prompt files for manual processing
     */
    private async generatePromptFiles(threadText: string, result: ProcessingResult): Promise<void> {
        logger.info("Generating prompt files for manual processing...");

        const prompts = [
            {
                name: 'summary',
                filename: `prompt_summary_${this.options.threadId}.txt`,
                content: this.generateSummaryPrompt(threadText)
            },
            {
                name: 'map',
                filename: `prompt_map_${this.options.threadId}.txt`,
                content: this.generateCategoryPrompt(threadText)
            },
            {
                name: 'exam',
                filename: `prompt_exam_${this.options.threadId}.txt`,
                content: this.generateExamPrompt(threadText)
            },
            {
                name: 'books',
                filename: `prompt_books_${this.options.threadId}.txt`,
                content: await this.generateBooksPrompt()
            }
        ];

        for (const prompt of prompts) {
            try {
                const promptPath = join(tempPath, 'prompts', prompt.filename);
                await Deno.writeTextFile(promptPath, prompt.content);
                result.processedFiles.push(promptPath);
                logger.info(`Generated ${prompt.name} prompt: ${promptPath}`);
            } catch (error) {
                result.errors.push({
                    type: ErrorType.FILE_IO,
                    message: `Failed to write ${prompt.name} prompt file: ${error}`,
                    context: { filename: prompt.filename, error: String(error) },
                    recoverable: true
                });
            }
        }
    }

    /**
     * Generate summary prompt
     */
    private generateSummaryPrompt(threadText: string): string {
        return `Create a short headline from this text and do it in Spanish, never use these words in your headline: turras, hoy, hilo. Also, answer me in JSON format including the first word from my text which is an id and your headline but the property of the headline should be called "summary":

<text>
${threadText}
</text>`;
    }

    /**
     * Generate category mapping prompt
     */
    private generateCategoryPrompt(threadText: string): string {
        const categoriesText = THREAD_CATEGORIES.join('\n');
        
        return `I need you to categorize the text in any of these categories, you should include at least one and maximum 5 categories.
Return the output in a JSON format where id is the first word of the text and categories is a comma separated list of the selected categories:
for example:
<example>
{ "id": "1763816753929347384", "categories": "factor-x,sociología,estrategia,leyes-y-sesgos" },
</example>
<categories>
${categoriesText}
</categories>
<text>
${threadText}
</text>`;
    }

    /**
     * Generate exam prompt
     */
    private generateExamPrompt(threadText: string): string {
        return `You are an expert teacher, your task is to create an exam for your students. Create a multiple choice test exam from this text. Every question should have a maximum of 3 options and make the options as concised as possible, create a maximum of 3 questions. Make sure your response is in Spanish and as a JSON format following this structure { "id":"first word of the text", "questions": [ { "question": "", "options": [ ], "answer": answerIndex }] } where answerIndex is the index of the option from the array of options and the answerIndex starts from 1 and not 0. Please create the JSON in one single line.

<text>
${threadText}
</text>`;
    }

    /**
     * Generate books prompt
     */
    private async generateBooksPrompt(): Promise<string> {
        // Get books data (equivalent to running book-enrichment-node.ts)
        const booksData = await this.getBooksData();
        const categoriesText = BOOK_CATEGORIES.join('\n');
        
        return `Categoriza estos libros en alguna de las siguientes categorías, puedes incluir varias si es necesario. Responde solo las categorías por libro, no expliques nada mas, no busques en internet, usa el contexto para llegar a conclusiones, nunca respondas categorias fuera de la lista que te proveo:
El formato de salida es en formato JSON donde espero este formato como ejemplo:
<ejemplo>
"title": "Título del libro aquí",
"categories": [
    "Psychology",
    "Nonfiction"
    ]
</ejemplo>
<Categorias>
${categoriesText}
</categorias>
<libros>
${booksData}
</libros>`;
    }

    /**
     * Get books data for processing using atomic operations
     */
    private async getBooksData(): Promise<string> {
        try {
            const result = safeReadDatabase<typeof validateBooksNotEnriched>('books-not-enriched.json');
            if (!result.success || !result.data) {
                logger.warn(`Could not read books data: ${result.error}`);
                this.validationResults.push({
                    fileName: 'books-not-enriched.json',
                    success: false,
                    error: result.error
                });
                return '';
            }

            this.validationResults.push({
                fileName: 'books-not-enriched.json',
                success: true
            });
            
            return (result.data as unknown as CurrentBook[]).map((book: CurrentBook) => `${book.title} - ${book.author || 'Unknown Author'}`).join('\n');
        } catch (error) {
            logger.warn(`Could not read books data: ${error}`);
            this.validationResults.push({
                fileName: 'books-not-enriched.json',
                success: false,
                error: String(error)
            });
            return '';
        }
    }

    /**
     * Process summary prompt with Claude and return data (for atomic operations)
     */
    private async processSummaryPromptData(threadText: string): Promise<TweetSummaryObject | null> {
        const prompt = this.generateSummaryPrompt(threadText);
        const response = await this.executeClaudeWithPrompt(prompt);
        
        if (response) {
            return this.parseSummaryResponse(response, this.options.threadId);
        }
        return null;
    }

    /**
     * Process category prompt with Claude and return data (for atomic operations)
     */
    private async processCategoryPromptData(threadText: string): Promise<TweetMapObject | null> {
        const prompt = this.generateCategoryPrompt(threadText);
        const response = await this.executeClaudeWithPrompt(prompt);
        
        if (response) {
            return this.parseCategoryResponse(response, this.options.threadId);
        }
        return null;
    }

    /**
     * Process exam prompt with Claude and return data (for atomic operations)
     */
    private async processExamPromptData(threadText: string): Promise<TweetExamObject | null> {
        const prompt = this.generateExamPrompt(threadText);
        const response = await this.executeClaudeWithPrompt(prompt);
        
        if (response) {
            return this.parseExamResponse(response, this.options.threadId);
        }
        return null;
    }

    /**
     * Process books prompt with Claude and return data (for atomic operations)
     */
    private async processBooksPromptData(): Promise<Partial<BookObject>[]> {
        const prompt = await this.generateBooksPrompt();
        const response = await this.executeClaudeWithPrompt(prompt);
        
        if (response) {
            return this.parseBooksResponse(response);
        }
        return [];
    }

    /**
     * Execute Claude CLI with a prompt - simple but robust approach
     */
    private async executeClaudeWithPrompt(prompt: string): Promise<string | null> {
        try {
            // Write prompt to temporary file
            const promptPath = join(tempPath, `temp_prompt_${Date.now()}.txt`);
            await Deno.writeTextFile(promptPath, prompt);

            // Execute Claude
            const command = new Deno.Command("claude", {
                args: ["-p", promptPath],
                stdout: "piped",
                stderr: "piped"
            });

            const { success, stdout, stderr } = await command.output();

            // Clean up temp file
            await Deno.remove(promptPath).catch(() => {});

            if (success) {
                const response = new TextDecoder().decode(stdout);
                
                // Simple validation - non-empty response
                if (response && response.trim().length > 0) {
                    logger.debug("Claude response received");
                    return response;
                } else {
                    logger.warn("Claude returned empty response");
                    return null;
                }
            } else {
                const errorText = new TextDecoder().decode(stderr);
                logger.error(`Claude execution failed: ${errorText}`);
                return null;
            }
        } catch (error) {
            logger.error(`Error executing Claude: ${error}`);
            return null;
        }
    }

    /**
     * Validate Claude response format and content
     */
    private validateClaudeResponse(response: string): boolean {
        if (!response || response.trim().length === 0) {
            logger.warn('Claude response is empty');
            return false;
        }
        
        // Remove markdown code blocks if present
        const cleanResponse = response.replace(/```json\n?([\s\S]*?)\n?```/g, '$1').trim();
        
        try {
            JSON.parse(cleanResponse);
            return true;
        } catch {
            logger.warn('Claude response is not valid JSON');
            logger.debug(`Response content: ${response.substring(0, 200)}...`);
            return false;
        }
    }

    /**
     * Clean Claude response by removing markdown wrappers
     */
    private cleanClaudeResponse(response: string): string {
        return response.replace(/```json\n?([\s\S]*?)\n?```/g, '$1').trim();
    }

    /**
     * Parse Claude response with smart cleaning and one retry
     */
    private parseClaudeResponse(response: string): any {
        try {
            return JSON.parse(response);
        } catch {
            // Try cleaning and parsing once more
            const cleaned = this.cleanClaudeResponse(response);
            return JSON.parse(cleaned);
        }
    }

    /**
     * Parse summary response from Claude with smart handling
     */
    private parseSummaryResponse(response: string, threadId: ThreadId): TweetSummaryObject | null {
        try {
            const parsed = this.parseClaudeResponse(response);
            
            // Validate structure
            if (!parsed.summary || typeof parsed.summary !== 'string') {
                logger.error('Invalid summary response: missing or invalid summary field');
                logger.debug(`Response: ${JSON.stringify(parsed)}`);
                return null;
            }
            
            // Validate content
            if (parsed.summary.length < 10 || parsed.summary.length > 200) {
                logger.warn(`Summary length unusual: ${parsed.summary.length} characters`);
            }
            
            // Check for forbidden words
            const forbiddenWords = ['turras', 'hoy', 'hilo'];
            const summaryLower = parsed.summary.toLowerCase();
            const hasForbiddenWords = forbiddenWords.some(word => summaryLower.includes(word));
            
            if (hasForbiddenWords) {
                logger.warn('Summary contains forbidden words');
            }
            
            const result: TweetSummaryObject = {
                id: threadId,
                summary: parsed.summary
            };
            
            // Validate against schema
            const validation = safeWriteDatabase('tweets_summary.json', [result], true);
            if (!validation.success) {
                logger.error(`Summary validation failed: ${validation.error}`);
                return null;
            }
            
            return result;
            
        } catch (error) {
            logger.error(`Failed to parse summary response: ${error}`);
            logger.debug(`Response content: ${response.substring(0, 200)}...`);
            return null;
        }
    }

    /**
     * Parse category response from Claude with smart handling
     */
    private parseCategoryResponse(response: string, threadId: ThreadId): TweetMapObject | null {
        try {
            const parsed = this.parseClaudeResponse(response);
            
            // Validate structure
            if (!parsed.categories || typeof parsed.categories !== 'string') {
                logger.error('Invalid category response: missing or invalid categories field');
                logger.debug(`Response: ${JSON.stringify(parsed)}`);
                return null;
            }
            
            // Validate and filter categories
            const categories = parsed.categories.split(',').map((c: string) => c.trim());
            const validCategories = categories.filter((c: string) => THREAD_CATEGORIES.includes(c));
            
            if (validCategories.length === 0) {
                logger.error('No valid categories found in response');
                logger.debug(`Provided categories: ${categories.join(', ')}`);
                logger.debug(`Valid categories: ${THREAD_CATEGORIES.join(', ')}`);
                return null;
            }
            
            if (validCategories.length > 5) {
                logger.warn(`Too many categories (${validCategories.length}), limiting to 5`);
                validCategories.splice(5);
            }
            
            const result: TweetMapObject = {
                id: threadId,
                categories: validCategories.join(',')
            };
            
            // Validate against schema
            const validation = safeWriteDatabase('tweets_map.json', [result], true);
            if (!validation.success) {
                logger.error(`Category validation failed: ${validation.error}`);
                return null;
            }
            
            logger.info(`Categories assigned: ${validCategories.join(', ')}`);
            return result;
            
        } catch (error) {
            logger.error(`Failed to parse category response: ${error}`);
            logger.debug(`Response content: ${response.substring(0, 200)}...`);
            return null;
        }
    }

    /**
     * Parse exam response from Claude with smart handling
     */
    private parseExamResponse(response: string, threadId: ThreadId): TweetExamObject | null {
        try {
            const parsed = this.parseClaudeResponse(response);
            
            // Validate structure
            if (!parsed.questions || !Array.isArray(parsed.questions)) {
                logger.error('Invalid exam response: missing or invalid questions field');
                logger.debug(`Response: ${JSON.stringify(parsed)}`);
                return null;
            }
            
            if (parsed.questions.length === 0 || parsed.questions.length > 3) {
                logger.warn(`Questions count unusual: ${parsed.questions.length} (expected 1-3)`);
            }
            
            const validQuestions: ExamQuestion[] = [];
            
            for (const [index, q] of parsed.questions.entries()) {
                if (!q.question || typeof q.question !== 'string') {
                    logger.warn(`Question ${index + 1} missing or invalid question text`);
                    continue;
                }
                
                if (!Array.isArray(q.options) || q.options.length === 0 || q.options.length > 3) {
                    logger.warn(`Question ${index + 1} has invalid options count: ${q.options?.length}`);
                    continue;
                }
                
                if (typeof q.answer !== 'number' || q.answer < 1 || q.answer > q.options.length) {
                    logger.warn(`Question ${index + 1} has invalid answer index: ${q.answer}`);
                    continue;
                }
                
                // Convert from 1-based to 0-based indexing for internal storage
                const question: ExamQuestion = {
                    question: q.question,
                    options: q.options,
                    answer: q.answer - 1  // Convert to 0-based
                };
                
                validQuestions.push(question);
            }
            
            if (validQuestions.length === 0) {
                logger.error('No valid questions found in exam response');
                return null;
            }
            
            const result: TweetExamObject = {
                id: threadId,
                questions: validQuestions
            };
            
            // Validate against schema
            const validation = safeWriteDatabase('tweets_exam.json', [result], true);
            if (!validation.success) {
                logger.error(`Exam validation failed: ${validation.error}`);
                return null;
            }
            
            logger.info(`Generated ${validQuestions.length} valid exam questions`);
            return result;
            
        } catch (error) {
            logger.error(`Failed to parse exam response: ${error}`);
            logger.debug(`Response content: ${response.substring(0, 200)}...`);
            return null;
        }
    }

    /**
     * Parse books response from Claude with smart handling
     */
    private parseBooksResponse(response: string): Partial<BookObject>[] {
        try {
            const parsed = this.parseClaudeResponse(response);
            const books: Partial<BookObject>[] = [];
            
            if (!Array.isArray(parsed)) {
                logger.error('Invalid books response: expected array');
                logger.debug(`Response: ${JSON.stringify(parsed)}`);
                return [];
            }
            
            for (const [index, book] of parsed.entries()) {
                if (!book.title || typeof book.title !== 'string') {
                    logger.warn(`Book ${index + 1} missing or invalid title`);
                    continue;
                }
                
                if (!Array.isArray(book.categories) || book.categories.length === 0) {
                    logger.warn(`Book ${index + 1} (${book.title}) missing or invalid categories`);
                    continue;
                }
                
                const validCategories = book.categories.filter((c: string) => {
                    const isValid = BOOK_CATEGORIES.includes(c);
                    if (!isValid) {
                        logger.warn(`Invalid book category: ${c}`);
                    }
                    return isValid;
                });
                
                if (validCategories.length === 0) {
                    logger.warn(`Book ${index + 1} (${book.title}) has no valid categories`);
                    continue;
                }
                
                books.push({
                    title: book.title,
                    categories: validCategories
                });
                
                logger.debug(`Book processed: ${book.title} -> [${validCategories.join(', ')}]`);
            }
            
            logger.info(`Processed ${books.length} books with valid categories`);
            return books;
            
        } catch (error) {
            logger.error(`Failed to parse books response: ${error}`);
            logger.debug(`Response content: ${response.substring(0, 200)}...`);
            return [];
        }
    }

    // Note: Database update methods removed - now using atomic operations in processWithClaude()

    /**
     * Create temporary directories
     */
    private async createTempDirectories(): Promise<void> {
        try {
            await Deno.mkdir(join(tempPath, 'prompts'), { recursive: true });
            await Deno.mkdir(join(tempPath, 'responses'), { recursive: true });
            await Deno.mkdir(join(tempPath, 'backups'), { recursive: true });
        } catch (error) {
            logger.error(`Failed to create temp directories: ${error}`);
            throw error;
        }
    }

    // Note: Backup methods removed - now using atomic operations with built-in backup/restore
}

/**
 * Parse command line arguments
 */
function parseArgs(): ProcessorOptions {
    const args = Deno.args;
    
    if (args.length === 0) {
        console.error("Usage: deno run --allow-all ai-prompt-processor.ts [--test] [--verbose] [--no-claude] <thread-id>");
        Deno.exit(1);
    }

    const options: ProcessorOptions = {
        threadId: '',
        claudeAvailable: false,
        testMode: false,
        verbose: false,
        noClaudeForce: false
    };

    let threadIdFound = false;

    for (const arg of args) {
        if (arg === '--test') {
            options.testMode = true;
        } else if (arg === '--verbose') {
            options.verbose = true;
        } else if (arg === '--no-claude') {
            options.noClaudeForce = true;
        } else if (!threadIdFound && /^\d+$/.test(arg)) {
            options.threadId = arg as ThreadId;
            threadIdFound = true;
        }
    }

    if (!threadIdFound) {
        console.error("Error: Thread ID is required and must be numeric");
        Deno.exit(1);
    }

    return options;
}

/**
 * Main execution
 */
async function main() {
    try {
        const options = parseArgs();
        
        logger.info("AI Prompt Processor v1.0.0");
        logger.info(`Thread ID: ${options.threadId}`);
        
        if (options.testMode) {
            logger.info("Running in test mode - generating prompt files only");
        }
        
        if (options.noClaudeForce) {
            logger.info("Claude CLI disabled - generating prompt files only");
        }

        const processor = new AIPromptProcessor(options);
        const result = await processor.process();

        if (result.success) {
            logger.info(`✓ Processing completed successfully`);
            logger.info(`✓ Files processed: ${result.processedFiles.length}`);
            logger.info(`✓ Claude used: ${result.claudeUsed ? 'Yes' : 'No'}`);
            logger.info(`✓ Duration: ${result.duration}ms`);
            
            if (!result.claudeUsed) {
                logger.info("\n📝 Prompt files generated for manual processing:");
                for (const file of result.processedFiles) {
                    logger.info(`   - ${file}`);
                }
                logger.info("\n💡 Process these files with Claude manually and then use the responses to update the database files.");
            }
        } else {
            logger.error(`❌ Processing failed with ${result.errors.length} errors`);
            for (const error of result.errors) {
                logger.error(`   ${error.type}: ${error.message}`);
            }
            Deno.exit(1);
        }

    } catch (error) {
        logger.error(`Fatal error: ${error}`);
        Deno.exit(1);
    }
}

// Run main function
if (import.meta.main) {
    main();
}