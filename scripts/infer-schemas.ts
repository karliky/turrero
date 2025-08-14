#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Schema inference tool for Turrero database files
 * Analyzes JSON and CSV files to infer and update their schemas
 */

import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

interface InferredSchema {
  $schema: string;
  $id: string;
  title: string;
  description: string;
  type: string;
  [key: string]: any;
}

interface FieldAnalysis {
  type: string;
  nullable: boolean;
  patterns: Set<string>;
  values: Set<any>;
  minLength?: number;
  maxLength?: number;
  examples: any[];
}

const JSON_SCHEMA_DRAFT = "http://json-schema.org/draft/2020-12/schema";

const FILE_CONFIGS = {
  'tweets.json': {
    path: 'infrastructure/db/tweets.json',
    description: 'Primary tweet data structure containing scraped Twitter threads',
    title: 'Tweets Main Database'
  },
  'tweets-db.json': {
    path: 'infrastructure/db/tweets-db.json', 
    description: 'Simplified tweet structure optimized for Algolia search indexing',
    title: 'Tweets Algolia Database'
  },
  'tweets_enriched.json': {
    path: 'infrastructure/db/tweets_enriched.json',
    description: 'Enhanced tweet data with extracted embedded content',
    title: 'Tweets Enriched Database'
  },
  'books.json': {
    path: 'infrastructure/db/books.json',
    description: 'Categorized book references extracted from tweet threads',
    title: 'Books Database'
  },
  'tweets_map.json': {
    path: 'infrastructure/db/tweets_map.json',
    description: 'Manual categorization mapping for tweet threads',
    title: 'Tweets Map Database'
  },
  'tweets_summary.json': {
    path: 'infrastructure/db/tweets_summary.json',
    description: 'AI-generated summaries for tweet threads',
    title: 'Tweets Summary Database'
  }
};

function analyzeValue(value: any, analysis: FieldAnalysis, maxExamples: number = 3): void {
  if (value === null || value === undefined) {
    analysis.nullable = true;
    return;
  }

  const type = Array.isArray(value) ? 'array' : typeof value;
  
  // Update type (handle mixed types)
  if (analysis.type === 'unknown') {
    analysis.type = type;
  } else if (analysis.type !== type) {
    analysis.type = 'mixed';
  }

  // Collect examples
  if (analysis.examples.length < maxExamples) {
    analysis.examples.push(value);
  }

  // String-specific analysis
  if (typeof value === 'string') {
    analysis.minLength = Math.min(analysis.minLength || Infinity, value.length);
    analysis.maxLength = Math.max(analysis.maxLength || 0, value.length);
    
    // Detect patterns
    if (/^[0-9]+$/.test(value)) {
      analysis.patterns.add('numeric-string');
    }
    if (/^https?:\/\//.test(value)) {
      analysis.patterns.add('url');
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      analysis.patterns.add('datetime');
    }
    if (/^[a-z0-9\\-]+(,[a-z0-9\\-]+)*$/.test(value)) {
      analysis.patterns.add('comma-separated');
    }
  }

  // Track unique values for potential enums
  if (analysis.values.size < 20) {
    analysis.values.add(value);
  }
}

function analyzeObject(obj: any, maxSample: number = 100): Record<string, FieldAnalysis> {
  const fields: Record<string, FieldAnalysis> = {};
  
  function processItem(item: any) {
    if (typeof item !== 'object' || item === null) return;
    
    for (const [key, value] of Object.entries(item)) {
      if (!fields[key]) {
        fields[key] = {
          type: 'unknown',
          nullable: false,
          patterns: new Set(),
          values: new Set(),
          examples: []
        };
      }
      
      analyzeValue(value, fields[key]);
    }
  }
  
  if (Array.isArray(obj)) {
    const sampleSize = Math.min(obj.length, maxSample);
    for (let i = 0; i < sampleSize; i++) {
      processItem(obj[i]);
    }
  } else {
    processItem(obj);
  }
  
  return fields;
}

function generateFieldSchema(fieldName: string, analysis: FieldAnalysis): any {
  const schema: any = {};
  
  // Type
  if (analysis.type === 'mixed') {
    // Handle mixed types - prefer string if it's common
    schema.type = 'string';
  } else if (analysis.type !== 'unknown') {
    schema.type = analysis.type;
  }
  
  // Nullable
  if (analysis.nullable && schema.type) {
    schema.type = [schema.type, 'null'];
  }
  
  // String patterns
  if (schema.type === 'string' || (Array.isArray(schema.type) && schema.type.includes('string'))) {
    if (analysis.patterns.has('numeric-string')) {
      schema.pattern = '^[0-9]+$';
      schema.description = `${fieldName} - numeric string ID`;
    } else if (analysis.patterns.has('url')) {
      schema.format = 'uri';
      schema.description = `${fieldName} - URL`;
    } else if (analysis.patterns.has('datetime')) {
      schema.format = 'date-time';
      schema.description = `${fieldName} - ISO datetime`;
    } else if (analysis.patterns.has('comma-separated')) {
      schema.pattern = '^[a-z0-9\\\\-]+(,[a-z0-9\\\\-]+)*$';
      schema.description = `${fieldName} - comma-separated values`;
    }
    
    // Length constraints
    if (analysis.minLength !== undefined && analysis.maxLength !== undefined) {
      if (analysis.minLength === analysis.maxLength) {
        schema.minLength = analysis.minLength;
        schema.maxLength = analysis.maxLength;
      } else if (analysis.maxLength < 200) { // Only for reasonable lengths
        schema.maxLength = analysis.maxLength;
      }
    }
  }
  
  // Enums for small value sets
  if (analysis.values.size > 1 && analysis.values.size <= 10) {
    const values = Array.from(analysis.values).filter(v => v != null);
    if (values.length > 1 && values.length <= 10) {
      schema.enum = values.sort();
    }
  }
  
  // Constants for single values
  if (analysis.values.size === 1) {
    const value = Array.from(analysis.values)[0];
    if (value != null) {
      schema.const = value;
    }
  }
  
  // Add description if not present
  if (!schema.description) {
    schema.description = `${fieldName} field`;
  }
  
  // Add examples
  if (analysis.examples.length > 0) {
    schema.examples = analysis.examples.slice(0, 2);
  }
  
  return schema;
}

function generateSchema(data: any, filename: string, config: any): InferredSchema {
  const schema: InferredSchema = {
    $schema: JSON_SCHEMA_DRAFT,
    $id: filename.replace('.json', '.schema.json'),
    title: config.title,
    description: config.description,
    type: Array.isArray(data) ? 'array' : 'object'
  };
  
  if (Array.isArray(data)) {
    // Array schema
    if (data.length > 0) {
      const itemFields = analyzeObject(data);
      
      schema.items = {
        type: 'object',
        properties: {},
        required: []
      };
      
      // Determine required fields (present in most items)
      const totalItems = Math.min(data.length, 100);
      const requiredThreshold = totalItems * 0.8; // 80% of items must have the field
      
      for (const [fieldName, analysis] of Object.entries(itemFields)) {
        schema.items.properties[fieldName] = generateFieldSchema(fieldName, analysis);
        
        // Count how many items have this field
        let presentCount = 0;
        for (let i = 0; i < totalItems; i++) {
          if (data[i] && fieldName in data[i] && data[i][fieldName] != null) {
            presentCount++;
          }
        }
        
        if (presentCount >= requiredThreshold) {
          schema.items.required.push(fieldName);
        }
      }
      
      // Sort required fields for consistency
      schema.items.required.sort();
    }
  } else {
    // Object schema
    const fields = analyzeObject(data);
    
    schema.properties = {};
    schema.required = [];
    
    for (const [fieldName, analysis] of Object.entries(fields)) {
      schema.properties[fieldName] = generateFieldSchema(fieldName, analysis);
      
      if (!analysis.nullable) {
        schema.required.push(fieldName);
      }
    }
    
    schema.required.sort();
  }
  
  return schema;
}

async function inferSchemaForFile(filename: string, config: any): Promise<void> {
  console.log(`🔍 Analyzing ${filename}...`);
  
  try {
    // Load data
    const dataContent = await Deno.readTextFile(config.path);
    const data = JSON.parse(dataContent);
    
    console.log(`  📊 Loaded ${Array.isArray(data) ? `${data.length} items` : '1 object'}`);
    
    // Generate schema
    const schema = generateSchema(data, filename, config);
    
    // Write schema
    const schemaPath = join('artifacts/db-schemas', filename.replace('.json', '.schema.json'));
    await Deno.writeTextFile(schemaPath, JSON.stringify(schema, null, 2));
    
    console.log(`  ✅ Schema written to ${schemaPath}`);
    
  } catch (error) {
    console.log(`  ❌ Failed to process ${filename}: ${error.message}`);
  }
}

async function inferAllSchemas(): Promise<void> {
  console.log('🚀 Starting schema inference for all database files\n');
  
  // Ensure output directory exists
  try {
    await Deno.mkdir('artifacts/db-schemas', { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  for (const [filename, config] of Object.entries(FILE_CONFIGS)) {
    try {
      await Deno.stat(config.path);
      await inferSchemaForFile(filename, config);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log(`⚠️  Skipping ${filename} - file not found`);
      } else {
        console.log(`❌ Error processing ${filename}: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line between files
  }
  
  console.log('🎉 Schema inference completed!');
  console.log('📁 Schemas saved in artifacts/db-schemas/');
}

// Main execution
if (import.meta.main) {
  try {
    await inferAllSchemas();
  } catch (error) {
    console.error('💥 Fatal error during schema inference:', error.message);
    Deno.exit(1);
  }
}