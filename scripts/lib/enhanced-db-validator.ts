#!/usr/bin/env -S deno run --allow-all

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { 
  safeReadDatabase, 
  validateCrossFileConsistency,
  getAllTweetIds,
  type ConsistencyIssue,
  type AtomicOperationResult
} from './atomic-db-operations.ts';
import { 
  DATABASE_SCHEMAS,
  type DatabaseFileName,
  type Tweet,
  type TweetEnriched,
  type Book,
  type BookNotEnriched
} from '../../infrastructure/schemas/database-schemas.ts';

// Extended validation configuration
const METADATA_PATH = join(Deno.cwd(), 'public', 'metadata');
// Note: turras.csv has been removed from the system
const COMPONENTS_PATH = join(Deno.cwd(), 'app');
const INFRASTRUCTURE_PATH = join(Deno.cwd(), 'infrastructure');

// Extended issue types
export interface EnhancedConsistencyIssue extends ConsistencyIssue {
  type: 'missing_reference' | 'orphaned_record' | 'duplicate_id' | 'invalid_reference' | 
        'unused_metadata' | 'missing_turra' | 'orphaned_turra' | 'broken_asset_reference' |
        'semantic_duplicate' | 'missing_asset_file';
  metadata?: {
    filePath?: string;
    usageCount?: number;
    referencedIn?: string[];
    suggestedAction?: 'delete' | 'move' | 'rename' | 'repair';
  };
}

export interface MetadataAsset {
  fileName: string;
  filePath: string;
  size: number;
  extension: string;
  usageCount: number;
  referencedIn: string[];
  isOrphaned: boolean;
}

export interface TurraEntry {
  id: string;
  content: string;
  categoria: string;
}

export interface ValidationReport {
  timestamp: string;
  overallStatus: 'healthy' | 'warning' | 'error';
  issues: EnhancedConsistencyIssue[];
  metadataAnalysis: {
    totalAssets: number;
    usedAssets: number;
    orphanedAssets: number;
    brokenReferences: number;
    assets: MetadataAsset[];
  };
  turraAnalysis: {
    totalTurras: number;
    linkedTweets: number;
    orphanedTurras: number;
    missingTurras: number;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    autoFixAvailable: boolean;
  }[];
}

/**
 * Enhanced database validator with comprehensive asset and consistency checking
 */
export class EnhancedDatabaseValidator {
  private issues: EnhancedConsistencyIssue[] = [];
  private metadataAssets: MetadataAsset[] = [];
  private turraEntries: TurraEntry[] = [];

  /**
   * Run comprehensive validation
   */
  async runValidation(): Promise<ValidationReport> {
    console.log('🔍 Starting comprehensive database validation...');
    
    this.issues = [];
    this.metadataAssets = [];
    this.turraEntries = [];

    // Run base validation from existing system
    const baseIssues = validateCrossFileConsistency();
    this.issues.push(...baseIssues.map(issue => ({ ...issue } as EnhancedConsistencyIssue)));

    // Enhanced validations
    await this.validateMetadataAssets();
    await this.validateTurraConsistency();
    await this.validateSemanticDuplicates();
    await this.validateAssetReferences();

    return this.generateReport();
  }

  /**
   * Validate metadata assets and detect orphaned files
   */
  private async validateMetadataAssets(): Promise<void> {
    console.log('📁 Analyzing metadata assets...');

    if (!existsSync(METADATA_PATH)) {
      this.addIssue({
        type: 'invalid_reference',
        severity: 'error',
        message: 'Metadata directory does not exist',
        fileName: 'metadata',
      });
      return;
    }

    // Get all metadata files
    const metadataFiles = this.getMetadataFiles();
    
    // Analyze usage for each file
    for (const fileName of metadataFiles) {
      const asset = await this.analyzeAssetUsage(fileName);
      this.metadataAssets.push(asset);

      if (asset.isOrphaned) {
        this.addIssue({
          type: 'unused_metadata',
          severity: 'warning',
          message: `Unused metadata file: ${fileName}`,
          fileName: 'metadata',
          metadata: {
            filePath: asset.filePath,
            usageCount: asset.usageCount,
            referencedIn: asset.referencedIn,
            suggestedAction: 'delete'
          }
        });
      }
    }

    console.log(`📊 Found ${metadataFiles.length} metadata files, ${this.metadataAssets.filter(a => a.isOrphaned).length} orphaned`);
  }

  /**
   * Get all metadata files from the metadata directory
   */
  private getMetadataFiles(): string[] {
    const files: string[] = [];
    
    try {
      for (const dirEntry of Deno.readDirSync(METADATA_PATH)) {
        if (dirEntry.isFile && this.isImageFile(dirEntry.name)) {
          files.push(dirEntry.name);
        }
      }
    } catch (error) {
      console.error(`Error reading metadata directory: ${error}`);
    }

    return files;
  }

  /**
   * Check if file is an image file
   */
  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.webp', '.avif'];
    return imageExtensions.includes(extname(fileName).toLowerCase());
  }

  /**
   * Analyze usage of a specific asset
   */
  private async analyzeAssetUsage(fileName: string): Promise<MetadataAsset> {
    const filePath = join(METADATA_PATH, fileName);
    const fileStats = Deno.statSync(filePath);
    
    const asset: MetadataAsset = {
      fileName,
      filePath,
      size: fileStats.size,
      extension: extname(fileName),
      usageCount: 0,
      referencedIn: [],
      isOrphaned: false
    };

    // Check usage in JSON database files
    await this.checkJsonDatabaseUsage(asset);
    
    // Check usage in components and pages
    await this.checkCodeUsage(asset);
    
    // Check for special cases (library assets, etc.)
    await this.checkSpecialUsage(asset);

    asset.isOrphaned = asset.usageCount === 0;
    return asset;
  }

  /**
   * Check asset usage in JSON database files
   */
  private async checkJsonDatabaseUsage(asset: MetadataAsset): Promise<void> {
    const databases = ['books.json', 'books-not-enriched.json', 'tweets_enriched.json'] as const;
    
    for (const dbFile of databases) {
      const result = safeReadDatabase(dbFile);
      if (result.success && result.data) {
        const content = JSON.stringify(result.data);
        if (content.includes(asset.fileName)) {
          asset.usageCount++;
          asset.referencedIn.push(`db/${dbFile}`);
        }
      }
    }
  }

  /**
   * Check asset usage in code files (components, pages, etc.)
   */
  private async checkCodeUsage(asset: MetadataAsset): Promise<void> {
    const searchPaths = [COMPONENTS_PATH, INFRASTRUCTURE_PATH];
    
    for (const searchPath of searchPaths) {
      if (existsSync(searchPath)) {
        await this.searchInDirectory(searchPath, asset);
      }
    }
  }

  /**
   * Search for asset usage in a directory
   */
  private async searchInDirectory(dirPath: string, asset: MetadataAsset): Promise<void> {
    try {
      for (const dirEntry of Deno.readDirSync(dirPath)) {
        const fullPath = join(dirPath, dirEntry.name);
        
        if (dirEntry.isDirectory) {
          await this.searchInDirectory(fullPath, asset);
        } else if (this.isSearchableFile(dirEntry.name)) {
          await this.searchInFile(fullPath, asset);
        }
      }
    } catch (error) {
      console.error(`Error searching directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Check if file should be searched for asset references
   */
  private isSearchableFile(fileName: string): boolean {
    const searchableExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];
    return searchableExtensions.includes(extname(fileName));
  }

  /**
   * Search for asset usage in a specific file
   */
  private async searchInFile(filePath: string, asset: MetadataAsset): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      if (content.includes(asset.fileName)) {
        asset.usageCount++;
        const relativePath = filePath.replace(Deno.cwd(), '');
        asset.referencedIn.push(relativePath);
      }
    } catch (error) {
      // File might be binary or have permission issues, skip silently
    }
  }

  /**
   * Check for special usage cases (library assets, dynamic references, etc.)
   */
  private async checkSpecialUsage(asset: MetadataAsset): Promise<void> {
    // Check if it's a library-related asset (book covers, etc.)
    if (asset.fileName.includes('book') || asset.fileName.match(/^\d+\.jpg$/)) {
      asset.usageCount++;
      asset.referencedIn.push('library/dynamic-reference');
    }

    // Note: turras.csv checks removed as file has been eliminated
  }

  /**
   * Validate tweet-turra consistency
   */
  private async validateTurraConsistency(): Promise<void> {
    console.log('🔗 Validating tweet-turra consistency...');

    // Load turras CSV
    await this.loadTurrasFromCSV();
    
    // Get all tweet IDs
    const tweetIds = new Set(getAllTweetIds());
    const turraIds = new Set(this.turraEntries.map(t => t.id));

    // Check for tweets without turras
    for (const tweetId of tweetIds) {
      if (!turraIds.has(tweetId)) {
        // Note: turra consistency checks removed - no longer needed
      }
    }

    // Check for turras without tweets
    for (const turraId of turraIds) {
      if (!tweetIds.has(turraId)) {
        // Note: orphaned turra checks removed - no longer needed
      }
    }

    console.log(`🔗 Analyzed ${tweetIds.size} tweets and ${turraIds.size} turras`);
  }

  /**
   * Load turras from CSV file - REMOVED: turras.csv has been eliminated
   */
  private async loadTurrasFromCSV(): Promise<void> {
    // Note: turras.csv has been removed from the system
    // Turra data is now directly available in tweets.json
  }

  /**
   * Validate semantic duplicates (similar content, different IDs)
   */
  private async validateSemanticDuplicates(): Promise<void> {
    console.log('🔍 Checking for semantic duplicates...');

    // This is a placeholder for semantic duplicate detection
    // In a real implementation, you might use text similarity algorithms
    // For now, we'll check for exact content matches in turras
    
    const contentMap = new Map<string, string[]>();
    
    for (const turra of this.turraEntries) {
      const normalizedContent = turra.content.toLowerCase().trim();
      if (!contentMap.has(normalizedContent)) {
        contentMap.set(normalizedContent, []);
      }
      contentMap.get(normalizedContent)!.push(turra.id);
    }

    for (const [content, ids] of contentMap.entries()) {
      if (ids.length > 1) {
        this.addIssue({
          type: 'semantic_duplicate',
          severity: 'warning',
          message: `Duplicate content found in turras: ${ids.join(', ')}`,
          fileName: 'tweets.json',
          metadata: {
            referencedIn: ids,
            suggestedAction: 'rename'
          }
        });
      }
    }
  }

  /**
   * Validate asset references (check for broken image links)
   */
  private async validateAssetReferences(): Promise<void> {
    console.log('🖼️ Validating asset references...');

    const databases = ['books.json', 'books-not-enriched.json', 'tweets_enriched.json'] as const;
    
    for (const dbFile of databases) {
      const result = safeReadDatabase(dbFile);
      if (result.success && result.data) {
        await this.checkDatabaseAssetReferences(dbFile, result.data);
      }
    }
  }

  /**
   * Check asset references in a specific database
   */
  private async checkDatabaseAssetReferences(dbFile: string, data: any): Promise<void> {
    const content = JSON.stringify(data);
    const imageReferences = content.match(/\.(jpeg|jpg|png|svg|webp|avif)/gi) || [];
    
    for (const ref of imageReferences) {
      // Extract filename from the reference
      const fileName = ref.split('/').pop();
      if (fileName) {
        const fullPath = join(METADATA_PATH, fileName);
        if (!existsSync(fullPath)) {
          this.addIssue({
            type: 'broken_asset_reference',
            severity: 'error',
            message: `Broken asset reference: ${fileName} in ${dbFile}`,
            fileName: dbFile,
            metadata: {
              filePath: fullPath,
              suggestedAction: 'repair'
            }
          });
        }
      }
    }
  }

  /**
   * Add an issue to the list
   */
  private addIssue(issue: EnhancedConsistencyIssue): void {
    this.issues.push(issue);
  }

  /**
   * Generate comprehensive validation report
   */
  private generateReport(): ValidationReport {
    const timestamp = new Date().toISOString();
    
    // Calculate metadata analysis
    const metadataAnalysis = {
      totalAssets: this.metadataAssets.length,
      usedAssets: this.metadataAssets.filter(a => !a.isOrphaned).length,
      orphanedAssets: this.metadataAssets.filter(a => a.isOrphaned).length,
      brokenReferences: this.issues.filter(i => i.type === 'broken_asset_reference').length,
      assets: this.metadataAssets
    };

    // Calculate turra analysis
    const turraAnalysis = {
      totalTurras: this.turraEntries.length,
      linkedTweets: this.turraEntries.length - this.issues.filter(i => i.type === 'orphaned_turra').length,
      orphanedTurras: this.issues.filter(i => i.type === 'orphaned_turra').length,
      missingTurras: this.issues.filter(i => i.type === 'missing_turra').length
    };

    // Determine overall status
    const errorIssues = this.issues.filter(i => i.severity === 'error');
    const warningIssues = this.issues.filter(i => i.severity === 'warning');
    
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (errorIssues.length > 0) {
      overallStatus = 'error';
    } else if (warningIssues.length > 0) {
      overallStatus = 'warning';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      timestamp,
      overallStatus,
      issues: this.issues,
      metadataAnalysis,
      turraAnalysis,
      recommendations
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(): ValidationReport['recommendations'] {
    const recommendations: ValidationReport['recommendations'] = [];

    // High priority recommendations
    const brokenRefs = this.issues.filter(i => i.type === 'broken_asset_reference');
    if (brokenRefs.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Fix broken asset references',
        description: `${brokenRefs.length} broken asset references found. These will cause 404 errors.`,
        autoFixAvailable: false
      });
    }

    const duplicateIds = this.issues.filter(i => i.type === 'duplicate_id');
    if (duplicateIds.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Resolve duplicate IDs',
        description: `${duplicateIds.length} duplicate IDs found. This can cause serious data corruption.`,
        autoFixAvailable: false
      });
    }

    // Medium priority recommendations
    const orphanedAssets = this.metadataAssets.filter(a => a.isOrphaned);
    if (orphanedAssets.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Clean up unused metadata files',
        description: `${orphanedAssets.length} unused metadata files found, totaling ${this.formatBytes(orphanedAssets.reduce((sum, a) => sum + a.size, 0))}.`,
        autoFixAvailable: true
      });
    }

    const missingTurras = this.issues.filter(i => i.type === 'missing_turra');
    if (missingTurras.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Add missing turra entries',
        description: `${missingTurras.length} tweets have no corresponding turra entries.`,
        autoFixAvailable: true
      });
    }

    // Low priority recommendations
    const orphanedTurras = this.issues.filter(i => i.type === 'orphaned_turra');
    if (orphanedTurras.length > 0) {
      recommendations.push({
        priority: 'low',
        action: 'Remove orphaned turra entries',
        description: `${orphanedTurras.length} turra entries have no corresponding tweets.`,
        autoFixAvailable: true
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Maintain current state',
        description: 'Database integrity is excellent. Consider regular validation as part of CI/CD pipeline.',
        autoFixAvailable: false
      });
    }

    return recommendations;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const enhancedValidator = new EnhancedDatabaseValidator();