# Database Simplification Plan

## Executive Summary

This plan outlines a phased approach to simplify the Turrero database architecture while maintaining backward compatibility. The plan focuses on eliminating redundancies, standardizing schemas, and creating a single source of truth for each data type.

## Design Principles

1. **Single Source of Truth**: Each piece of data has one canonical location
2. **Append-Only Operations**: Preserve existing data during migrations
3. **Build-Time Generation**: Derive optimized formats during build process
4. **Backward Compatibility**: Maintain existing API contracts during transition
5. **Incremental Migration**: Small, testable changes with rollback capability

## Proposed Target Architecture

### Canonical Data Sources
```
📁 infrastructure/db/canonical/
├── tweets.json              # Master tweet data (unchanged)
├── glosario.csv             # Glossary terms (unchanged) 
├── turras.csv               # Thread list (unchanged)
└── manual-enrichments.json  # 🆕 Consolidated manual data
```

### Generated/Derived Data
```
📁 infrastructure/db/generated/
├── search-index.json        # 🆕 Build-time Algolia index
├── books.json              # Generated from tweets.json
├── graph-data.json         # Generated from canonical + manual
└── podcast-episodes.json   # Generated from tweets.json
```

### Legacy Compatibility (Temporary)
```
📁 infrastructure/db/legacy/
├── tweets-db.json          # 🚫 Remove after migration
├── books-not-enriched.json # 🚫 Remove after migration
├── tweets_enriched.json    # 🚫 Replace with computed view
├── tweets_map.json         # 🚫 Consolidate into manual-enrichments.json
├── tweets_summary.json     # 🚫 Consolidate into manual-enrichments.json
└── tweets_exam.json        # 🚫 Consolidate into manual-enrichments.json
```

## Phase 1: Schema Standardization

### 1.1 Unified ID Format
**Timeline**: Week 1
**Risk**: Low

Standardize all ID formats to single string format:
```typescript
// Before: Mixed formats
"1234567890"           // tweets.json
"1234567890-9876543210" // tweets-db.json

// After: Consistent format
"1234567890"           // Thread ID everywhere
"1234567890#9876543210" // Tweet ID when needed
```

**Implementation**:
```typescript
// Add utility functions
export function parseCompositeId(id: string): { threadId: string; tweetId?: string } {
  const [threadId, tweetId] = id.split('#');
  return { threadId, tweetId };
}

export function createCompositeId(threadId: string, tweetId?: string): string {
  return tweetId ? `${threadId}#${tweetId}` : threadId;
}
```

### 1.2 Category Format Standardization
**Timeline**: Week 1
**Risk**: Low

Unify category representations:
```typescript
// Before: Mixed formats
categories: "estrategia,gaming"        // tweets_map.json (string)
categories: ["Business", "Strategy"]   // books.json (array)

// After: Consistent array format
categories: ["estrategia", "gaming"]   // Everywhere
```

**Backward Compatibility**: Add transform utilities in TweetProvider

## Phase 2: Consolidate Manual Files

### 2.1 Create manual-enrichments.json
**Timeline**: Week 2
**Risk**: Medium

Consolidate three manual files into one:
```typescript
interface ManualEnrichments {
  version: string;
  lastUpdated: string;
  threads: {
    [threadId: string]: {
      categories: string[];
      summary: string;
      exam?: {
        questions: ExamQuestion[];
      };
      metadata?: {
        aiGenerated: boolean;
        lastReviewed: string;
      };
    };
  };
  books: {
    [bookId: string]: {
      categories: string[];
      metadata?: {
        aiGenerated: boolean;
        lastReviewed: string;
      };
    };
  };
}
```

### 2.2 Migration Script
```typescript
// scripts/migrate-manual-enrichments.ts
async function migrateManualFiles(): Promise<void> {
  const tweetsMap = await dataAccess.getTweetsMap();
  const summaries = await dataAccess.getTweetSummaries();
  const exams = await dataAccess.getTweetExams();
  
  const enrichments: ManualEnrichments = {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    threads: {},
    books: {}
  };
  
  // Merge data from existing files
  for (const map of tweetsMap) {
    enrichments.threads[map.id] = {
      categories: map.categories.split(','),
      summary: summaries.find(s => s.id === map.id)?.summary || '',
      exam: exams.find(e => e.id === map.id)?.questions
    };
  }
  
  await dataAccess.writeManualEnrichments(enrichments);
}
```

### 2.3 Adapter Layer
**Timeline**: Week 2
**Risk**: Low

Create compatibility adapters:
```typescript
// infrastructure/adapters/legacy-data-adapter.ts
export class LegacyDataAdapter {
  static adaptTweetsMap(enrichments: ManualEnrichments): CategorizedTweet[] {
    return Object.entries(enrichments.threads).map(([id, data]) => ({
      id,
      categories: data.categories.join(',')
    }));
  }
  
  static adaptSummaries(enrichments: ManualEnrichments): TweetSummary[] {
    return Object.entries(enrichments.threads).map(([id, data]) => ({
      id,
      summary: data.summary
    }));
  }
}
```

## Phase 3: Eliminate Redundant Files

### 3.1 Remove books-not-enriched.json
**Timeline**: Week 3
**Risk**: Low

Direct pipeline from tweet extraction to enriched books:
```typescript
// scripts/generate-books.ts - Modified
async function generateEnrichedBooks(): Promise<void> {
  const rawBooks = await extractBooksFromTweets();
  const enrichedBooks = await enrichBooksWithAI(rawBooks);
  await dataAccess.writeBooks(enrichedBooks);
  // No intermediate file needed
}
```

### 3.2 Build-time Algolia Index
**Timeline**: Week 3
**Risk**: Medium

Generate search index during build instead of storing file:
```typescript
// next.config.js
const config = {
  async generateBuildId() {
    // Generate search index during build
    await generateSearchIndex();
    return 'custom-build-id';
  }
};

// infrastructure/build/generate-search-index.ts
export async function generateSearchIndex(): Promise<void> {
  const tweets = await dataAccess.getTweets();
  const searchEntries = createSearchIndexEntries(tweets);
  
  // Upload directly to Algolia instead of storing file
  await uploadToAlgolia(searchEntries);
  
  // Create optimized client-side bundle
  const clientIndex = createClientSearchData(searchEntries);
  await writeFile('public/search-data.json', JSON.stringify(clientIndex));
}
```

### 3.3 Computed Tweet Enrichments
**Timeline**: Week 4
**Risk**: Medium

Replace tweets_enriched.json with computed views:
```typescript
// infrastructure/TweetProvider.ts - Enhanced
export class TweetProvider {
  getEnrichedTweetData(tweetId: string): EnrichedTweetMetadata[] {
    const thread = this.getThread(tweetId);
    return thread
      .filter(tweet => tweet.metadata?.embed)
      .map(tweet => ({
        type: 'embed',
        embeddedTweetId: tweet.metadata.embed.id,
        id: tweet.id,
        author: tweet.metadata.embed.author,
        tweet: tweet.metadata.embed.tweet
      }));
  }
}
```

## Phase 4: Validation and Tooling

### 4.1 Schema Validation Tasks
**Timeline**: Week 5
**Risk**: Low

Add validation tasks to deno.json:
```json
{
  "tasks": {
    "schema:validate": "deno run --allow-read scripts/validate-schemas.ts",
    "schema:infer": "deno run --allow-read --allow-write scripts/infer-schemas.ts",
    "flows:check": "deno run --allow-read scripts/check-data-flows.ts",
    "migrate:manual": "deno run --allow-all scripts/migrate-manual-enrichments.ts"
  }
}
```

### 4.2 Validation Scripts
```typescript
// scripts/validate-schemas.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

async function validateAllSchemas(): Promise<void> {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  
  const schemas = await loadSchemas();
  const data = await loadAllData();
  
  for (const [filename, schema] of Object.entries(schemas)) {
    const validate = ajv.compile(schema);
    const fileData = data[filename];
    
    if (!validate(fileData)) {
      logger.error(`Schema validation failed for ${filename}:`, validate.errors);
      throw new Error(`Schema validation failed for ${filename}`);
    }
  }
  
  logger.info('All schemas validated successfully');
}
```

### 4.3 Flow Dependency Checker
```typescript
// scripts/check-data-flows.ts
async function checkDataFlows(): Promise<void> {
  const dependencies = {
    'tweets.json': [],
    'manual-enrichments.json': ['tweets.json'],
    'books.json': ['tweets.json', 'manual-enrichments.json'],
    'graph-data.json': ['tweets.json', 'manual-enrichments.json']
  };
  
  for (const [file, deps] of Object.entries(dependencies)) {
    await validateFileDependencies(file, deps);
  }
}
```

## Phase 5: Performance Optimization

### 5.1 Lazy Loading Infrastructure
**Timeline**: Week 6
**Risk**: Medium

Implement data streaming for large files:
```typescript
// infrastructure/data-stream.ts
export class DataStream {
  static async *streamTweets(): AsyncGenerator<Tweet[], void, unknown> {
    const file = await Deno.open('infrastructure/db/tweets.json');
    const decoder = new TextDecoder();
    let buffer = '';
    
    for await (const chunk of file.readable) {
      buffer += decoder.decode(chunk);
      const tweets = this.parsePartialTweets(buffer);
      if (tweets.length > 0) {
        yield tweets;
        buffer = this.getRemainderBuffer(buffer);
      }
    }
  }
}
```

### 5.2 Build-time Bundle Optimization
```typescript
// scripts/optimize-bundles.ts
async function createOptimizedBundles(): Promise<void> {
  const tweets = await dataAccess.getTweets();
  
  // Create category-specific bundles
  const categories = await getCategories();
  for (const category of categories) {
    const categoryTweets = filterTweetsByCategory(tweets, category);
    await writeOptimizedBundle(`bundles/${category}.json`, categoryTweets);
  }
  
  // Create pagination bundles
  const pages = createPaginatedBundles(tweets, 50);
  for (const [index, page] of pages.entries()) {
    await writeOptimizedBundle(`bundles/page-${index}.json`, page);
  }
}
```

## Migration Strategy

### Week-by-Week Breakdown

#### Week 1: Foundation
- [ ] Create new directory structure
- [ ] Implement ID format utilities
- [ ] Add category format utilities
- [ ] Update TypeScript interfaces
- [ ] Add adapter layer for backward compatibility

#### Week 2: Manual File Consolidation
- [ ] Create `manual-enrichments.json` schema
- [ ] Implement migration script
- [ ] Test adapter layer
- [ ] Update TweetProvider to use adapters
- [ ] Validate no functionality breaks

#### Week 3: Remove Redundancies
- [ ] Eliminate `books-not-enriched.json`
- [ ] Implement build-time Algolia generation
- [ ] Test search functionality
- [ ] Update deployment pipeline

#### Week 4: Computed Views
- [ ] Replace `tweets_enriched.json` with computed views
- [ ] Update components using enriched data
- [ ] Test all enrichment functionality
- [ ] Performance testing

#### Week 5: Validation Tooling
- [ ] Implement schema validation
- [ ] Add flow dependency checking
- [ ] Integrate into CI/CD pipeline
- [ ] Create monitoring dashboard

#### Week 6: Performance Optimization
- [ ] Implement lazy loading
- [ ] Create optimized bundles
- [ ] Add compression
- [ ] Performance benchmarking

## Rollback Strategy

### Rollback Points
1. **After Week 1**: Revert utility functions, keep existing data files
2. **After Week 2**: Restore individual manual files from `manual-enrichments.json`
3. **After Week 3**: Regenerate removed files from canonical sources
4. **After Week 4**: Restore file-based enrichments
5. **After Week 5**: Disable validation without breaking functionality
6. **After Week 6**: Revert to synchronous loading

### Rollback Scripts
```typescript
// scripts/rollback-manual-files.ts
async function rollbackManualFiles(): Promise<void> {
  const enrichments = await dataAccess.getManualEnrichments();
  
  // Regenerate individual files
  const tweetsMap = LegacyDataAdapter.adaptTweetsMap(enrichments);
  const summaries = LegacyDataAdapter.adaptSummaries(enrichments);
  const exams = LegacyDataAdapter.adaptExams(enrichments);
  
  await dataAccess.writeTweetsMap(tweetsMap);
  await dataAccess.writeTweetSummaries(summaries);
  await dataAccess.writeTweetExams(exams);
}
```

## Quality Gates

### Automated Testing
- [ ] Schema validation passes for all files
- [ ] Data flow dependencies are satisfied
- [ ] No functional regressions in web interface
- [ ] Performance benchmarks within 5% of baseline
- [ ] All TypeScript compilation passes
- [ ] Deno and Node.js validation successful

### Manual Testing
- [ ] Homepage loads correctly with categorized threads
- [ ] Individual thread pages display properly
- [ ] Search functionality works (if implemented)
- [ ] Book library displays correctly
- [ ] Glossary page functions normally
- [ ] Graph visualization works
- [ ] PDF generation succeeds (if tested)

### Performance Criteria
- [ ] Initial page load < 3 seconds
- [ ] Thread navigation < 500ms
- [ ] Search response < 200ms
- [ ] Build time increase < 20%
- [ ] Bundle size reduction > 15%

## Monitoring and Observability

### Metrics to Track
1. **File Sizes**: Monitor reduction in storage usage
2. **Build Times**: Track impact of build-time generation
3. **Page Load Performance**: Monitor frontend performance
4. **Data Consistency**: Track validation failures
5. **Pipeline Success Rate**: Monitor script execution success

### Alerting
- Schema validation failures
- Data flow dependency violations
- Performance regression beyond thresholds
- Build pipeline failures

## Communication Plan

### Stakeholders
- Development team
- Content managers (manual file updates)
- DevOps team (deployment pipeline changes)

### Documentation Updates
- [ ] Update CLAUDE.md with new file structure
- [ ] Create migration guide for content managers
- [ ] Update API documentation for TweetProvider changes
- [ ] Create troubleshooting guide for common issues

## Success Criteria

### Primary Goals
- [ ] 30% reduction in total database storage
- [ ] Elimination of file redundancies
- [ ] Single source of truth for each data type
- [ ] Simplified pipeline with fewer scripts
- [ ] Improved data consistency

### Secondary Goals
- [ ] Better performance through optimized bundles
- [ ] Enhanced developer experience with validation
- [ ] Simplified content management workflow
- [ ] Reduced maintenance overhead

### Completion Definition
The migration is complete when:
1. All legacy files are removed
2. All quality gates pass
3. No functional regressions exist
4. Documentation is updated
5. Team is trained on new processes

This plan provides a comprehensive approach to simplifying the database architecture while maintaining system stability and backward compatibility throughout the migration process.