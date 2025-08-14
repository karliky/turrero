#!/usr/bin/env -S deno run --allow-read

/**
 * Schema validation tool for Turrero database files
 * Validates all JSON and CSV files against their respective schemas
 */

import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  schema: string;
}

interface SchemaValidation {
  [filename: string]: {
    schemaPath: string;
    dataPath: string;
    description: string;
  };
}

const SCHEMA_MAPPINGS: SchemaValidation = {
  'tweets.json': {
    schemaPath: 'artifacts/db-schemas/tweets.schema.json',
    dataPath: 'infrastructure/db/tweets.json',
    description: 'Main tweets database'
  },
  'tweets-db.json': {
    schemaPath: 'artifacts/db-schemas/tweets-db.schema.json', 
    dataPath: 'infrastructure/db/tweets-db.json',
    description: 'Algolia search database'
  },
  'tweets_enriched.json': {
    schemaPath: 'artifacts/db-schemas/tweets_enriched.schema.json',
    dataPath: 'infrastructure/db/tweets_enriched.json',
    description: 'Enriched tweets with embedded content'
  },
  'books.json': {
    schemaPath: 'artifacts/db-schemas/books.schema.json',
    dataPath: 'infrastructure/db/books.json',
    description: 'Categorized books database'
  },
  'books-not-enriched.json': {
    schemaPath: 'artifacts/db-schemas/books-not-enriched.schema.json',
    dataPath: 'infrastructure/db/books-not-enriched.json',
    description: 'Raw books before enrichment'
  },
  'tweets_map.json': {
    schemaPath: 'artifacts/db-schemas/tweets_map.schema.json',
    dataPath: 'infrastructure/db/tweets_map.json',
    description: 'Manual thread categorization'
  },
  'tweets_summary.json': {
    schemaPath: 'artifacts/db-schemas/tweets_summary.schema.json',
    dataPath: 'infrastructure/db/tweets_summary.json',
    description: 'AI-generated thread summaries'
  },
  'tweets_exam.json': {
    schemaPath: 'artifacts/db-schemas/tweets_exam.schema.json',
    dataPath: 'infrastructure/db/tweets_exam.json',
    description: 'AI-generated quiz questions'
  },
  'processed_graph_data.json': {
    schemaPath: 'artifacts/db-schemas/processed_graph_data.schema.json',
    dataPath: 'infrastructure/db/processed_graph_data.json',
    description: 'Graph visualization data'
  }
};

async function loadSchema(schemaPath: string): Promise<any> {
  try {
    const schemaContent = await Deno.readTextFile(schemaPath);
    return JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Failed to load schema ${schemaPath}: ${error.message}`);
  }
}

async function loadData(dataPath: string): Promise<any> {
  try {
    const dataContent = await Deno.readTextFile(dataPath);
    return JSON.parse(dataContent);
  } catch (error) {
    throw new Error(`Failed to load data ${dataPath}: ${error.message}`);
  }
}

function validateBasicStructure(data: any, schema: any): string[] {
  const errors: string[] = [];
  
  // Check if data is array when schema expects array
  if (schema.type === 'array' && !Array.isArray(data)) {
    errors.push(`Expected array, got ${typeof data}`);
    return errors;
  }
  
  // Check if data is object when schema expects object
  if (schema.type === 'object' && (typeof data !== 'object' || Array.isArray(data))) {
    errors.push(`Expected object, got ${Array.isArray(data) ? 'array' : typeof data}`);
    return errors;
  }
  
  return errors;
}

function validateArrayItems(data: any[], itemSchema: any, maxSample: number = 100): string[] {
  const errors: string[] = [];
  const sampleSize = Math.min(data.length, maxSample);
  
  for (let i = 0; i < sampleSize; i++) {
    const item = data[i];
    const itemErrors = validateObject(item, itemSchema, `item[${i}]`);
    errors.push(...itemErrors);
  }
  
  if (data.length > maxSample) {
    console.log(`  📊 Sampled ${sampleSize} of ${data.length} items for validation`);
  }
  
  return errors;
}

function validateObject(obj: any, schema: any, path: string = 'root'): string[] {
  const errors: string[] = [];
  
  if (!schema.properties) return errors;
  
  // Check required fields
  if (schema.required) {
    for (const requiredField of schema.required) {
      if (!(requiredField in obj)) {
        errors.push(`${path}: Missing required field '${requiredField}'`);
      }
    }
  }
  
  // Check field types
  for (const [fieldName, fieldSchema] of Object.entries(schema.properties as any)) {
    if (fieldName in obj) {
      const value = obj[fieldName];
      const fieldErrors = validateField(value, fieldSchema, `${path}.${fieldName}`);
      errors.push(...fieldErrors);
    }
  }
  
  return errors;
}

function validateField(value: any, fieldSchema: any, path: string): string[] {
  const errors: string[] = [];
  
  // Type validation
  if (fieldSchema.type) {
    const expectedType = fieldSchema.type;
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (expectedType !== actualType) {
      errors.push(`${path}: Expected ${expectedType}, got ${actualType}`);
      return errors; // Skip further validation if type is wrong
    }
  }
  
  // Pattern validation for strings
  if (fieldSchema.pattern && typeof value === 'string') {
    const regex = new RegExp(fieldSchema.pattern);
    if (!regex.test(value)) {
      errors.push(`${path}: Value '${value}' does not match pattern ${fieldSchema.pattern}`);
    }
  }
  
  // Enum validation
  if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
    errors.push(`${path}: Value '${value}' not in allowed values: ${fieldSchema.enum.join(', ')}`);
  }
  
  // Const validation
  if (fieldSchema.const && value !== fieldSchema.const) {
    errors.push(`${path}: Expected constant value '${fieldSchema.const}', got '${value}'`);
  }
  
  // Array validation
  if (fieldSchema.type === 'array' && Array.isArray(value)) {
    if (fieldSchema.items) {
      const itemErrors = validateArrayItems(value, fieldSchema.items, 10);
      errors.push(...itemErrors);
    }
    
    if (fieldSchema.minItems && value.length < fieldSchema.minItems) {
      errors.push(`${path}: Array has ${value.length} items, minimum ${fieldSchema.minItems}`);
    }
    
    if (fieldSchema.maxItems && value.length > fieldSchema.maxItems) {
      errors.push(`${path}: Array has ${value.length} items, maximum ${fieldSchema.maxItems}`);
    }
  }
  
  return errors;
}

async function validateFile(filename: string, config: any): Promise<ValidationResult> {
  console.log(`🔍 Validating ${filename}...`);
  
  try {
    // Load schema and data
    const schema = await loadSchema(config.schemaPath);
    const data = await loadData(config.dataPath);
    
    console.log(`  📄 Loaded ${config.description}`);
    
    // Basic structure validation
    let errors = validateBasicStructure(data, schema);
    
    // Detailed validation based on schema type
    if (errors.length === 0) {
      if (schema.type === 'array') {
        if (schema.items) {
          const itemErrors = validateArrayItems(data, schema.items);
          errors.push(...itemErrors);
        }
      } else if (schema.type === 'object') {
        const objErrors = validateObject(data, schema);
        errors.push(...objErrors);
      }
    }
    
    const isValid = errors.length === 0;
    console.log(`  ${isValid ? '✅' : '❌'} ${isValid ? 'Valid' : `${errors.length} errors found`}`);
    
    return {
      file: filename,
      valid: isValid,
      errors: errors.slice(0, 10), // Limit errors for readability
      schema: config.schemaPath
    };
    
  } catch (error) {
    console.log(`  ❌ Validation failed: ${error.message}`);
    return {
      file: filename,
      valid: false,
      errors: [error.message],
      schema: config.schemaPath
    };
  }
}

async function validateAllFiles(): Promise<ValidationResult[]> {
  console.log('🚀 Starting schema validation for all database files\n');
  
  const results: ValidationResult[] = [];
  
  for (const [filename, config] of Object.entries(SCHEMA_MAPPINGS)) {
    try {
      // Check if files exist
      await Deno.stat(config.dataPath);
      await Deno.stat(config.schemaPath);
      
      const result = await validateFile(filename, config);
      results.push(result);
      
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log(`⚠️  Skipping ${filename} - file not found`);
        continue;
      }
      
      console.log(`❌ Error validating ${filename}: ${error.message}`);
      results.push({
        file: filename,
        valid: false,
        errors: [`File access error: ${error.message}`],
        schema: config.schemaPath
      });
    }
    
    console.log(''); // Empty line between files
  }
  
  return results;
}

function printSummary(results: ValidationResult[]): void {
  console.log('📊 Validation Summary');
  console.log('═'.repeat(50));
  
  const validFiles = results.filter(r => r.valid);
  const invalidFiles = results.filter(r => !r.valid);
  
  console.log(`✅ Valid files: ${validFiles.length}`);
  console.log(`❌ Invalid files: ${invalidFiles.length}`);
  console.log(`📁 Total files checked: ${results.length}`);
  
  if (invalidFiles.length > 0) {
    console.log('\n❌ Files with errors:');
    for (const result of invalidFiles) {
      console.log(`\n  ${result.file}:`);
      for (const error of result.errors.slice(0, 5)) {
        console.log(`    • ${error}`);
      }
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more errors`);
      }
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(invalidFiles.length === 0 ? '🎉 All validations passed!' : '⚠️  Some validations failed');
}

// Main execution
if (import.meta.main) {
  try {
    const results = await validateAllFiles();
    printSummary(results);
    
    const hasErrors = results.some(r => !r.valid);
    Deno.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Fatal error during validation:', error.message);
    Deno.exit(1);
  }
}