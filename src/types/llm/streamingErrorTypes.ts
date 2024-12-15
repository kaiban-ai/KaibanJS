/**
 * @file streamingErrorTypes.ts
 * @path src/types/llm/streamingErrorTypes.ts
 * @description Streaming-specific error types and utilities
 */

import { ERROR_KINDS, IErrorType, createError } from '../common/errorTypes';

export interface IStreamingErrorDetails {
    streamId?: string;
    tokenIndex?: number;
    streamState?: {
        totalTokens: number;
        completedTokens: number;
        failedTokens: number;
        lastSuccessfulToken?: string;
    };
}

export interface IStreamingErrorContext {
    streamDetails: IStreamingErrorDetails;
    [key: string]: unknown;
}

export const createStreamingError = (params: {
    message: string;
    streamDetails: IStreamingErrorDetails;
    context?: Record<string, unknown>;
}): IErrorType => {
    return createError({
        message: params.message,
        type: ERROR_KINDS.ExecutionError,
        context: {
            ...params.context,
            streamDetails: params.streamDetails,
            errorCategory: 'StreamingError'
        }
    });
};

export const isStreamingError = (error: unknown): error is IErrorType => {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as IErrorType;
    return (
        err.type === ERROR_KINDS.ExecutionError &&
        err.context !== undefined &&
        typeof err.context === 'object' &&
        err.context !== null &&
        'errorCategory' in err.context &&
        err.context.errorCategory === 'StreamingError' &&
        'streamDetails' in err.context &&
        typeof err.context.streamDetails === 'object'
    );
};

export const getStreamingErrorDetails = (error: IErrorType): IStreamingErrorDetails | undefined => {
    if (!isStreamingError(error)) return undefined;
    return error.context?.streamDetails as IStreamingErrorDetails;
};
