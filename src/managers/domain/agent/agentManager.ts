/**
 * @file agentManager.ts
 * @description Primary domain manager for coordinating agent operations and lifecycle
 */

import { CoreManager } from '../../core/coreManager';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricTypes';
import { MetricsCollector } from '../../core/metrics/MetricsCollector';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { IAgentConfig } from '../../../types/agent/agentConfigTypes';

// Type imports
import type { IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import { AGENT_EVENT_TYPE, AGENT_EVENT_CATEGORY } from '../../../types/agent/agentEvents';

// Core Managers
import { AgentStateManager } from './agentStateManager';
import { AgentEventEmitter } from './agentEventEmitter';
import { AgentEventHandler } from './agentEventHandler';

// Validation Managers
import { AgentValidator } from './agentValidator';

// Tool Managers
import { ToolRegistrationManager } from './toolRegistrationManager';
import { ToolManager } from './toolManager';
import { ToolExecutionManager } from './toolExecutionManager';
import { ToolMetricsManager } from './toolMetricsManager';

// Cache and Batch Managers
import { CacheInitManager } from './cache/cacheInitManager';
import { BatchManager } from './batch/batchManager';

// Execution Managers
import { ThinkingManager } from './thinkingManager';
import { IterationManager } from './iterationManager';
import { AgenticLoopStateManager } from './agenticLoopStateManager';
import { AgenticLoopManager } from './agenticLoopManager';

export class AgentManager extends CoreManager {
    private static instance: AgentManager;
    private isInitialized = false;
    private stateManager!: AgentStateManager;
    private metricsCollector: MetricsCollector;
    public readonly category = MANAGER_CATEGORY_enum.SERVICE;

    private constructor() {
        super();
        this.metricsCollector = new MetricsCollector();
        this.registerDomainManager('AgentManager', this);
        this.initializeStateManager();
        this.registerManagers();
    }

    private initializeStateManager(): void {
        this.stateManager = AgentStateManager.getInstance();
    }

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    private async registerManagers(): Promise<void> {
        const baseMetadata = await this.createBaseMetadata();

        try {
            // Register all managers first
            this.registerDomainManager('AgentStateManager', this.stateManager);
            this.registerDomainManager('AgentEventEmitter', AgentEventEmitter.getInstance());
            this.registerDomainManager('AgentEventHandler', AgentEventHandler.getInstance());
            this.registerDomainManager('AgentValidator', AgentValidator.getInstance());
            this.registerDomainManager('ToolRegistrationManager', ToolRegistrationManager.getInstance());
            this.registerDomainManager('ToolManager', ToolManager.getInstance());
            this.registerDomainManager('ToolExecutionManager', ToolExecutionManager.getInstance());
            this.registerDomainManager('ToolMetricsManager', ToolMetricsManager.getInstance());
            this.registerDomainManager('CacheInitManager', CacheInitManager.getInstance());
            this.registerDomainManager('BatchManager', BatchManager.getInstance());
            this.registerDomainManager('ThinkingManager', ThinkingManager.getInstance());
            this.registerDomainManager('IterationManager', IterationManager.getInstance());
            this.registerDomainManager('AgenticLoopStateManager', AgenticLoopStateManager.getInstance());
            this.registerDomainManager('AgenticLoopManager', AgenticLoopManager.getInstance());

            // Initialize managers in sequence
            const startTime = Date.now();

            // 1. Core Managers
            await this.stateManager.initialize();
            await this.emitManagerMetrics('AgentStateManager', baseMetadata);
            
            await this.getDomainManager<AgentEventEmitter>('AgentEventEmitter').initialize();
            await this.emitManagerMetrics('AgentEventEmitter', baseMetadata);
            
            await this.getDomainManager<AgentEventHandler>('AgentEventHandler').initialize();
            await this.emitManagerMetrics('AgentEventHandler', baseMetadata);

            // 2. Validation Managers
            await this.getDomainManager<AgentValidator>('AgentValidator').initialize();
            await this.emitManagerMetrics('AgentValidator', baseMetadata);

            // 3. Tool Managers
            await this.getDomainManager<ToolRegistrationManager>('ToolRegistrationManager').initialize();
            await this.emitManagerMetrics('ToolRegistrationManager', baseMetadata);
            
            await this.getDomainManager<ToolManager>('ToolManager').initialize();
            await this.emitManagerMetrics('ToolManager', baseMetadata);
            
            await this.getDomainManager<ToolExecutionManager>('ToolExecutionManager').initialize();
            await this.emitManagerMetrics('ToolExecutionManager', baseMetadata);
            
            await this.getDomainManager<ToolMetricsManager>('ToolMetricsManager').initialize();
            await this.emitManagerMetrics('ToolMetricsManager', baseMetadata);

            // 4. Cache and Batch Managers
            await this.getDomainManager<CacheInitManager>('CacheInitManager').initialize();
            await this.emitManagerMetrics('CacheInitManager', baseMetadata);
            
            await this.getDomainManager<BatchManager>('BatchManager').initialize();
            await this.emitManagerMetrics('BatchManager', baseMetadata);

            // 5. Execution Managers
            await this.getDomainManager<ThinkingManager>('ThinkingManager').initialize();
            await this.emitManagerMetrics('ThinkingManager', baseMetadata);
            
            await this.getDomainManager<IterationManager>('IterationManager').initialize();
            await this.emitManagerMetrics('IterationManager', baseMetadata);
            
            await this.getDomainManager<AgenticLoopStateManager>('AgenticLoopStateManager').initialize();
            await this.emitManagerMetrics('AgenticLoopStateManager', baseMetadata);
            
            await this.getDomainManager<AgenticLoopManager>('AgenticLoopManager').initialize();
            await this.emitManagerMetrics('AgenticLoopManager', baseMetadata);

            // Track final initialization metrics
            await this.metricsCollector.trackMetric({
                domain: MetricDomain.AGENT,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'registerManagers',
                    baseMetadata
                }
            });

        } catch (error) {
            await this.handleError(error, 'Failed to register or initialize managers', ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    // Protected accessor methods for all managers
    protected getStateManager(): AgentStateManager {
        return this.getDomainManager<AgentStateManager>('AgentStateManager');
    }
    protected getEventEmitter(): AgentEventEmitter {
        return this.getDomainManager<AgentEventEmitter>('AgentEventEmitter');
    }
    protected getEventHandler(): AgentEventHandler {
        return this.getDomainManager<AgentEventHandler>('AgentEventHandler');
    }
    protected getValidator(): AgentValidator {
        return this.getDomainManager<AgentValidator>('AgentValidator');
    }
    protected getToolRegistrationManager(): ToolRegistrationManager {
        return this.getDomainManager<ToolRegistrationManager>('ToolRegistrationManager');
    }
    protected getToolManager(): ToolManager {
        return this.getDomainManager<ToolManager>('ToolManager');
    }
    protected getToolExecutionManager(): ToolExecutionManager {
        return this.getDomainManager<ToolExecutionManager>('ToolExecutionManager');
    }
    protected getToolMetricsManager(): ToolMetricsManager {
        return this.getDomainManager<ToolMetricsManager>('ToolMetricsManager');
    }
    protected getCacheInitManager(): CacheInitManager {
        return this.getDomainManager<CacheInitManager>('CacheInitManager');
    }
    protected getBatchManager(): BatchManager {
        return this.getDomainManager<BatchManager>('BatchManager');
    }
    protected getThinkingManager(): ThinkingManager {
        return this.getDomainManager<ThinkingManager>('ThinkingManager');
    }
    protected getIterationManager(): IterationManager {
        return this.getDomainManager<IterationManager>('IterationManager');
    }
    protected getAgenticLoopStateManager(): AgenticLoopStateManager {
        return this.getDomainManager<AgenticLoopStateManager>('AgenticLoopStateManager');
    }
    protected getAgenticLoopManager(): AgenticLoopManager {
        return this.getDomainManager<AgenticLoopManager>('AgenticLoopManager');
    }

    private async createBaseMetadata(): Promise<IBaseManagerMetadata> {
        const startTime = Date.now();

        // Get current agent from state manager if available
        const activeAgents = this.stateManager?.getActiveAgents() || [];
        const currentAgent = activeAgents.find(agent => 
            agent.status !== AGENT_STATUS_enum.IDLE && 
            agent.status !== AGENT_STATUS_enum.INITIAL
        );

        const metadata: IBaseManagerMetadata = {
            timestamp: Date.now(),
            component: this.constructor.name,
            operation: 'initialize',
            category: this.category,
            duration: Date.now() - startTime,
            status: 'success' as const,
            agent: {
                id: currentAgent?.id || `${this.constructor.name}_${Date.now()}`,
                name: currentAgent?.name || this.constructor.name,
                role: currentAgent?.role || 'system',
                status: currentAgent?.status || AGENT_STATUS_enum.IDLE
            },
            context: {
                component: this.constructor.name,
                operation: 'initialize',
                timestamp: Date.now()
            }
        };

        // Track metadata creation
        await this.metricsCollector.trackMetric({
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: Date.now() - startTime,
            metadata: {
                component: this.constructor.name,
                operation: 'createBaseMetadata',
                baseMetadata: metadata
            }
        });

        return metadata;
    }

    private async emitManagerMetrics(managerName: string, metadata: IBaseManagerMetadata): Promise<void> {
        const timestamp = Date.now();
        
        // Track performance metric
        await this.trackPerformance('initializeManager', metadata.duration, {
            manager: managerName,
            status: metadata.status,
            agentId: metadata.agent.id
        });

        // Track resource usage
        await this.trackResourceUsage('initializeManager', {
            manager: managerName,
            agentId: metadata.agent.id
        });

        // Emit event for manager initialization
        await this.emitEvent({
            id: `${managerName}_${timestamp}`,
            type: AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED,
            timestamp,
            metadata: {
                timestamp,
                component: managerName,
                operation: 'initialize',
                duration: metadata.duration,
                status: metadata.status,
                agent: metadata.agent,
                category: AGENT_EVENT_CATEGORY.METRICS,
                source: this.constructor.name,
                correlationId: `${managerName}_${timestamp}`
            }
        });
    }

    protected async trackPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): Promise<void> {
        await this.metricsCollector.trackMetric({
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: duration,
            metadata: {
                component: this.constructor.name,
                operation,
                ...metadata
            }
        });
    }

    protected async trackError(operation: string, error: Error, metadata?: Record<string, unknown>): Promise<void> {
        await this.metricsCollector.trackMetric({
            domain: MetricDomain.AGENT,
            type: MetricType.ERROR,
            value: 1,
            metadata: {
                component: this.constructor.name,
                operation,
                error,
                ...metadata
            }
        });
    }

    protected async trackResourceUsage(operation: string, metadata?: Record<string, unknown>): Promise<void> {
        await this.metricsCollector.trackMetric({
            domain: MetricDomain.AGENT,
            type: MetricType.RESOURCE,
            value: process.memoryUsage().heapUsed,
            metadata: {
                component: this.constructor.name,
                operation,
                cpuUsage: process.cpuUsage(),
                ...metadata
            }
        });
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.registerManagers();
            this.isInitialized = true;
            this.logInfo('Agent manager initialized successfully');
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            await this.handleError(error, 'Failed to initialize agent manager', ERROR_KINDS.InitializationError);
            throw error;
        }
    }
}

export default AgentManager.getInstance();
