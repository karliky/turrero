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
}

enum ErrorType {
    CLAUDE_UNAVAILABLE = 'claude_unavailable',
    INVALID_JSON = 'invalid_json',
    SCHEMA_VALIDATION = 'schema_validation',
    FILE_IO = 'file_io',
    THREAD_NOT_FOUND = 'thread_not_found',
    COMMAND_EXECUTION = 'command_execution'
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

    constructor(options: ProcessorOptions) {
        this.options = options;
        this.startTime = Date.now();
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
            duration: 0
        };

        try {
            logger.info(`Starting AI Prompt Processor for thread ID: ${this.options.threadId}`);
            
            // Ensure temp directories exist
            await this.createTempDirectories();

            // Extract thread text
            const threadText = await this.extractThreadText(this.options.threadId);
            if (!threadText) {
                result.errors.push({
                    type: ErrorType.THREAD_NOT_FOUND,
                    message: `Thread ${this.options.threadId} not found in tweets.json`,
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

            if (result.success) {
                logger.info(`Processing completed successfully in ${result.duration}ms`);
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
     * Extract thread text from tweets.json (replaces extract_thread_text.sh)
     */
    private async extractThreadText(threadId: ThreadId): Promise<string | null> {
        try {
            const tweetsPath = join(dbPath, 'tweets.json');
            const tweetsData = JSON.parse(await Deno.readTextFile(tweetsPath)) as Tweet[][];

            // Find the thread containing the specified ID
            const thread = tweetsData.find(tweetArray => 
                tweetArray.some(tweet => tweet.id === threadId)
            );

            if (!thread) {
                logger.warn(`Thread with ID ${threadId} not found`);
                return null;
            }

            // Extract all tweet text from the thread (similar to jq operation)
            const tweetTexts = thread.map(tweet => tweet.tweet).filter(text => text.trim());
            
            // Format: ID on first line, then tweet text
            const output = [threadId, ...tweetTexts].join('\n');
            
            logger.debug(`Extracted ${tweetTexts.length} tweets from thread ${threadId}`);
            return output;

        } catch (error) {
            logger.error(`Failed to extract thread text: ${error}`);
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
     * Process all prompts with Claude CLI
     */
    private async processWithClaude(threadText: string, result: ProcessingResult): Promise<void> {
        logger.info("Processing prompts with Claude CLI...");

        // Create backups before processing
        await this.createBackups();

        try {
            // Process each prompt type
            await this.processSummaryPrompt(threadText, result);
            await this.processCategoryPrompt(threadText, result);
            await this.processExamPrompt(threadText, result);
            await this.processBooksPrompt(result);

        } catch (error) {
            logger.error(`Error during Claude processing: ${error}`);
            await this.rollbackFromBackups();
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
     * Get books data for processing
     */
    private async getBooksData(): Promise<string> {
        try {
            // Read books-not-enriched.json for book data
            const booksPath = join(dbPath, 'books-not-enriched.json');
            const booksData = JSON.parse(await Deno.readTextFile(booksPath)) as BookToEnrich[];
            
            return booksData.map(book => `${book.title} - ${book.author || 'Unknown Author'}`).join('\n');
        } catch (error) {
            logger.warn(`Could not read books data: ${error}`);
            return '';
        }
    }

    /**
     * Process summary prompt with Claude
     */
    private async processSummaryPrompt(threadText: string, result: ProcessingResult): Promise<void> {
        const prompt = this.generateSummaryPrompt(threadText);
        const response = await this.executeClaudeWithPrompt(prompt);
        
        if (response) {
            const summaryData = this.parseSummaryResponse(response, this.options.threadId);
            if (summaryData) {
                await this.updateTweetsSummary(summaryData);
                result.processedFiles.push('tweets_summary.json');
                logger.info("Successfully updated tweets_summary.json");
            }
        }
    }

    /**
     * Process category prompt with Claude
     */
    private async processCategoryPrompt(threadText: string, result: ProcessingResult): Promise<void> {
        const prompt = this.generateCategoryPrompt(threadText);
        const response = await this.executeClaudeWithPrompt(prompt);
        
        if (response) {
            const categoryData = this.parseCategoryResponse(response, this.options.threadId);
            if (categoryData) {
                await this.updateTweetsMap(categoryData);
                result.processedFiles.push('tweets_map.json');
                logger.info("Successfully updated tweets_map.json");
            }
        }
    }

    /**
     * Process exam prompt with Claude
     */
    private async processExamPrompt(threadText: string, result: ProcessingResult): Promise<void> {
        const prompt = this.generateExamPrompt(threadText);
        const response = await this.executeClaudeWithPrompt(prompt);
        
        if (response) {
            const examData = this.parseExamResponse(response, this.options.threadId);
            if (examData) {
                await this.updateTweetsExam(examData);
                result.processedFiles.push('tweets_exam.json');
                logger.info("Successfully updated tweets_exam.json");
            }
        }
    }

    /**
     * Process books prompt with Claude
     */
    private async processBooksPrompt(result: ProcessingResult): Promise<void> {
        const prompt = await this.generateBooksPrompt();
        const response = await this.executeClaudeWithPrompt(prompt);
        
        if (response) {
            const booksData = this.parseBooksResponse(response);
            if (booksData.length > 0) {
                await this.updateBooks(booksData);
                result.processedFiles.push('books.json');
                logger.info("Successfully updated books.json");
            }
        }
    }

    /**
     * Execute Claude CLI with a prompt
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
                logger.debug("Claude response received");
                return response;
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
     * Parse summary response from Claude
     */
    private parseSummaryResponse(response: string, threadId: ThreadId): TweetSummary | null {
        try {
            const parsed = JSON.parse(response.trim());
            
            if (parsed.id && parsed.summary && typeof parsed.summary === 'string') {
                return {
                    id: threadId,
                    summary: parsed.summary
                };
            }
            
            logger.error("Invalid summary response format");
            return null;
        } catch (error) {
            logger.error(`Failed to parse summary response: ${error}`);
            return null;
        }
    }

    /**
     * Parse category response from Claude
     */
    private parseCategoryResponse(response: string, threadId: ThreadId): CategorizedTweet | null {
        try {
            const parsed = JSON.parse(response.trim());
            
            if (parsed.id && parsed.categories && typeof parsed.categories === 'string') {
                // Validate categories
                const categories = parsed.categories.split(',').map((c: string) => c.trim());
                const validCategories = categories.filter((c: string) => THREAD_CATEGORIES.includes(c));
                
                if (validCategories.length > 0) {
                    return {
                        id: threadId,
                        categories: validCategories.join(',')
                    };
                }
            }
            
            logger.error("Invalid category response format");
            return null;
        } catch (error) {
            logger.error(`Failed to parse category response: ${error}`);
            return null;
        }
    }

    /**
     * Parse exam response from Claude
     */
    private parseExamResponse(response: string, threadId: ThreadId): TweetExam | null {
        try {
            const parsed = JSON.parse(response.trim());
            
            if (parsed.id && parsed.questions && Array.isArray(parsed.questions)) {
                const validQuestions: QuizQuestion[] = [];
                
                for (const q of parsed.questions) {
                    if (q.question && Array.isArray(q.options) && typeof q.answer === 'number') {
                        // Convert from 1-based to 0-based indexing for internal storage
                        const question: QuizQuestion = {
                            question: q.question,
                            options: q.options,
                            answer: q.answer - 1  // Convert to 0-based
                        };
                        
                        if (question.answer >= 0 && question.answer < question.options.length) {
                            validQuestions.push(question);
                        }
                    }
                }
                
                if (validQuestions.length > 0) {
                    return {
                        id: threadId,
                        questions: validQuestions
                    };
                }
            }
            
            logger.error("Invalid exam response format");
            return null;
        } catch (error) {
            logger.error(`Failed to parse exam response: ${error}`);
            return null;
        }
    }

    /**
     * Parse books response from Claude
     */
    private parseBooksResponse(response: string): Partial<CurrentBook>[] {
        try {
            const parsed = JSON.parse(response.trim());
            const books: Partial<CurrentBook>[] = [];
            
            if (Array.isArray(parsed)) {
                for (const book of parsed) {
                    if (book.title && Array.isArray(book.categories)) {
                        const validCategories = book.categories.filter((c: string) => BOOK_CATEGORIES.includes(c));
                        if (validCategories.length > 0) {
                            books.push({
                                title: book.title,
                                categories: validCategories
                            });
                        }
                    }
                }
            }
            
            return books;
        } catch (error) {
            logger.error(`Failed to parse books response: ${error}`);
            return [];
        }
    }

    /**
     * Update tweets_summary.json
     */
    private async updateTweetsSummary(newSummary: TweetSummary): Promise<void> {
        const filePath = join(dbPath, 'tweets_summary.json');
        
        try {
            const existing = JSON.parse(await Deno.readTextFile(filePath)) as TweetSummary[];
            
            // Remove existing entry for this ID
            const filtered = existing.filter(s => s.id !== newSummary.id);
            
            // Add new entry
            filtered.push(newSummary);
            
            // Write back to file
            await Deno.writeTextFile(filePath, JSON.stringify(filtered, null, 2));
            
        } catch (error) {
            logger.error(`Failed to update tweets_summary.json: ${error}`);
            throw error;
        }
    }

    /**
     * Update tweets_map.json
     */
    private async updateTweetsMap(newMapping: CategorizedTweet): Promise<void> {
        const filePath = join(dbPath, 'tweets_map.json');
        
        try {
            const existing = JSON.parse(await Deno.readTextFile(filePath)) as CategorizedTweet[];
            
            // Remove existing entry for this ID
            const filtered = existing.filter(m => m.id !== newMapping.id);
            
            // Add new entry
            filtered.push(newMapping);
            
            // Write back to file
            await Deno.writeTextFile(filePath, JSON.stringify(filtered, null, 2));
            
        } catch (error) {
            logger.error(`Failed to update tweets_map.json: ${error}`);
            throw error;
        }
    }

    /**
     * Update tweets_exam.json
     */
    private async updateTweetsExam(newExam: TweetExam): Promise<void> {
        const filePath = join(dbPath, 'tweets_exam.json');
        
        try {
            const existing = JSON.parse(await Deno.readTextFile(filePath)) as TweetExam[];
            
            // Remove existing entry for this ID
            const filtered = existing.filter(e => e.id !== newExam.id);
            
            // Add new entry
            filtered.push(newExam);
            
            // Write back to file
            await Deno.writeTextFile(filePath, JSON.stringify(filtered, null, 2));
            
        } catch (error) {
            logger.error(`Failed to update tweets_exam.json: ${error}`);
            throw error;
        }
    }

    /**
     * Update books.json
     */
    private async updateBooks(newBooks: Partial<CurrentBook>[]): Promise<void> {
        const filePath = join(dbPath, 'books.json');
        
        try {
            const existing = JSON.parse(await Deno.readTextFile(filePath)) as CurrentBook[];
            
            // Update existing books with new category information
            for (const newBook of newBooks) {
                const existingIndex = existing.findIndex(b => b.title === newBook.title);
                if (existingIndex >= 0 && newBook.categories && existing[existingIndex]) {
                    existing[existingIndex]!.categories = newBook.categories;
                }
            }
            
            // Write back to file
            await Deno.writeTextFile(filePath, JSON.stringify(existing, null, 2));
            
        } catch (error) {
            logger.error(`Failed to update books.json: ${error}`);
            throw error;
        }
    }

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

    /**
     * Create backups of database files
     */
    private async createBackups(): Promise<void> {
        const filesToBackup = [
            'tweets_summary.json',
            'tweets_map.json',
            'tweets_exam.json',
            'books.json'
        ];

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        for (const filename of filesToBackup) {
            try {
                const originalPath = join(dbPath, filename);
                const backupPath = join(tempPath, 'backups', `${filename}.${timestamp}.backup`);
                
                await Deno.copyFile(originalPath, backupPath);
                this.backupPaths.set(filename, backupPath);
                
                logger.debug(`Created backup: ${backupPath}`);
            } catch (error) {
                logger.warn(`Failed to backup ${filename}: ${error}`);
            }
        }
    }

    /**
     * Rollback from backups
     */
    private async rollbackFromBackups(): Promise<void> {
        logger.warn("Rolling back from backups...");

        for (const [filename, backupPath] of this.backupPaths) {
            try {
                const originalPath = join(dbPath, filename);
                await Deno.copyFile(backupPath, originalPath);
                logger.info(`Restored ${filename} from backup`);
            } catch (error) {
                logger.error(`Failed to restore ${filename}: ${error}`);
            }
        }
    }
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