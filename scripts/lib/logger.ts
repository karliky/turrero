/**
 * Enhanced Logging Framework for Thread Addition Pipeline
 * Provides color-coded status messages, progress tracking, and performance metrics
 */

import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/colors.ts";

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  phase: string;
  message: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface ProgressTracker {
  current: number;
  total: number;
  startTime: Date;
  phase: string;
  eta?: Date;
}

export class Logger {
  private logs: LogEntry[] = [];
  private progressTrackers: Map<string, ProgressTracker> = new Map();
  private phaseStartTimes: Map<string, Date> = new Map();
  
  constructor(private enableColors: boolean = true) {}

  private formatLevel(level: LogLevel): string {
    if (!this.enableColors) return `[${level}]`;
    
    const levelColors = {
      DEBUG: colors.gray,
      INFO: colors.blue,
      SUCCESS: colors.green,
      WARN: colors.yellow,
      ERROR: colors.red,
      CRITICAL: colors.magenta
    };
    
    return levelColors[level](`[${level}]`);
  }

  private formatPhase(phase: string): string {
    if (!this.enableColors) return `[${phase}]`;
    return colors.cyan(`[${phase}]`);
  }

  private formatTimestamp(): string {
    const now = new Date();
    const time = now.toLocaleTimeString('es-ES', { 
      hour12: false, 
      timeZone: 'Europe/Madrid' 
    });
    return this.enableColors ? colors.gray(time) : time;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  private log(level: LogLevel, phase: string, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      phase,
      message,
      metadata
    };
    
    this.logs.push(entry);
    
    const output = `${this.formatTimestamp()} ${this.formatLevel(level)} ${this.formatPhase(phase)} ${message}`;
    console.log(output);
    
    if (metadata && level !== 'DEBUG') {
      console.log(this.enableColors ? colors.gray(`  └─ ${JSON.stringify(metadata)}`) : `  └─ ${JSON.stringify(metadata)}`);
    }
  }

  debug(phase: string, message: string, metadata?: Record<string, any>) {
    this.log('DEBUG', phase, message, metadata);
  }

  info(phase: string, message: string, metadata?: Record<string, any>) {
    this.log('INFO', phase, message, metadata);
  }

  success(phase: string, message: string, metadata?: Record<string, any>) {
    this.log('SUCCESS', phase, message, metadata);
  }

  warn(phase: string, message: string, metadata?: Record<string, any>) {
    this.log('WARN', phase, message, metadata);
  }

  error(phase: string, message: string, metadata?: Record<string, any>) {
    this.log('ERROR', phase, message, metadata);
  }

  critical(phase: string, message: string, metadata?: Record<string, any>) {
    this.log('CRITICAL', phase, message, metadata);
  }

  /**
   * Start timing a phase
   */
  startPhase(phase: string) {
    this.phaseStartTimes.set(phase, new Date());
    this.info('TIMING', `Started phase: ${phase}`);
  }

  /**
   * End timing a phase and log duration
   */
  endPhase(phase: string): number {
    const startTime = this.phaseStartTimes.get(phase);
    if (!startTime) {
      this.warn('TIMING', `No start time found for phase: ${phase}`);
      return 0;
    }
    
    const duration = Date.now() - startTime.getTime();
    this.phaseStartTimes.delete(phase);
    
    this.success('TIMING', `Completed phase: ${phase}`, { 
      duration: this.formatDuration(duration),
      durationMs: duration 
    });
    
    return duration;
  }

  /**
   * Start progress tracking
   */
  startProgress(id: string, total: number, phase: string = 'UNKNOWN') {
    this.progressTrackers.set(id, {
      current: 0,
      total,
      startTime: new Date(),
      phase
    });
    
    this.info('PROGRESS', `Started progress tracking: ${id}`, { total, phase });
  }

  /**
   * Update progress
   */
  updateProgress(id: string, current: number, message?: string) {
    const tracker = this.progressTrackers.get(id);
    if (!tracker) {
      this.warn('PROGRESS', `Progress tracker not found: ${id}`);
      return;
    }

    tracker.current = current;
    
    // Calculate ETA
    const elapsed = Date.now() - tracker.startTime.getTime();
    const rate = current / elapsed; // items per ms
    const remaining = tracker.total - current;
    const etaMs = remaining / rate;
    tracker.eta = new Date(Date.now() + etaMs);

    const percentage = Math.round((current / tracker.total) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    const baseMessage = `${progressBar} ${current}/${tracker.total} (${percentage}%)`;
    const fullMessage = message ? `${baseMessage} - ${message}` : baseMessage;
    
    const metadata: any = {
      current,
      total: tracker.total,
      percentage,
      elapsed: this.formatDuration(elapsed)
    };
    
    if (tracker.eta && current > 0) {
      metadata.eta = tracker.eta.toLocaleTimeString('es-ES', { hour12: false });
    }
    
    this.info('PROGRESS', fullMessage, metadata);
  }

  /**
   * Complete progress tracking
   */
  completeProgress(id: string) {
    const tracker = this.progressTrackers.get(id);
    if (!tracker) {
      this.warn('PROGRESS', `Progress tracker not found: ${id}`);
      return;
    }

    const totalTime = Date.now() - tracker.startTime.getTime();
    this.progressTrackers.delete(id);
    
    this.success('PROGRESS', `Completed: ${id}`, {
      totalItems: tracker.total,
      totalTime: this.formatDuration(totalTime),
      averageTime: this.formatDuration(totalTime / tracker.total)
    });
  }

  private createProgressBar(percentage: number, width: number = 20): string {
    if (!this.enableColors) {
      const filled = Math.round((percentage / 100) * width);
      return `[${'='.repeat(filled)}${' '.repeat(width - filled)}]`;
    }
    
    const filled = Math.round((percentage / 100) * width);
    const bar = '='.repeat(filled) + ' '.repeat(width - filled);
    
    if (percentage < 30) return colors.red(`[${bar}]`);
    if (percentage < 70) return colors.yellow(`[${bar}]`);
    return colors.green(`[${bar}]`);
  }

  /**
   * Log a recoverable error with suggestions
   */
  recoverableError(phase: string, error: string, suggestions: string[], metadata?: Record<string, any>) {
    this.error(phase, error, metadata);
    
    console.log(this.enableColors ? colors.yellow('  💡 Recovery suggestions:') : '  💡 Recovery suggestions:');
    suggestions.forEach((suggestion, index) => {
      const bullet = this.enableColors ? colors.yellow(`  ${index + 1}.`) : `  ${index + 1}.`;
      console.log(`${bullet} ${suggestion}`);
    });
  }

  /**
   * Log performance metrics
   */
  performance(phase: string, metrics: {
    executionTime: number;
    memoryUsage?: number;
    throughput?: number;
    operations?: number;
  }) {
    const formattedMetrics = {
      executionTime: this.formatDuration(metrics.executionTime),
      ...metrics
    };
    
    this.info('PERF', `Performance metrics for ${phase}`, formattedMetrics);
  }

  /**
   * Create a section header
   */
  section(title: string) {
    const separator = this.enableColors ? colors.cyan('─'.repeat(50)) : '─'.repeat(50);
    console.log('\n' + separator);
    console.log(this.enableColors ? colors.cyan.bold(`  ${title}`) : `  ${title}`);
    console.log(separator + '\n');
  }

  /**
   * Save logs to file
   */
  async saveLogs(filePath: string) {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        totalEntries: this.logs.length,
        logs: this.logs
      };
      
      await Deno.writeTextFile(filePath, JSON.stringify(logData, null, 2));
      this.success('LOGGING', `Logs saved to ${filePath}`, { entries: this.logs.length });
    } catch (error) {
      this.error('LOGGING', `Failed to save logs: ${error.message}`);
    }
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const levels = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    const phases = this.logs.reduce((acc, log) => {
      acc[log.phase] = (acc[log.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs: this.logs.length,
      levels,
      phases,
      timespan: this.logs.length > 0 ? {
        start: this.logs[0].timestamp,
        end: this.logs[this.logs.length - 1].timestamp
      } : null
    };
  }

  /**
   * Print summary report
   */
  printSummary() {
    const summary = this.getSummary();
    
    this.section('Execution Summary');
    this.info('SUMMARY', `Total log entries: ${summary.totalLogs}`);
    
    if (summary.timespan) {
      const duration = summary.timespan.end.getTime() - summary.timespan.start.getTime();
      this.info('SUMMARY', `Total execution time: ${this.formatDuration(duration)}`);
    }
    
    console.log('\nLog levels:');
    Object.entries(summary.levels).forEach(([level, count]) => {
      console.log(`  ${this.formatLevel(level as LogLevel)}: ${count}`);
    });
    
    console.log('\nPhases:');
    Object.entries(summary.phases).forEach(([phase, count]) => {
      console.log(`  ${this.formatPhase(phase)}: ${count}`);
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Utility functions
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatMemoryUsage(): string {
  const memUsage = Deno.memoryUsage();
  return formatFileSize(memUsage.rss);
}