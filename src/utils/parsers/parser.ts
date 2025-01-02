/**
 * @file parser.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\parsers\parser.ts
 * @description JSON parsing and recovery utilities
 */

import LogManager from '../../managers/core/logManager';
import { createError } from '../../types/common/errorTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import type { 
    IParsedJSON, 
    IParserConfig, 
    IParserResult 
} from '../../types/common/baseTypes';

/**
 * Default parser configuration
 */
const DEFAULT_CONFIG: Required<IParserConfig> = {
    attemptRecovery: true,
    maxDepth: 10,
    allowNonStringProps: true,
    sanitizers: []
};

/**
 * Sanitizes a JSON string for parsing
 * @param str - Input string to sanitize
 * @returns Sanitized string ready for parsing
 */
function sanitizeJsonString(str: string): string {
    return str
        .replace(/\\n/g, "")          // Remove escaped newlines
        .replace(/\n/g, " ")          // Replace actual newlines with spaces
        .replace(/([}\]])(\s*["{])/g, '$1,$2')  // Add missing commas
        .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
        .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2":')  // Quote unquoted keys
        .replace(/([{,]+)(\s*)(['"])?([a-z0-9A-Z_]+)(['"])?(\s*):/g, '$1"$4":')  // Fix key formatting
        .replace(/,\s*}/g, '}');  // Remove trailing comma before closing brace
}

/**
 * Recovers JSON from a malformed string
 * @param str - Malformed JSON string
 * @returns Recovered JSON string or null if recovery failed
 */
function recoverJson(str: string): string | null {
    try {
        // Extract JSON-like content
        const jsonStart = str.indexOf('{');
        const jsonEnd = str.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd === 0) {
            return null;
        }

        // Extract and sanitize the JSON part
        let jsonPart = str.substring(jsonStart, jsonEnd);

        // Handle markdown code blocks
        if (str.includes("/```json\n")) {
            const startMarker = "/```json\n";
            const endMarker = "\n```";
            const start = str.indexOf(startMarker) + startMarker.length;
            const end = str.indexOf(endMarker);
            if (start !== -1 && end !== -1) {
                jsonPart = str.substring(start, end);
            }
        }

        return sanitizeJsonString(jsonPart);
    } catch (error) {
        LogManager.debug('JSON recovery failed:', { error });
        return null;
    }
}

/**
 * Parses a string into a JSON object with recovery attempts
 * @param str - String to parse
 * @param config - Parser configuration
 * @returns Parser result with parsed data or error
 */
export function parseJSON<T = any>(str: string, config: IParserConfig = {}): IParserResult<T> {
    const startTime = Date.now();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    try {
        // Direct parse attempt
        const result = JSON.parse(str) as T;

        // Log successful parse
        LogManager.info('JSON parsed successfully', {
            duration: Date.now() - startTime,
            component: 'Parser',
            operation: 'parseJSON',
            success: true,
            recoveryAttempted: false
        });

        return {
            success: true,
            data: result,
            originalInput: str
        };
    } catch (initialError) {
        // Recovery attempt if enabled
        if (finalConfig.attemptRecovery) {
            try {
                const recovered = recoverJson(str);
                if (recovered) {
                    const result = JSON.parse(recovered) as T;

                    // Log successful recovery
                    LogManager.info('JSON recovered and parsed successfully', {
                        duration: Date.now() - startTime,
                        component: 'Parser',
                        operation: 'parseJSON',
                        success: true,
                        recoveryAttempted: true
                    });

                    return {
                        success: true,
                        data: result,
                        recoveryAttempted: true,
                        originalInput: str
                    };
                }
            } catch (recoveryError) {
                LogManager.debug('Recovery attempt failed:', { error: recoveryError });
            }
        }

        // Log failed parse
        LogManager.warn('JSON parsing failed', {
            duration: Date.now() - startTime,
            component: 'Parser',
            operation: 'parseJSON',
            success: false,
            recoveryAttempted: finalConfig.attemptRecovery,
            error: initialError instanceof Error ? initialError.message : 'Unknown parsing error'
        });

        // Return error result with flexible context
        return {
            success: false,
            error: {
                message: initialError instanceof Error ? initialError.message : 'Unknown parsing error',
                context: typeof initialError === 'object' && initialError !== null 
                    ? JSON.stringify(initialError) 
                    : String(initialError),
                position: undefined
            },
            recoveryAttempted: finalConfig.attemptRecovery,
            originalInput: str
        };
    }
}

/**
 * Main parsing function for application JSON
 * @param str - Input string to parse
 * @returns Parsed JSON object or null if parsing fails
 */
export function getParsedJSON(str: string): IParsedJSON | null {
    const startTime = Date.now();
    try {
        const result = parseJSON<IParsedJSON>(str);
        
        if (!result.success) {
            throw createError({
                message: result.error?.message || 'Failed to parse JSON',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: 'Parser',
                    operation: 'getParsedJSON',
                    originalInput: result.originalInput,
                    recoveryAttempted: result.recoveryAttempted
                }
            });
        }

        return result.data || null;
    } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        LogManager.error('Failed to parse JSON:', normalizedError);
        LogManager.debug('Original input:', { input: str });

        // Log parse failure
        LogManager.warn('JSON parsing failed in getParsedJSON', {
            duration: Date.now() - startTime,
            component: 'Parser',
            operation: 'getParsedJSON',
            success: false,
            error: normalizedError.message
        });

        return null;
    }
}
