/**
 * @file statusManager.ts
 * @description Core status management implementation with event-driven architecture and optimized metrics
 */

import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Serialized } from '@langchain/core/load/serializable';
import { LLMResult } from '@langchain/core/outputs';
import { ChainValues } from '@langchain/core/utils/types';
import { v4 as uuidv4 } from 'uuid';
import { CoreManager } from './coreManager';
import { StatusValidator } from './statusValidator';
import { StatusReportManager } from './statusReportManager';
import { MetricsManager } from './metricsManager';
import { BaseEventEmitter } from './eventEmitter';
import { LogEventEmitter } from './logEventEmitter';
import { TransitionUtils } from './transitionRules';

import {
    MANAGER_CATEGORY_enum,
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    LLM_STATUS_enum,
    ERROR_SEVERITY_enum
} from '../../types/common/enumTypes';

import { createError, ERROR_KINDS } from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';

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

import type { IStatusValidationResult } from '../../types/common/validationTypes';
import type { IErrorContext } from '../../types/common/errorTypes';
import type { IStatusChangeMetadata } from '../../types/common/metadataTypes';

export class StatusManager extends CoreManager {
    private static instance: StatusManager | null = null;
    protected readonly validator: StatusValidator;
    protected readonly subscribers: Map<string, Set<IStatusChangeCallback>>;
    protected readonly config: Required<IStatusManagerConfig>;
    protected readonly langchainCallbackManager: CallbackManager;
    protected readonly statusSyncMap: Map<string, Map<string, IStatusType>>;
    protected readonly reportManager: StatusReportManager;
    protected readonly metricsManager: MetricsManager;
    protected readonly eventEmitter: BaseEventEmitter;
    protected readonly logEmitter: LogEventEmitter;

    public readonly category = MANAGER_CATEGORY_enum.CORE;

    private constructor(config: IStatusManagerConfig) {
        super();
        if (!config.entity) {
            throw createError({
                message: 'StatusManager requires an entity type',
                type: ERROR_KINDS.ValidationError,
                context: { config }
            });
        }

        this.validator = StatusValidator.getInstance();
        this.subscribers = new Map();
        this.statusSyncMap = new Map();
        this.langchainCallbackManager = new CallbackManager();
        this.reportManager = StatusReportManager.getInstance();
        this.metricsManager = MetricsManager.getInstance();
        this.eventEmitter = BaseEventEmitter.getInstance();
        this.logEmitter = LogEventEmitter.getInstance();

        this.config = {
            entity: config.entity,
            initialStatus: config.initialStatus || this.getDefaultInitialStatus(config.entity),
            transitions: config.transitions || [],
            onChange: config.onChange || (() => {}),
            validationTimeout: config.validationTimeout ?? 5000,
            allowConcurrentTransitions: config.allowConcurrentTransitions ?? false,
            enableHistory: config.enableHistory ?? true,
            maxHistoryLength: config.maxHistoryLength ?? 1000
        };

        this.initializeLangchainCallbacks();
        this.registerDomainManager('StatusManager', this);
    }

    public static getInstance(config?: IStatusManagerConfig): StatusManager {
        if (!StatusManager.instance && !config) {
            throw createError({
                message: 'Initial configuration is required for StatusManager',
                type: ERROR_KINDS.ConfigurationError,
                context: { config }
            });
        }
        if (!StatusManager.instance && config) {
            StatusManager.instance = new StatusManager(config);
        }
        return StatusManager.instance!;
    }

    private getDefaultInitialStatus(entity: IStatusEntity): IStatusType {
        const defaultStatuses: Record<IStatusEntity, IStatusType> = {
            'agent': AGENT_STATUS_enum.INITIAL,
            'message': MESSAGE_STATUS_enum.INITIAL,
            'task': TASK_STATUS_enum.PENDING,
            'workflow': WORKFLOW_STATUS_enum.INITIAL,
            'feedback': 'PENDING',
            'llm': LLM_STATUS_enum.INITIALIZING
        };
        return defaultStatuses[entity];
    }

    public async transition(context: IStatusTransitionContext): Promise<boolean> {
        context.phase = 'pre-execution';
        const startTime = Date.now();

        try {
            this.validateTransitionContext(context);
            const validationResult = await this.validateTransition(context);

            if (!validationResult.isValid) {
                throw createError({
                    message: validationResult.errors?.join(', ') || 'Invalid status transition',
                    type: ERROR_KINDS.ValidationError,
                    context: {
                        entity: context.entity,
                        entityId: context.entityId,
                        transition: `${context.currentStatus} -> ${context.targetStatus}`
                    }
                });
            }

            const statusEvent = await this.createTransitionEvent(context, validationResult);
            await this.eventEmitter.emit(statusEvent);

            await this.metricsManager.trackMetric({
                domain: MetricDomain.SYSTEM,
                type: MetricType.CUSTOM,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    entity: statusEvent.entity,
                    entityId: statusEvent.entityId,
                    from: statusEvent.from,
                    to: statusEvent.to,
                    transitionId: statusEvent.id,
                    duration: Date.now() - startTime
                }
            });

            await this.reportManager.handleStatusChange(statusEvent);
            context.phase = 'post-execution';
            context.duration = Date.now() - startTime;

            await this.notifySubscribers(context.entity, statusEvent);
            this.config.onChange(statusEvent);

            return true;
        } catch (error) {
            context.phase = 'error';
            context.duration = Date.now() - startTime;

            await this.metricsManager.trackMetric({
                domain: MetricDomain.SYSTEM,
                type: MetricType.ERROR,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    entity: context.entity,
                    entityId: context.entityId,
                    error: error instanceof Error ? error.message : String(error),
                    duration: Date.now() - startTime
                }
            });

            throw error;
        }
    }

    public async syncStatus(
        entity: IStatusEntity,
        entityId: string,
        status: IStatusType,
        errorContext?: IErrorContext,
        metadata?: Record<string, unknown>
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
                    metadata: {
                        ...createBaseMetadata('StatusManager', 'sync'),
                        ...metadata
                    },
                    errorContext
                };

                await this.transition(context);
            }
        } catch (error) {
            const errorCtx: IErrorContext = {
                component: 'StatusManager',
                operation: 'syncStatus',
                error: error instanceof Error ? error : new Error(String(error)),
                severity: ERROR_SEVERITY_enum.ERROR,
                recoverable: true,
                retryCount: 0,
                failureReason: 'Failed to sync status',
                recommendedAction: 'Check status transition rules',
                timestamp: Date.now(),
                details: { entity, entityId, status }
            };

            throw createError({
                message: 'Status sync failed',
                type: ERROR_KINDS.ExecutionError,
                severity: ERROR_SEVERITY_enum.ERROR,
                context: errorCtx
            });
        }
    }

    public async validateTransition(context: IStatusTransitionContext): Promise<IStatusValidationResult> {
        const validationPromise = this.validator.validateTransition(context);
        const timeoutPromise = new Promise<never>((_, reject) => {
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

        return Promise.race([validationPromise, timeoutPromise]);
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
        return this.reportManager.getDashboardMetrics(entity);
    }

    public async analyzeTrends(entity: IStatusEntity, timeRange: { start: number; end: number }): Promise<IStatusTrendAnalysis> {
        return this.reportManager.analyzeTrends(entity, timeRange);
    }

    public async assessImpact(entity: IStatusEntity, status: IStatusType): Promise<IStatusImpactAssessment> {
        return this.reportManager.assessImpact(entity, status);
    }

    private validateTransitionContext(context: IStatusTransitionContext): void {
        if (!context.entityId) {
            throw createError({
                message: `EntityId is required for ${context.entity} status transition`,
                type: ERROR_KINDS.ValidationError,
                context: { entity: context.entity, providedContext: context }
            });
        }

        if (!context.operation) {
            throw createError({
                message: 'Operation is required for status transition',
                type: ERROR_KINDS.ValidationError,
                context: { entity: context.entity, entityId: context.entityId }
            });
        }

        if (!context.startTime) {
            throw createError({
                message: 'Start time is required for status transition',
                type: ERROR_KINDS.ValidationError,
                context: { entity: context.entity, entityId: context.entityId }
            });
        }
    }

    private async createTransitionEvent(
        context: IStatusTransitionContext,
        validationResult: IStatusValidationResult
    ): Promise<IStatusChangeEvent> {
        const metadata: IStatusChangeMetadata = {
            ...createBaseMetadata('StatusManager', context.operation),
            timestamp: Date.now(),
            component: this.constructor.name,
            operation: context.operation,
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
            context: {
                source: 'StatusManager',
                target: context.operation,
                correlationId: uuidv4(),
                causationId: uuidv4(),
                phase: context.phase,
                duration: context.duration
            }
        };

        return {
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
    }

    private async notifySubscribers(entity: IStatusEntity, event: IStatusChangeEvent): Promise<void> {
        const subscribers = this.subscribers.get(entity);
        if (!subscribers) return;

        await Promise.all(
            Array.from(subscribers).map(callback => callback(event).catch(error => {
                throw createError({
                    message: 'Error in status change callback',
                    type: ERROR_KINDS.ExecutionError,
                    context: { entity, event, error }
                });
            }))
        );
    }

    private initializeLangchainCallbacks(): void {
        this.langchainCallbackManager.setHandler({
            handleLLMStart: async (llm: BaseChatModel, prompts: string[]) => {
                await this.syncStatus('llm', 'default', LLM_STATUS_enum.ACTIVE);
            },
            handleLLMEnd: async (output: LLMResult) => {
                await this.syncStatus('llm', 'default', LLM_STATUS_enum.READY);
            },
            handleLLMError: async (error: Error) => {
                await this.syncStatus('llm', 'default', LLM_STATUS_enum.ERROR, {
                    error,
                    component: 'LLM',
                    operation: 'execute',
                    severity: ERROR_SEVERITY_enum.ERROR,
                    timestamp: Date.now()
                });
            },
            handleChainStart: async (chain: Serialized, inputs: ChainValues) => {
                await this.syncStatus('workflow', 'default', WORKFLOW_STATUS_enum.RUNNING);
            },
            handleChainEnd: async (outputs: ChainValues) => {
                await this.syncStatus('workflow', 'default', WORKFLOW_STATUS_enum.COMPLETED);
            },
            handleChainError: async (error: Error) => {
                await this.syncStatus('workflow', 'default', WORKFLOW_STATUS_enum.ERRORED, {
                    error,
                    component: 'Workflow',
                    operation: 'execute',
                    severity: ERROR_SEVERITY_enum.ERROR,
                    timestamp: Date.now()
                });
            },
            handleToolStart: async (tool: Serialized, input: string) => {
                await this.syncStatus('agent', 'default', AGENT_STATUS_enum.USING_TOOL);
            },
            handleToolEnd: async (output: string) => {
                await this.syncStatus('agent', 'default', AGENT_STATUS_enum.USING_TOOL_END);
            },
            handleToolError: async (error: Error) => {
                await this.syncStatus('agent', 'default', AGENT_STATUS_enum.USING_TOOL_ERROR, {
                    error,
                    component: 'Agent',
                    operation: 'useTool',
                    severity: ERROR_SEVERITY_enum.ERROR,
                    timestamp: Date.now()
                });
            },
            handleChatModelStart: async (
                llm: Serialized,
                messages: BaseMessage[][],
                runId: string,
                parentRunId?: string,
                extraParams?: Record<string, unknown>
            ): Promise<void> => {
                if (!TransitionUtils.isTransitionAllowed('llm', LLM_STATUS_enum.READY, LLM_STATUS_enum.ACTIVE)) {
                    this.logEmitter.warn('Invalid LLM transition attempted', {
                        from: LLM_STATUS_enum.READY,
                        to: LLM_STATUS_enum.ACTIVE,
                        runId,
                        parentRunId
                    });
                    return;
                }

                const metadata = {
                    llm: {
                        name: llm.name,
                        type: llm.type,
                        config: extraParams
                    },
                    messages: messages.length,
                    correlationId: runId,
                    causationId: parentRunId
                };

                await this.syncStatus('llm', 'default', LLM_STATUS_enum.ACTIVE, undefined, metadata);
            }
        });
    }

    public getLangchainCallbackManager(): CallbackManager {
        return this.langchainCallbackManager;
    }
}

export default StatusManager.getInstance();