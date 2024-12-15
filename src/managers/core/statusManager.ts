/**
* @file statusManager.ts
* @path src/managers/core/statusManager.ts
* @description Core status management implementation with enhanced error handling
*
* @module @core
*/

// ─── External Imports ─────────────────────────────────────────────────────────

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { CallbackManager } from '@langchain/core/callbacks/manager';
import { BaseMessage } from '@langchain/core/messages';

// ─── Core Imports ─────────────────────────────────────────────────────────────

import { CoreManager } from './coreManager';
import { StatusValidator } from './statusValidator';
import { StatusHistoryManager } from './statusHistoryManager';
import { StatusReportManager } from './statusReportManager';
import { MetricsManager } from './metricsManager';

// ─── Enum and Utility Imports ─────────────────────────────────────────────────

import {
    MANAGER_CATEGORY_enum,
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    LLM_STATUS_enum,
    ERROR_SEVERITY_enum
} from '../../types/common/enumTypes';
import { createError, ERROR_KINDS, createErrorContext } from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';

// ─── Runtime Imports Declaration ───────────────────────────────────────────

declare interface _RuntimeImports {
    external: {
        langchain: {
            callbacks: {
                base: typeof BaseCallbackHandler;
                manager: typeof CallbackManager;
                params: {
                    llm: Serialized;
                    prompts: string[];
                    runId: `${string}-${number}`;
                    parentRunId: `${string}-${number}` | undefined;
                    extraParams: Record<string, unknown>;
                    output: LLMResult;
                    error: Error;
                    chain: Serialized;
                    inputs: ChainValues;
                    outputs: ChainValues;
                    tool: Serialized;
                    input: string;
                    text: string;
                    action: AgentAction;
                    finish: AgentFinish;
                    retriever: Serialized;
                    query: string;
                    tags: string[];
                    metadata: Record<string, unknown>;
                    name: string;
                    documents: DocumentInterface<Record<string, unknown>>[];
                    messages: BaseMessage[][];
                };
                types: {
                    Serialized: Serialized;
                    DocumentInterface: DocumentInterface;
                    AgentAction: AgentAction;
                    AgentFinish: AgentFinish;
                    LLMResult: LLMResult;
                    ChainValues: ChainValues;
                    Error: Error;
                    Record: Record<string, unknown>;
                    BaseMessage: typeof BaseMessage;
                };
            };
        };
    };
    managers: {
        core: {
            base: typeof CoreManager;
            status: {
                validator: typeof StatusValidator;
                history: typeof StatusHistoryManager;
                report: typeof StatusReportManager;
            };
        };
    };
    enums: {
        manager: typeof MANAGER_CATEGORY_enum;
        agent: typeof AGENT_STATUS_enum;
        message: typeof MESSAGE_STATUS_enum;
        task: typeof TASK_STATUS_enum;
        workflow: typeof WORKFLOW_STATUS_enum;
        llm: typeof LLM_STATUS_enum;
    };
    utils: {
        error: typeof createError;
        metadata: typeof createBaseMetadata;
    };
    types: {
        common: {
            base: IBaseHandlerMetadata;
            status: {
                IStatusEntity: IStatusEntity;
                IStatusType: IStatusType;
                IStatusChangeEvent: IStatusChangeEvent;
                IStatusTransitionContext: IStatusTransitionContext;
                IStatusManagerConfig: IStatusManagerConfig;
                IStatusChangeCallback: IStatusChangeCallback;
                IStatusTrendAnalysis: IStatusTrendAnalysis;
                IStatusImpactAssessment: IStatusImpactAssessment;
                IStatusDashboardMetrics: IStatusDashboardMetrics;
            };
            validation: {
                IStatusValidationResult: IStatusValidationResult;
            };
        };
    };
}

// ─── Type-Only Imports ───────────────────────────────────────────────────────

import type { Serialized } from '@langchain/core/load/serializable';
import type { DocumentInterface } from '@langchain/core/documents';
import type { AgentAction, AgentFinish } from '@langchain/core/agents';
import type { LLMResult } from '@langchain/core/outputs';
import type { ChainValues } from '@langchain/core/utils/types';

import type { IStatusValidationResult, IValidationResult } from '../../types/common/validationTypes';
import type {
    IStatusEntity,
    IStatusType,
    IStatusChangeEvent,
    IStatusTransitionContext,
    IStatusManagerConfig,
    IStatusChangeCallback,
    IStatusTrendAnalysis,
    IStatusImpactAssessment,
    IStatusDashboardMetrics
} from '../../types/common/statusTypes';
import type { IBaseHandlerMetadata } from '../../types/common/baseTypes';
import type { IErrorContext } from '../../types/common/errorTypes';
import type { IStatusChangeMetadata } from '../../types/common/metadataTypes';

// ─── Callback Handler Class ──────────────────────────────────────────────────

class StatusCallbackHandler extends BaseCallbackHandler {
    private statusManager: StatusManager;
    override readonly name = "status_callback_handler";

    constructor(statusManager: StatusManager) {
        super();
        this.statusManager = statusManager;
    }

    override get lc_namespace(): ["langchain_core", "callbacks", string] {
        return ["langchain_core", "callbacks", "status_handler"];
    }

    override get lc_secrets(): { [key: string]: string } | undefined {
        return undefined;
    }

    override get lc_attributes(): { [key: string]: string } | undefined {
        return undefined;
    }

    override async handleLLMStart(
        _llm: Serialized,
        _prompts: string[],
        _runId: string,
        _parentRunId?: string,
        _extraParams?: Record<string, unknown>
    ): Promise<any> {
        await this.statusManager.syncStatus('llm', 'default', LLM_STATUS_enum.ACTIVE);
    }

    override async handleLLMEnd(
        _output: LLMResult,
        _runId: string,
        _parentRunId?: string
    ): Promise<any> {
        await this.statusManager.syncStatus('llm', 'default', LLM_STATUS_enum.READY);
    }

    override async handleLLMError(
        error: Error,
        runId: string,
        parentRunId?: string
    ): Promise<any> {
        const errorContext: IErrorContext = {
            component: 'LLM',
            operation: 'execute',
            error,
            severity: ERROR_SEVERITY_enum.ERROR,
            recoverable: true,
            retryCount: 0,
            failureReason: error.message,
            recommendedAction: 'Retry with backoff',
            timestamp: Date.now()
        };

        await this.statusManager.syncStatus('llm', 'default', LLM_STATUS_enum.ERROR, errorContext);
    }

    override async handleChainStart(
        _chain: Serialized,
        _inputs: ChainValues,
        _runId: string,
        _parentRunId?: string
    ): Promise<any> {
        await this.statusManager.syncStatus('workflow', 'default', WORKFLOW_STATUS_enum.RUNNING);
    }

    override async handleChainEnd(
        _outputs: ChainValues,
        _runId: string,
        _parentRunId?: string
    ): Promise<any> {
        await this.statusManager.syncStatus('workflow', 'default', WORKFLOW_STATUS_enum.COMPLETED);
    }

    override async handleChainError(
        error: Error,
        runId: string,
        parentRunId?: string
    ): Promise<any> {
        const errorContext: IErrorContext = {
            component: 'Workflow',
            operation: 'execute',
            error,
            severity: ERROR_SEVERITY_enum.ERROR,
            recoverable: true,
            retryCount: 0,
            failureReason: error.message,
            recommendedAction: 'Check workflow configuration',
            timestamp: Date.now()
        };

        await this.statusManager.syncStatus('workflow', 'default', WORKFLOW_STATUS_enum.ERRORED, errorContext);
    }

    override async handleToolStart(
        _tool: Serialized,
        _input: string,
        _runId: string,
        _parentRunId?: string
    ): Promise<any> {
        await this.statusManager.syncStatus('agent', 'default', AGENT_STATUS_enum.USING_TOOL);
    }

    override async handleToolEnd(
        _output: string,
        _runId: string,
        _parentRunId?: string
    ): Promise<any> {
        await this.statusManager.syncStatus('agent', 'default', AGENT_STATUS_enum.USING_TOOL_END);
    }

    override async handleToolError(
        error: Error,
        runId: string,
        parentRunId?: string
    ): Promise<any> {
        const errorContext: IErrorContext = {
            component: 'Agent',
            operation: 'useTool',
            error,
            severity: ERROR_SEVERITY_enum.ERROR,
            recoverable: true,
            retryCount: 0,
            failureReason: error.message,
            recommendedAction: 'Check tool availability',
            timestamp: Date.now()
        };

        await this.statusManager.syncStatus('agent', 'default', AGENT_STATUS_enum.USING_TOOL_ERROR, errorContext);
    }

    override async handleText(
        _text: string,
        _runId: string,
        _parentRunId?: string
    ): Promise<void> {
        // No status update needed
    }

    override async handleAgentAction(
        _action: AgentAction,
        _runId: string,
        _parentRunId?: string
    ): Promise<void> {
        // No status update needed
    }

    override async handleAgentEnd(
        _action: AgentFinish,
        _runId: string,
        _parentRunId?: string
    ): Promise<void> {
        // No status update needed
    }

    override async handleRetrieverStart(
        _retriever: Serialized,
        _query: string,
        _runId: string,
        _parentRunId?: string,
        _tags?: string[],
        _metadata?: Record<string, unknown>,
        _name?: string
    ): Promise<any> {
        // No status update needed
    }

    override async handleRetrieverEnd(
        _documents: DocumentInterface<Record<string, unknown>>[],
        _runId: string,
        _parentRunId?: string,
        _tags?: string[]
    ): Promise<any> {
        // No status update needed
    }

    override async handleRetrieverError(
        _error: Error,
        _runId: string,
        _parentRunId?: string,
        _tags?: string[]
    ): Promise<any> {
        // No status update needed
    }

    override async handleChatModelStart(
        _llm: Serialized,
        _messages: BaseMessage[][],
        _runId: string,
        _parentRunId?: string,
        _extraParams?: Record<string, unknown>,
        _tags?: string[],
        _metadata?: Record<string, unknown>,
        _runName?: string
    ): Promise<any> {
        await this.statusManager.syncStatus('llm', 'default', LLM_STATUS_enum.ACTIVE);
    }
}

// ─── Status Manager Class ─────────────────────────────────────────────────────

export class StatusManager extends CoreManager {
    private static instance: StatusManager | null = null;
    private readonly validator: StatusValidator;
    private readonly subscribers: Map<string, Set<IStatusChangeCallback>>;
    private readonly config: Required<IStatusManagerConfig>;
    private readonly langchainCallbackManager: CallbackManager;
    private readonly statusSyncMap: Map<string, Map<string, IStatusType>>;
    private readonly historyManager: StatusHistoryManager;
    private readonly reportManager: StatusReportManager;
    protected readonly metricsManager: MetricsManager;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor(config: IStatusManagerConfig) {
        super();
        if (!config.entity) {
            const error = createError({
                message: 'StatusManager requires an entity type',
                type: ERROR_KINDS.ValidationError,
                context: { config }
            });
            this.handleError(error, 'StatusManager.constructor');
            throw error;
        }

        this.validator = StatusValidator.getInstance();
        this.subscribers = new Map();
        this.statusSyncMap = new Map();
        this.langchainCallbackManager = new CallbackManager();
        this.historyManager = StatusHistoryManager.getInstance();
        this.reportManager = StatusReportManager.getInstance();
        this.metricsManager = MetricsManager.getInstance();
        this.config = {
            entity: config.entity,
            initialStatus: config.initialStatus || this.getDefaultInitialStatus(config.entity),
            transitions: config.transitions || [],
            onChange: config.onChange || (() => {}),
            enableHistory: config.enableHistory ?? true,
            maxHistoryLength: config.maxHistoryLength ?? 1000,
            validationTimeout: config.validationTimeout ?? 5000,
            allowConcurrentTransitions: config.allowConcurrentTransitions ?? false
        };

        this.initializeLangchainCallbacks();
    }

    public static getInstance(config?: IStatusManagerConfig): StatusManager {
        if (!StatusManager.instance && !config) {
            const error = createError({
                message: 'Initial configuration is required for StatusManager',
                type: ERROR_KINDS.ConfigurationError,
                context: { config }
            });
            throw error;
        }
        if (!StatusManager.instance && config) {
            StatusManager.instance = new StatusManager(config);
        }
        return StatusManager.instance!;
    }

    private initializeLangchainCallbacks(): void {
        this.langchainCallbackManager.addHandler(new StatusCallbackHandler(this));
    }

    public async syncStatus(
        entity: IStatusEntity,
        entityId: string,
        status: IStatusType,
        errorContext?: IErrorContext
    ): Promise<void> {
        try {
            if (!this.statusSyncMap.has(entity)) {
                this.statusSyncMap.set(entity, new Map());
            }

            const entityMap = this.statusSyncMap.get(entity)!;
            const currentStatus = entityMap.get(entityId);

            if (currentStatus !== status) {
                entityMap.set(entityId, status);

                const context: IStatusTransitionContext = {
                    entity,
                    entityId,
                    currentStatus: currentStatus || this.getDefaultInitialStatus(entity),
                    targetStatus: status,
                    operation: 'sync',
                    phase: 'execution',
                    startTime: Date.now(),
                    duration: 0,
                    resourceMetrics: await this.metricsManager.getInitialResourceMetrics(),
                    performanceMetrics: await this.metricsManager.getInitialPerformanceMetrics(),
                    metadata: createBaseMetadata('StatusManager', 'sync'),
                    errorContext
                };

                await this.transition(context);
            }
        } catch (error) {
            const errorCtx = createErrorContext({
                component: 'StatusManager',
                operation: 'syncStatus',
                error: error instanceof Error ? error : new Error(String(error)),
                severity: ERROR_SEVERITY_enum.ERROR,
                recoverable: true,
                retryCount: 0,
                failureReason: 'Failed to sync status',
                recommendedAction: 'Check status transition rules',
                details: { entity, entityId, status }
            });

            this.handleError(
                createError({
                    message: 'Status sync failed',
                    type: ERROR_KINDS.ExecutionError,
                    severity: ERROR_SEVERITY_enum.ERROR,
                    context: errorCtx
                }),
                'StatusManager.syncStatus'
            );
            throw error;
        }
    }

    public async transition(context: IStatusTransitionContext): Promise<boolean> {
        context.phase = 'pre-execution';

        const result = await this.safeExecute(async () => {
            this.validateTransitionContext(context);

            try {
                context.phase = 'execution';

                const validationResult = await this.validateTransition(context);
                if (!validationResult.isValid) {
                    this.handleError(
                        createError({
                            message: validationResult.errors?.join(', ') || 'Invalid status transition',
                            type: ERROR_KINDS.ValidationError,
                            context: {
                                entity: context.entity,
                                entityId: context.entityId,
                                transition: `${context.currentStatus} -> ${context.targetStatus}`
                            }
                        }),
                        'StatusManager.transition',
                        ERROR_KINDS.ValidationError
                    );
                    throw new Error(validationResult.errors?.join(', ') || 'Invalid status transition');
                }

                const baseMetadata = createBaseMetadata('StatusManager', context.operation);
                const metadata: Readonly<IStatusChangeMetadata> = {
                    ...baseMetadata,
                    timestamp: Date.now(),
                    component: this.constructor.name,
                    operation: context.operation,
                    performance: await this.metricsManager.getInitialPerformanceMetrics(),
                    entity: {
                        type: context.entity,
                        id: context.entityId,
                        name: context.entityId
                    },
                    transition: {
                        from: context.currentStatus,
                        to: context.targetStatus,
                        reason: context.errorContext?.failureReason || 'Normal transition',
                        triggeredBy: this.constructor.name
                    },
                    validation: validationResult,
                    resources: await this.metricsManager.getInitialResourceMetrics(),
                    context: {
                        source: 'StatusManager',
                        target: context.operation,
                        correlationId: Date.now().toString(),
                        causationId: Date.now().toString(),
                        taskId: '',
                        taskName: '',
                        agentId: '',
                        agentName: '',
                        workflowId: '',
                        messageId: '',
                        phase: context.phase,
                        duration: context.duration
                    }
                };

                const event: Readonly<IStatusChangeEvent> = {
                    id: `${context.entity}-${context.entityId}-${Date.now()}`,
                    type: 'status-change',
                    timestamp: Date.now(),
                    entity: context.entity,
                    entityId: context.entityId,
                    from: context.currentStatus,
                    to: context.targetStatus,
                    metadata: context.errorContext ? { ...metadata, errorContext: context.errorContext } : metadata,
                    validationResult
                };

                if (this.config.enableHistory) {
                    await this.historyManager.recordTransition(context, event);
                }

                await this.reportManager.handleStatusChange(event);

                context.phase = 'post-execution';
                context.duration = Date.now() - context.startTime;

                await this.notifySubscribers(context.entity, event);
                this.config.onChange(event);

                return true;
            } catch (error) {
                context.phase = 'error';
                context.duration = Date.now() - context.startTime;
                throw error;
            }
        }, 'Status transition');

        return result.success && result.data === true;
    }

    public async validateTransition(context: IStatusTransitionContext): Promise<IStatusValidationResult> {
        const result = await this.safeExecute(async () => {
            const timeoutPromise = new Promise<IStatusValidationResult>((_, reject) => {
                setTimeout(() => {
                    reject(createError({
                        message: 'Validation timeout',
                        type: ERROR_KINDS.TimeoutError,
                        context: {
                            entity: context.entity,
                            entityId: context.entityId,
                            transition: `${context.currentStatus} -> ${context.targetStatus}`,
                            timeout: this.config.validationTimeout
                        }
                    }));
                }, this.config.validationTimeout);
            });

            const validationPromise = this.validator.validateTransition(context);
            const validationResult = await Promise.race([validationPromise, timeoutPromise]);

            if (this.isErrorState(context.targetStatus)) {
                if (!context.errorContext) {
                    validationResult.errors.push('Error state transition without error context');
                }

                if (context.errorContext) {
                    const errorContextValidation = await this.validateErrorContext(context.errorContext);
                    validationResult.errors.push(...errorContextValidation.errors);
                    validationResult.warnings.push(...errorContextValidation.warnings);
                }
            }

            return validationResult;
        }, 'Validate transition');

        if (!result.success) {
            return {
                isValid: false,
                errors: [result.error?.message || 'Validation failed'],
                warnings: [],
                metadata: {
                    timestamp: Date.now(),
                    duration: 0,
                    validatorName: 'StatusManager'
                }
            };
        }

        return result.data || {
            isValid: false,
            errors: ['Validation result was undefined'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'StatusManager'
            }
        };
    }

    private isErrorState(status: IStatusType): boolean {
        return status.includes('ERROR') || 
               status === TASK_STATUS_enum.ERROR ||
               status === WORKFLOW_STATUS_enum.ERRORED ||
               String(status) === String(LLM_STATUS_enum.ERROR);
    }

    private async validateErrorContext(errorContext: IErrorContext): Promise<IValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!errorContext.error) {
            errors.push('Error object is required in error context');
        }

        if (!errorContext.severity) {
            warnings.push('Error severity not specified');
        }

        if (!errorContext.failureReason) {
            warnings.push('Failure reason not specified');
        }

        if (!errorContext.recommendedAction) {
            warnings.push('Recommended action not specified');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'StatusManager'
            }
        };
    }

    private validateTransitionContext(context: IStatusTransitionContext): void {
        if (!context.entityId) {
            const error = createError({
                message: `EntityId is required for ${context.entity} status transition`,
                type: ERROR_KINDS.ValidationError,
                context: {
                    entity: context.entity,
                    providedContext: context
                }
            });
            this.handleError(error, 'StatusManager.validateTransitionContext');
            throw error;
        }

        if (!context.operation) {
            const error = createError({
                message: 'Operation is required for status transition',
                type: ERROR_KINDS.ValidationError,
                context: { entity: context.entity, entityId: context.entityId }
            });
            this.handleError(error, 'StatusManager.validateTransitionContext');
            throw error;
        }

        if (!context.startTime) {
            const error = createError({
                message: 'Start time is required for status transition',
                type: ERROR_KINDS.ValidationError,
                context: { entity: context.entity, entityId: context.entityId }
            });
            this.handleError(error, 'StatusManager.validateTransitionContext');
            throw error;
        }
    }

    private getDefaultInitialStatus(entity: IStatusEntity): IStatusType {
        const defaultStatuses: Record<IStatusEntity, IStatusType> = {
            'agent': 'INITIAL',
            'message': 'INITIAL',
            'task': 'PENDING',
            'workflow': 'INITIAL',
            'feedback': 'PENDING',
            'llm': 'INITIALIZING'
        };
        return defaultStatuses[entity];
    }

    private async notifySubscribers(entity: IStatusEntity, event: IStatusChangeEvent): Promise<void> {
        const subscribers = this.subscribers.get(entity);
        if (!subscribers) return;

        const notifications = Array.from(subscribers).map(async callback => {
            try {
                await callback(event);
            } catch (error) {
                const errorContext = createErrorContext({
                    component: 'StatusManager',
                    operation: 'notifySubscribers',
                    error: error instanceof Error ? error : new Error(String(error)),
                    severity: ERROR_SEVERITY_enum.ERROR,
                    recoverable: true,
                    retryCount: 0,
                    failureReason: 'Status change callback failed',
                    recommendedAction: 'Check subscriber implementation',
                    details: { entity, event }
                });

                this.handleError(
                    createError({
                        message: 'Error in status change callback',
                        type: ERROR_KINDS.ExecutionError,
                        severity: ERROR_SEVERITY_enum.ERROR,
                        context: errorContext
                    }),
                    'StatusManager.notifySubscribers'
                );
            }
        });

        await Promise.all(notifications);
    }

    public subscribe(entity: IStatusEntity, callback: IStatusChangeCallback): () => void {
        const subscribers = this.subscribers.get(entity) || new Set();
        subscribers.add(callback);
        this.subscribers.set(entity, subscribers);

        return () => {
            const subs = this.subscribers.get(entity);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(entity);
                }
            }
        };
    }

    public async getDashboardMetrics(entity?: IStatusEntity): Promise<IStatusDashboardMetrics | Record<IStatusEntity, IStatusDashboardMetrics>> {
        return await this.reportManager.getDashboardMetrics(entity);
    }

    public async analyzeTrends(
        entity: IStatusEntity,
        timeRange: { start: number; end: number }
    ): Promise<IStatusTrendAnalysis> {
        return await this.reportManager.analyzeTrends(entity, timeRange);
    }

    public async assessImpact(entity: IStatusEntity, status: IStatusType): Promise<IStatusImpactAssessment> {
        return await this.reportManager.assessImpact(entity, status);
    }

    public getLangchainCallbackManager(): CallbackManager {
        return this.langchainCallbackManager;
    }
}

// ─── Export Singleton Instance ───────────────────────────────────────────────

export default StatusManager.getInstance();
