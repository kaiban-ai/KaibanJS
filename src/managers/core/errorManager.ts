/**
 * @file errorManager.ts
 * @path src/managers/core/errorManager.ts
 * @description Core error handling with basic logging
 */

import { CoreManager } from './coreManager';
import { LogManager } from './logManager';
import { StatusManager } from './statusManager';
import { MANAGER_CATEGORY_enum, TASK_STATUS_enum, ERROR_SEVERITY_enum } from '../../types/common/enumTypes';
import { 
    createError,
    ERROR_KINDS,
    type IErrorKind,
    type IBaseError
} from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';

// Type imports
import type { IBaseHandlerMetadata } from '../../types/common/baseTypes';
import type { IErrorMetrics } from '../../types/metrics/base/errorMetrics';

export class ErrorManager extends CoreManager {
    private static instance: ErrorManager;
    protected readonly logManager: LogManager;
    protected readonly statusManager: StatusManager;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.logManager = LogManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.registerDomainManager('ErrorManager', this);
    }

    public static getInstance(): ErrorManager {
        if (!ErrorManager.instance) {
            ErrorManager.instance = new ErrorManager();
        }
        return ErrorManager.instance;
    }

    public override async handleError(error: unknown, errorContext: string, errorType: IErrorKind = ERROR_KINDS.SystemError): Promise<void> {
        try {
            const baseError = this.normalizeError(error);
            const baseMetadata = createBaseMetadata(this.constructor.name, 'handleError');

            // Create basic error metrics
            const errorMetrics: IErrorMetrics = {
                count: 1,
                type: errorType,
                severity: ERROR_SEVERITY_enum.ERROR,
                timestamp: Date.now(),
                message: baseError.message
            };

            // Update system status
            await this.statusManager.transition({
                entity: 'task',
                entityId: errorType,
                currentStatus: TASK_STATUS_enum.PENDING,
                targetStatus: TASK_STATUS_enum.ERROR,
                operation: 'handleError',
                phase: 'execution',
                startTime: Date.now(),
                duration: 0,
                metadata: {
                    context: errorContext,
                    severity: ERROR_SEVERITY_enum.ERROR,
                    timestamp: Date.now()
                }
            });

            // Create error metadata
            const errorMetadata: IBaseHandlerMetadata = {
                ...baseMetadata,
                message: baseError.message,
                metadata: {
                    type: errorType,
                    errorContext,
                    originalError: error instanceof Error ? error : undefined,
                    timestamp: Date.now(),
                    metrics: errorMetrics
                }
            };

            // Log the error with context
            this.logManager.log(
                `${errorType} in ${errorContext}: ${baseError.message}`,
                'error',
                errorMetadata
            );

        } catch (handlingError) {
            this.logManager.log(
                'Error handling error',
                'error',
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
                type: ERROR_KINDS.UnknownError,
                context: {
                    originalError: error
                }
            });
        }

        return createError({
            message: String(error),
            type: ERROR_KINDS.UnknownError,
            context: { originalError: error }
        });
    }

    private isBaseError(error: unknown): error is IBaseError {
        if (typeof error !== 'object' || error === null) return false;
        const e = error as Partial<IBaseError>;
        return !!(
            typeof e.message === 'string' &&
            typeof e.type === 'string'
        );
    }
}

export default ErrorManager.getInstance();
