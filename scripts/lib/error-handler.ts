/**
 * Enhanced Error Handling Framework
 * Provides actionable error messages with recovery suggestions and context
 */

import { logger } from './logger.ts';
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/colors.ts";

export interface ErrorContext {
  phase: string;
  operation: string;
  file?: string;
  threadId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RecoveryAction {
  action: string;
  command?: string;
  description: string;
  automated?: boolean;
}

export interface EnhancedError {
  code: string;
  message: string;
  context: ErrorContext;
  recoveryActions: RecoveryAction[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userFriendly: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: EnhancedError[] = [];
  
  private constructor() {}
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle file operation errors
   */
  handleFileError(error: Error, context: ErrorContext): EnhancedError {
    const enhancedError: EnhancedError = {
      code: 'FILE_ERROR',
      message: error.message,
      context,
      severity: 'HIGH',
      userFriendly: '',
      recoveryActions: []
    };

    if (error.message.includes('No such file or directory')) {
      enhancedError.userFriendly = `Missing file: ${context.file || 'Unknown file'}`;
      enhancedError.recoveryActions = [
        {
          action: 'Check file path',
          description: 'Verify the file path is correct and the file exists',
          command: `ls -la ${context.file ? context.file.split('/').slice(0, -1).join('/') : '.'}`
        },
        {
          action: 'Create missing file',
          description: 'Create the file if it should exist',
          automated: false
        },
        {
          action: 'Update file path',
          description: 'Check if the file has been moved or renamed'
        }
      ];
    } else if (error.message.includes('Permission denied')) {
      enhancedError.userFriendly = `Permission denied for file: ${context.file}`;
      enhancedError.recoveryActions = [
        {
          action: 'Fix permissions',
          description: 'Grant read/write permissions to the file',
          command: `chmod 644 ${context.file}`
        },
        {
          action: 'Check ownership',
          description: 'Verify you own the file or have access',
          command: `ls -la ${context.file}`
        }
      ];
    } else if (error.message.includes('Invalid JSON')) {
      enhancedError.code = 'JSON_PARSE_ERROR';
      enhancedError.userFriendly = `Corrupted JSON file: ${context.file}`;
      enhancedError.severity = 'CRITICAL';
      enhancedError.recoveryActions = [
        {
          action: 'Validate JSON syntax',
          description: 'Check for syntax errors in the JSON file',
          command: `jq . ${context.file}`
        },
        {
          action: 'Restore from backup',
          description: 'Restore from the most recent backup if available',
          automated: true
        },
        {
          action: 'Regenerate file',
          description: 'Regenerate the file using the appropriate script'
        }
      ];
    }

    this.logError(enhancedError);
    return enhancedError;
  }

  /**
   * Handle network/external service errors
   */
  handleNetworkError(error: Error, context: ErrorContext): EnhancedError {
    const enhancedError: EnhancedError = {
      code: 'NETWORK_ERROR',
      message: error.message,
      context,
      severity: 'MEDIUM',
      userFriendly: '',
      recoveryActions: []
    };

    if (error.message.includes('fetch failed') || error.message.includes('network')) {
      enhancedError.userFriendly = 'Network connection failed';
      enhancedError.recoveryActions = [
        {
          action: 'Check internet connection',
          description: 'Verify your internet connection is working',
          command: 'ping google.com -c 1'
        },
        {
          action: 'Retry operation',
          description: 'The operation will be retried automatically',
          automated: true
        },
        {
          action: 'Check service status',
          description: 'Verify the external service (X.com, Claude CLI) is available'
        }
      ];
    } else if (error.message.includes('timeout')) {
      enhancedError.userFriendly = 'Operation timed out';
      enhancedError.recoveryActions = [
        {
          action: 'Increase timeout',
          description: 'The operation will retry with longer timeout',
          automated: true
        },
        {
          action: 'Check system load',
          description: 'High system load might be causing delays',
          command: 'top -l 1 | head -20'
        }
      ];
    }

    this.logError(enhancedError);
    return enhancedError;
  }

  /**
   * Handle Claude CLI specific errors
   */
  handleClaudeError(error: Error, context: ErrorContext): EnhancedError {
    const enhancedError: EnhancedError = {
      code: 'CLAUDE_ERROR',
      message: error.message,
      context,
      severity: 'HIGH',
      userFriendly: '',
      recoveryActions: []
    };

    if (error.message.includes('claude: command not found')) {
      enhancedError.userFriendly = 'Claude CLI is not installed or not in PATH';
      enhancedError.recoveryActions = [
        {
          action: 'Install Claude CLI',
          description: 'Install the Claude CLI tool',
          command: 'npm install -g @anthropic-ai/claude-cli'
        },
        {
          action: 'Check PATH',
          description: 'Verify Claude CLI is in your PATH',
          command: 'which claude'
        },
        {
          action: 'Use fallback mode',
          description: 'Continue with prompt file generation only',
          automated: true
        }
      ];
    } else if (error.message.includes('authentication') || error.message.includes('API key')) {
      enhancedError.userFriendly = 'Claude CLI authentication failed';
      enhancedError.recoveryActions = [
        {
          action: 'Check API key',
          description: 'Verify your Claude API key is set correctly',
          command: 'echo $ANTHROPIC_API_KEY'
        },
        {
          action: 'Re-authenticate',
          description: 'Log in to Claude CLI again',
          command: 'claude auth login'
        },
        {
          action: 'Generate prompts only',
          description: 'Skip Claude execution and generate prompt files',
          automated: true
        }
      ];
    } else if (error.message.includes('rate limit')) {
      enhancedError.userFriendly = 'Claude API rate limit exceeded';
      enhancedError.severity = 'MEDIUM';
      enhancedError.recoveryActions = [
        {
          action: 'Wait and retry',
          description: 'Automatically retry after waiting period',
          automated: true
        },
        {
          action: 'Generate prompts for manual processing',
          description: 'Create prompt files for manual processing later',
          automated: true
        }
      ];
    }

    this.logError(enhancedError);
    return enhancedError;
  }

  /**
   * Handle database integrity errors
   */
  handleDatabaseError(error: Error, context: ErrorContext): EnhancedError {
    const enhancedError: EnhancedError = {
      code: 'DATABASE_ERROR',
      message: error.message,
      context,
      severity: 'CRITICAL',
      userFriendly: '',
      recoveryActions: []
    };

    if (error.message.includes('validation failed') || error.message.includes('schema')) {
      enhancedError.userFriendly = 'Database validation failed - data corruption detected';
      enhancedError.recoveryActions = [
        {
          action: 'Run integrity check',
          description: 'Run full database integrity validation',
          command: 'deno task db:validate:verbose'
        },
        {
          action: 'Restore from backup',
          description: 'Restore corrupted files from backup',
          automated: true
        },
        {
          action: 'Clean duplicate data',
          description: 'Remove duplicate entries that cause conflicts'
        }
      ];
    } else if (error.message.includes('duplicate')) {
      enhancedError.userFriendly = 'Duplicate data detected in database';
      enhancedError.severity = 'HIGH';
      enhancedError.recoveryActions = [
        {
          action: 'Remove duplicates',
          description: 'Clean duplicate entries from database',
          automated: true
        },
        {
          action: 'Validate consistency',
          description: 'Check cross-file data consistency',
          command: 'deno task db:validate'
        }
      ];
    }

    this.logError(enhancedError);
    return enhancedError;
  }

  /**
   * Handle scraping errors
   */
  handleScrapingError(error: Error, context: ErrorContext): EnhancedError {
    const enhancedError: EnhancedError = {
      code: 'SCRAPING_ERROR',
      message: error.message,
      context,
      severity: 'HIGH',
      userFriendly: '',
      recoveryActions: []
    };

    if (error.message.includes('tweet not found') || error.message.includes('404')) {
      enhancedError.userFriendly = `Tweet ${context.threadId} not found or deleted`;
      enhancedError.severity = 'MEDIUM';
      enhancedError.recoveryActions = [
        {
          action: 'Verify tweet ID',
          description: 'Check if the tweet ID is correct',
          command: `open https://x.com/i/status/${context.threadId}`
        },
        {
          action: 'Check if deleted',
          description: 'The tweet may have been deleted by the author'
        },
        {
          action: 'Try alternative URL',
          description: 'Try accessing via different URL format'
        }
      ];
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      enhancedError.userFriendly = 'X.com rate limit reached';
      enhancedError.recoveryActions = [
        {
          action: 'Wait and retry',
          description: 'Wait for rate limit reset (usually 15 minutes)',
          automated: true
        },
        {
          action: 'Use different approach',
          description: 'Try manual extraction if automated scraping fails'
        }
      ];
    } else if (error.message.includes('authentication') || error.message.includes('login')) {
      enhancedError.userFriendly = 'X.com authentication required';
      enhancedError.recoveryActions = [
        {
          action: 'Check credentials',
          description: 'Verify X.com credentials in environment variables'
        },
        {
          action: 'Re-authenticate',
          description: 'Log in to X.com again in the browser session'
        }
      ];
    }

    this.logError(enhancedError);
    return enhancedError;
  }

  /**
   * Handle general pipeline errors
   */
  handlePipelineError(error: Error, context: ErrorContext): EnhancedError {
    const enhancedError: EnhancedError = {
      code: 'PIPELINE_ERROR',
      message: error.message,
      context,
      severity: 'HIGH',
      userFriendly: 'Pipeline execution failed',
      recoveryActions: [
        {
          action: 'Check logs',
          description: 'Review detailed logs for specific error information',
          command: 'tail -50 ~/.claude/thread_hook.log'
        },
        {
          action: 'Run manual steps',
          description: 'Execute pipeline steps manually to isolate the issue'
        },
        {
          action: 'Validate environment',
          description: 'Check that all required tools and dependencies are available',
          command: 'deno task validate'
        }
      ]
    };

    this.logError(enhancedError);
    return enhancedError;
  }

  /**
   * Log error with enhanced formatting
   */
  private logError(enhancedError: EnhancedError) {
    this.errorHistory.push(enhancedError);
    
    logger.error(enhancedError.context.phase, 
      `[${enhancedError.code}] ${enhancedError.userFriendly || enhancedError.message}`,
      {
        operation: enhancedError.context.operation,
        severity: enhancedError.severity,
        file: enhancedError.context.file,
        threadId: enhancedError.context.threadId
      }
    );

    // Show recovery actions
    if (enhancedError.recoveryActions.length > 0) {
      logger.recoverableError(
        enhancedError.context.phase,
        enhancedError.userFriendly,
        enhancedError.recoveryActions.map(action => {
          let suggestion = `${action.action}: ${action.description}`;
          if (action.command) {
            suggestion += ` (${action.command})`;
          }
          if (action.automated) {
            suggestion += ' [AUTOMATED]';
          }
          return suggestion;
        })
      );
    }
  }

  /**
   * Auto-recovery attempt for common errors
   */
  async attemptAutoRecovery(enhancedError: EnhancedError): Promise<boolean> {
    logger.info('RECOVERY', `Attempting auto-recovery for ${enhancedError.code}`);
    
    const autoActions = enhancedError.recoveryActions.filter(action => action.automated);
    
    if (autoActions.length === 0) {
      logger.warn('RECOVERY', 'No automated recovery actions available');
      return false;
    }

    for (const action of autoActions) {
      try {
        logger.info('RECOVERY', `Executing: ${action.action}`);
        
        if (action.command) {
          const process = new Deno.Command('sh', {
            args: ['-c', action.command],
            stdout: 'piped',
            stderr: 'piped'
          });
          
          const { success, stdout, stderr } = await process.output();
          
          if (success) {
            logger.success('RECOVERY', `Recovery action successful: ${action.action}`);
          } else {
            logger.error('RECOVERY', `Recovery action failed: ${new TextDecoder().decode(stderr)}`);
            return false;
          }
        }
        
        // Add delay between recovery actions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error('RECOVERY', `Auto-recovery failed for ${action.action}: ${error.message}`);
        return false;
      }
    }
    
    logger.success('RECOVERY', `Auto-recovery completed for ${enhancedError.code}`);
    return true;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    const stats = {
      total: this.errorHistory.length,
      bySeverity: {} as Record<string, number>,
      byCode: {} as Record<string, number>,
      byPhase: {} as Record<string, number>,
      recent: this.errorHistory.slice(-5)
    };

    this.errorHistory.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;
      stats.byPhase[error.context.phase] = (stats.byPhase[error.context.phase] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
    logger.info('ERROR_HANDLER', 'Error history cleared');
  }

  /**
   * Export error report
   */
  async exportErrorReport(filePath: string) {
    const report = {
      timestamp: new Date().toISOString(),
      statistics: this.getErrorStatistics(),
      errors: this.errorHistory
    };

    await Deno.writeTextFile(filePath, JSON.stringify(report, null, 2));
    logger.success('ERROR_HANDLER', `Error report exported to ${filePath}`);
  }
}

// Convenience functions for common error types
export const errorHandler = ErrorHandler.getInstance();

export function handleFileError(error: Error, context: ErrorContext): EnhancedError {
  return errorHandler.handleFileError(error, context);
}

export function handleNetworkError(error: Error, context: ErrorContext): EnhancedError {
  return errorHandler.handleNetworkError(error, context);
}

export function handleClaudeError(error: Error, context: ErrorContext): EnhancedError {
  return errorHandler.handleClaudeError(error, context);
}

export function handleDatabaseError(error: Error, context: ErrorContext): EnhancedError {
  return errorHandler.handleDatabaseError(error, context);
}

export function handleScrapingError(error: Error, context: ErrorContext): EnhancedError {
  return errorHandler.handleScrapingError(error, context);
}

export function handlePipelineError(error: Error, context: ErrorContext): EnhancedError {
  return errorHandler.handlePipelineError(error, context);
}