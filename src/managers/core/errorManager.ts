/**
 * @file errorManager.ts
 * @path src/managers/core/errorManager.ts
 * @description Core error handling and management
 */

import { CoreManager } from './coreManager';
import { createError } from '../../types/common/commonErrorTypes';
import { MetadataFactory } from '../../utils/factories/metadataFactory';
import { LogManager } from './logManager';

import type { IBaseError, IErrorKind } from '../../types/common/commonErrorTypes';
import type { ILLMUsageMetrics } from '../../types/llm/llmMetricTypes';

// ─── Error Manager Implementation ────────────────────────────────────────────

export class ErrorManager extends CoreManager {
    private static instance: ErrorManager;
    readonly logManager: LogManager;

    private constructor() {
        super();
        this.logManager = LogManager.getInstance();
        this.registerDomainManager('ErrorManager', this);
    }

    public static getInstance(): ErrorManager {
        if (!ErrorManager.instance) {
            ErrorManager.instance = new ErrorManager();
        }
        return ErrorManager.instance;
    }

    public override handleError(error: unknown, context: string, errorType: IErrorKind = 'SystemError'): void {
        try {
            const baseError = this.normalizeError(error);
            const errorMetadata = {
                component: this.constructor.name,
                operation: 'handleError',
                message: baseError.message,
                metadata: {
                    type: errorType,
                    context,
                    originalError: error instanceof Error ? error : undefined,
                    timestamp: Date.now()
                }
            };

            this.logManager.log(
                this.constructor.name,
                'handleError',
                `${errorType}: ${baseError.message}`,
                errorMetadata
            );
        } catch (handlingError) {
            this.logManager.log(
                this.constructor.name,
                'handleError',
                'Error handling error',
                {
                    error: handlingError,
                    timestamp: Date.now()
                }
            );
            throw handlingError;
        }
    }

    private normalizeError(error: unknown): IBaseError {
        if (this.isBaseError(error)) {
            return error;
        }

        if (error instanceof Error) {
            return createError({
                message: error.message,
                type: 'UnknownError',
                context: {
                    originalError: error
                }
            });
        }

        return createError({
            message: String(error),
            type: 'UnknownError',
            context: { originalError: error }
        });
    }

    private isBaseError(error: unknown): error is IBaseError {
        if (typeof error !== 'object' || error === null) return false;
        const e = error as Partial<IBaseError>;
        return (
            typeof e.name === 'string' &&
            typeof e.message === 'string' &&
            typeof e.type === 'string'
        );
    }

    private createDefaultLLMMetrics(): ILLMUsageMetrics {
        return {
            totalRequests: 0,
            activeInstances: 0,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseLength: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: 0
            },
            tokenDistribution: {
                prompt: 0,
                completion: 0,
                total: 0
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 0
            },
            timestamp: Date.now()
        };
    }
}

export default ErrorManager.getInstance();
