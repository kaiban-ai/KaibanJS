/**
 * @file index.ts
 * @path KaibanJS/src/utils/core/index.ts
 * @description Core utilities exports
 */

// Logger exports
export {
    logger,
    setLogLevel,
    configureLogger,
    createLogger
} from './logger';

// Error class exports
export {
    PrettyError,
    LLMInvocationError,
    LLMConfigurationError
} from './errors';

// Error utility functions
export {
    isPrettyError,
    isLLMError,
    wrapError,
    createUserError
} from './errors';

// Error and logging types
export type {
    ErrorType,
    PrettyErrorType,
    ErrorConfig,
    LLMError,
    ConfigurationError,
    LogLevel,
    LoggerConfig,
    LogFormattingOptions,
    LogDestinationConfig,
    LogFilterOptions
} from '@/utils/types/common';
