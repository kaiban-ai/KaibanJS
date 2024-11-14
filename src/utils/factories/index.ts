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
} from '../core/logger';

// Error class exports
export {
    PrettyError,
    LLMInvocationError,
    LLMConfigurationError
} from '../core/errors';

// Error utility functions
export {
    wrapError,
    createUserError
} from '../core/errors';

// Export types from canonical locations
export type {
    ErrorType,
    PrettyErrorType,
    ErrorConfig,
    LLMError,
    ConfigurationError
} from '@/utils/types/common/errors';

export type {
    LogLevel,
    LoggerConfig,
    LogFormattingOptions,
    LogDestinationConfig,
    LogFilterOptions
} from '@/utils/types/common/logging';