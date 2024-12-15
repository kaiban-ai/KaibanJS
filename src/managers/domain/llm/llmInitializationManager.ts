/**
 * @file llmInitializationManager.ts
 * @path src/managers/domain/llm/llmInitializationManager.ts
 * @description Manages LLM initialization and instance lifecycle
 */

import { CoreManager } from '../../core/coreManager';
import { LLMMetricsCollector } from '../../../metrics/LLMMetricsCollector';
import { createError } from '../../../types/common/commonErrorTypes';
import { generateId } from '../../../utils/common';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { llmAgentFactory } from './agent/llmAgentFactory';

import type { ILLMInstance, ILLMInstanceOptions } from '../../../types/llm/llmInstanceTypes';
import type { LLMProviderConfig } from '../../../types/llm/llmProviderTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { IInitMetrics, IInitStep } from '../../../types/metrics/base/initMetrics';
import type { ILLMMetrics } from '../../../types/llm/llmMetricTypes';
import type { IStatusTransitionContext, IStatusEntity } from '../../../types/common/commonStatusTypes';
import { LLM_STATUS_enum } from '../../../types/common/commonEnums';

/**
 * Manages LLM initialization and lifecycle
 */
export class LLMInitializationManager extends CoreManager {
    private static instance: LLMInitializationManager | null = null;
    private readonly metricsCollector: LLMMetricsCollector;
    private readonly activeInstances: Map<string, ILLMInstance>;
    private readonly initMetrics: Map<string, IInitMetrics>;
    protected metrics: ILLMMetrics;

    private constructor() {
        super();
        this.metricsCollector = new LLMMetricsCollector();
        this.activeInstances = new Map();
        this.initMetrics = new Map();
        this.metrics = this.metricsCollector.createDefaultMetrics();
    }

    public static getInstance(): LLMInitializationManager {
        if (!LLMInitializationManager.instance) {
            LLMInitializationManager.instance = new LLMInitializationManager();
        }
        return LLMInitializationManager.instance;
    }

    /**
     * Initialize a new LLM instance
     */
    public async initializeLangchainModel(config: LLMProviderConfig): Promise<IHandlerResult<ILLMInstance>> {
        return await this.safeExecute(async () => {
            const metrics = this.createInitMetrics();
            let instance: ILLMInstance | undefined;
            
            try {
                // Add validation step
                const validationStep = await this.executeInitStep(metrics, 'validation', async () => {
                    await this.validateConfig(config);
                });
                if (!validationStep.success) throw validationStep.error;

                // Add agent creation step
                const agentStep = await this.executeInitStep(metrics, 'agent_creation', async () => {
                    return await this.createAgent(config);
                });
                if (!agentStep.success) throw agentStep.error;

                // Add instance creation step
                const instanceStep = await this.executeInitStep(metrics, 'instance_creation', async () => {
                    instance = await this.createLLMInstance(agentStep.result!, config);
                    return instance;
                });
                if (!instanceStep.success) throw instanceStep.error;

                // Add state synchronization step
                const syncStep = await this.executeInitStep(metrics, 'state_sync', async () => {
                    await this.syncState(instance!);
                });
                if (!syncStep.success) throw syncStep.error;

                // Track initialization completion
                this.trackInitialization(instance!.id, metrics);
                
                return instance!;
            } catch (error) {
                // Cleanup on error
                if (instance) {
                    await this.cleanup(instance.id);
                }
                const errorContext = this.handleInitError(error, config);
                throw createError(errorContext);
            }
        }, 'LLM initialization');
    }

    /**
     * Execute initialization step with metrics tracking
     */
    private async executeInitStep<T>(
        metrics: IInitMetrics,
        name: string,
        operation: () => Promise<T>
    ): Promise<IInitStep & { result?: T }> {
        const step: IInitStep = {
            name,
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
            success: false,
            metadata: {}
        };

        try {
            const result = await operation();
            step.success = true;
            step.endTime = Date.now();
            step.duration = step.endTime - step.startTime;
            metrics.steps.push(step);
            return { ...step, result };
        } catch (error) {
            step.success = false;
            step.error = error instanceof Error ? error : new Error(String(error));
            step.endTime = Date.now();
            step.duration = step.endTime - step.startTime;
            metrics.steps.push(step);
            return step;
        }
    }

    /**
     * Validate LLM configuration
     */
    private async validateConfig(config: LLMProviderConfig): Promise<void> {
        const validationManager = this.getDomainManager<any>('configValidation');
        const validationResult = await validationManager.validateLangchainSchema(config);
        
        if (!validationResult.isValid) {
            throw createError({
                message: 'Invalid LLM configuration',
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    config,
                    errors: validationResult.errors
                }
            });
        }
    }

    /**
     * Create a new agent instance
     */
    private async createAgent(config: LLMProviderConfig): Promise<any> {
        return llmAgentFactory.createAgent({
            llmConfig: config,
            messageHistory: this.getDomainManager<any>('message').createMessageHistory(),
            metricsCollector: this.metricsCollector
        });
    }

    /**
     * Create a new LLM instance with tracking
     */
    private async createLLMInstance(
        agent: any, 
        config: LLMProviderConfig
    ): Promise<ILLMInstance> {
        const instance: ILLMInstance = {
            id: generateId(),
            provider: config.provider,
            config,
            metrics: await agent.getMetrics(),
            status: LLM_STATUS_enum.INITIALIZING,
            lastUsed: Date.now(),
            errorCount: 0,
            // Delegate all required methods to the agent
            generate: (...args) => agent.generate(...args),
            generateStream: (...args) => agent.generateStream(...args),
            validateConfig: (...args) => agent.validateConfig(...args),
            cleanup: (...args) => agent.cleanup(...args),
            getMetrics: (...args) => agent.getMetrics(...args),
            getStatus: (...args) => agent.getStatus(...args),
            reset: (...args) => agent.reset(...args)
        };

        this.activeInstances.set(instance.id, instance);
        return instance;
    }

    /**
     * Track initialization metrics
     */
    private trackInitialization(instanceId: string, metrics: IInitMetrics): void {
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        this.initMetrics.set(instanceId, metrics);
    }

    /**
     * Sync instance state with event system
     */
    private async syncState(instance: ILLMInstance): Promise<void> {
        const startTime = Date.now();
        const statusTransition: IStatusTransitionContext = {
            entity: 'llm' as IStatusEntity,
            entityId: instance.id,
            currentStatus: instance.status,
            targetStatus: LLM_STATUS_enum.READY,
            operation: 'llm_initialization',
            phase: 'status_transition',
            startTime,
            duration: Date.now() - startTime,
            resourceMetrics: this.metrics.resources,
            performanceMetrics: this.metrics.performance,
            metadata: createBaseMetadata('LLMInitializationManager', 'syncState'),
            context: {
                provider: instance.provider,
                model: instance.config.model
            }
        };

        await this.handleStatusTransition(statusTransition);
        instance.status = LLM_STATUS_enum.READY;
    }

    /**
     * Handle initialization errors
     */
    private handleInitError(error: Error | unknown, config: LLMProviderConfig): any {
        return {
            message: 'Failed to initialize LLM instance',
            type: 'InitializationError',
            context: {
                component: this.constructor.name,
                config,
                error: error instanceof Error ? error : new Error(String(error))
            }
        };
    }

    /**
     * Create initialization metrics
     */
    private createInitMetrics(): IInitMetrics {
        return {
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
            steps: [],
            resourceUsage: {
                cpuUsage: 0,
                memoryUsage: process.memoryUsage().heapUsed,
                timestamp: Date.now()
            },
            resources: this.metrics.resources,
            performance: this.metrics.performance,
            usage: this.metrics.usage,
            timestamp: Date.now()
        };
    }

    /**
     * Cleanup resources for an instance
     */
    private async cleanup(instanceId: string): Promise<void> {
        const instance = this.activeInstances.get(instanceId);
        if (!instance) return;

        try {
            // Update status to cleaning up
            instance.status = LLM_STATUS_enum.CLEANING_UP;
            await this.syncState(instance);

            // Release resources
            const llmManager = this.getDomainManager<any>('llm');
            await llmManager.releaseResources(instance);

            // Remove from active instances
            this.activeInstances.delete(instanceId);
            this.initMetrics.delete(instanceId);

            // Update status to cleaned up
            instance.status = LLM_STATUS_enum.CLEANED_UP;
            await this.syncState(instance);
        } catch (error) {
            this.logError('Failed to cleanup LLM instance', null, instanceId, 
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Get active instance by ID
     */
    public getInstance(instanceId: string): ILLMInstance | undefined {
        return this.activeInstances.get(instanceId);
    }

    /**
     * Get initialization metrics by instance ID
     */
    public getInitMetrics(instanceId: string): IInitMetrics | undefined {
        return this.initMetrics.get(instanceId);
    }

    /**
     * Get all active instance IDs
     */
    public getActiveInstanceIds(): string[] {
        return Array.from(this.activeInstances.keys());
    }
}

export default LLMInitializationManager;
