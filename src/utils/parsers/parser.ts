/**
 * @file parser.ts
 * @path KaibanJS/src/utils/parsers/parser.ts
 * @description JSON parsing and recovery utilities
 */

import { logger } from "../core/logger";
import { ParsedJSON, ParserConfig, ParserResult } from '../types/common/parser';

/**
 * Default parser configuration
 */
const DEFAULT_CONFIG: Required<ParserConfig> = {
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
    } catch {
        return null;
    }
}

/**
 * Parses a string into a JSON object with recovery attempts
 * @param str - String to parse
 * @param config - Parser configuration
 * @returns Parser result with parsed data or error
 */
export function parseJSON<T = any>(str: string, config: ParserConfig = {}): ParserResult<T> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    try {
        // Direct parse attempt
        const result = JSON.parse(str) as T;
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
                    return {
                        success: true,
                        data: result,
                        recoveryAttempted: true,
                        originalInput: str
                    };
                }
            } catch (recoveryError) {
                logger.debug('Recovery attempt failed:', recoveryError);
            }
        }

        // Return error result
        return {
            success: false,
            error: {
                message: initialError instanceof Error ? initialError.message : 'Unknown parsing error',
                context: str
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
export function getParsedJSON(str: string): ParsedJSON | null {
    const result = parseJSON<ParsedJSON>(str);
    
    if (!result.success) {
        logger.error("Failed to parse JSON:", result.error?.message);
        logger.debug("Original input:", result.originalInput);
        return null;
    }

    return result.data || null;
}