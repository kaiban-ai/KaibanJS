/**
 * @file index.ts
 * @path KaibanJS/src/utils/parsers/index.ts
 * @description Parser implementations exports
 */

// Core Parsing Functions
export { 
    parseJSON,
    getParsedJSON 
} from './parser';

// Parser Configuration
export const DEFAULT_PARSER_CONFIG = {
    attemptRecovery: true,
    maxDepth: 10,
    allowNonStringProps: true,
    sanitizers: []
} as const;

// Parser Types
export type {
    // Core Types
    ParsedJSON,
    ParserConfig,
    ParserResult,
    
    // Error Types
    ParserError,
    ValidationError,
    
    // Result Types
    ParseSuccess<T>,
    ParseFailure,
    
    // Configuration Types
    SanitizerFunction,
    ValidationFunction,
    RecoveryOptions
} from '@/utils/types/common/parser';

// Utility Types
export type {
    JSONPrimitive,
    JSONValue,
    JSONObject,
    JSONArray
} from '@/utils/types/common/parser';

// Constants
export {
    MAX_SAFE_DEPTH,
    RECOVERY_STRATEGIES
} from '@/utils/types/common/parser';