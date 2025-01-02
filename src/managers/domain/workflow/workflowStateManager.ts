/**
 * @file workflowStateManager.ts
 * @description Workflow state management and initialization
 */

import { CoreManager } from '../../core/coreManager';
import { 
    IWorkflowState,
    IWorkflowStateSnapshot,
    IWorkflowStateUpdate,
    IWorkflowStateValidation,
    IWorkflowStateRecoveryOptions,
    IWorkflowStateRecoveryResult,
    IStepConfig
} from '../../../types/workflow/workflowStateTypes';
import { WorkflowMetricsValidation } from '../../../types/workflow/workflowMetricTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { IHandlerResult } from '../../../types/common/baseTypes';
import { ERROR_KINDS, createError, createErrorMetadata } from '../../../types/common/errorTypes';
import { MANAGER_CATEGORY_enum, ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';
import { IErrorMetrics } from '../../../types/metrics/base/performanceMetrics';
import { 
    IWorkflowPerformanceMetrics,
    IWorkflowResourceMetrics
} from '../../../types/workflow/workflowMetricTypes';
import { RecoveryStrategyType } from '../../../types/common/recoveryTypes';

/**
 * Workflow State Manager
 * Manages workflow state, snapshots, and recovery
 */
export class WorkflowStateManager extends CoreManager {
    private static instance: WorkflowStateManager;
    private states: Map<string, IWorkflowState>;
    private snapshots: Map<string, IWorkflowStateSnapshot[]>;

    public readonly category = MANAGER_CATEGORY_enum.STATE;

    private constructor() {
        super();
        this.states = new Map();
        this.snapshots = new Map();
        this.registerDomainManager('WorkflowStateManager', this);
    }

    public static getInstance(): WorkflowStateManager {
        if (!WorkflowStateManager.instance) {
            WorkflowStateManager.instance = new WorkflowStateManager();
        }
        return WorkflowStateManager.instance;
    }

    /**
     * Initialize workflow state
     */
    public async initializeState(
        workflowId: string,
        steps: IStepConfig[],
        initialState?: Partial<IWorkflowState>
    ): Promise<IHandlerResult<IWorkflowState>> {
        return this.safeExecute(async () => {
            const now = Date.now();

            // Get initial metrics from MetricsManager
            const metricsManager = this.getMetricsManager();
            const baseResourceMetrics = await metricsManager.getInitialResourceMetrics();
            const performanceMetrics = await metricsManager.getInitialPerformanceMetrics();

            // Create workflow resource metrics
            const resourceMetrics: IWorkflowResourceMetrics = {
                ...baseResourceMetrics,
                concurrentWorkflows: 0,
                resourceAllocation: {
                    cpu: 0,
                    memory: 0
                }
            };

            // Initialize error distribution
            const errorDistribution = Object.values(ERROR_KINDS).reduce(
                (acc, kind) => ({ ...acc, [kind]: 0 }),
                {} as Record<keyof typeof ERROR_KINDS, number>
            );

            // Initialize severity distribution
            const severityDistribution = Object.values(ERROR_SEVERITY_enum).reduce(
                (acc, severity) => ({ ...acc, [severity]: 0 }),
                {} as Record<keyof typeof ERROR_SEVERITY_enum, number>
            );

            // Initialize strategy distribution
            const strategyDistribution = Object.values(RecoveryStrategyType).reduce(
                (acc, strategy) => ({ ...acc, [strategy]: 0 }),
                {} as Record<RecoveryStrategyType, number>
            );

            // Initialize error metrics
            const errorMetrics: IErrorMetrics = {
                totalErrors: 0,
                errorRate: 0,
                errorDistribution,
                severityDistribution,
                patterns: [],
                impact: {
                    severity: ERROR_SEVERITY_enum.ERROR,
                    businessImpact: 0,
                    userExperienceImpact: 0,
                    systemStabilityImpact: 0,
                    resourceImpact: {
                        cpu: 0,
                        memory: 0,
                        io: 0
                    }
                },
                recovery: {
                    meanTimeToRecover: 0,
                    recoverySuccessRate: 0,
                    strategyDistribution,
                    failedRecoveries: 0
                },
                prevention: {
                    preventedCount: 0,
                    preventionRate: 0,
                    earlyWarnings: 0
                },
                trends: {
                    dailyRates: [],
                    weeklyRates: [],
                    monthlyRates: []
                }
            };

            // Create workflow performance metrics
            const workflowPerformanceMetrics: IWorkflowPerformanceMetrics = {
                ...performanceMetrics,
                completionRate: 0,
                averageStepsPerWorkflow: 0,
                errorMetrics,
                resourceUtilization: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    concurrentWorkflows: 0,
                    resourceAllocation: {
                        cpu: 0,
                        memory: 0
                    },
                    timestamp: now
                },
                timestamp: now
            };

            // Create initial state
            const state: IWorkflowState = {
                id: workflowId,
                name: initialState?.name || workflowId,
                workflowId,
                status: 'pending',
                steps,
                currentStepIndex: 0,
                stepResults: {},
                assignedAgents: {},
                pendingTasks: [],
                activeTasks: [],
                completedTasks: [],
                errors: [],
                agents: [],
                tasks: [],
                workflowLogs: [],
                costDetails: {
                    inputCost: 0,
                    outputCost: 0,
                    totalCost: 0,
                    currency: 'USD',
                    breakdown: {
                        promptTokens: { count: 0, cost: 0 },
                        completionTokens: { count: 0, cost: 0 }
                    }
                },
                metadata: {
                    ...initialState?.metadata,
                    createdAt: now,
                    updatedAt: now
                },
                metrics: {
                    performance: workflowPerformanceMetrics,
                    resources: resourceMetrics,
                    usage: {
                        totalRequests: 0,
                        activeUsers: 0,
                        requestsPerSecond: 0,
                        averageResponseSize: 0,
                        peakMemoryUsage: 0,
                        uptime: 0,
                        rateLimit: {
                            current: 0,
                            limit: 100,
                            remaining: 100,
                            resetTime: now + 3600000
                        },
                        totalExecutions: 0,
                        activeWorkflows: 0,
                        workflowsPerSecond: 0,
                        averageComplexity: 0,
                        workflowDistribution: {
                            sequential: 0,
                            parallel: 0,
                            conditional: 0
                        },
                        timestamp: now
                    },
                    timestamp: now
                }
            };

            // Validate state
            const validation = await this.validateState(state);
            if (!validation.isValid) {
                throw createError({
                    message: `Invalid initial state: ${validation.errors.join(', ')}`,
                    type: ERROR_KINDS.ValidationError,
                    metadata: createErrorMetadata({
                        component: this.constructor.name,
                        operation: 'initializeState',
                        details: {
                            workflowId,
                            errors: validation.errors
                        }
                    })
                });
            }

            // Store state
            this.states.set(workflowId, state);

            // Track initialization
            await metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - now,
                timestamp: now,
                metadata: {
                    workflowId,
                    operation: 'initialize_state',
                    status: 'success'
                }
            });

            return state;
        }, 'Initialize workflow state');
    }

    /**
     * Get workflow state
     */
    public getState(workflowId: string): IWorkflowState | undefined {
        return this.states.get(workflowId);
    }

    /**
     * Update workflow state
     */
    public async updateState(workflowId: string, update: IWorkflowStateUpdate): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            const currentState = this.states.get(workflowId);
            if (!currentState) {
                throw new Error(`Workflow state not found: ${workflowId}`);
            }

            // Create snapshot before update
            await this.createSnapshot(workflowId, 'pre-update');

            // Update state
            const newState = {
                ...currentState,
                ...update,
                metadata: {
                    ...currentState.metadata,
                    ...update.metadata,
                    lastUpdated: Date.now()
                }
            };

            // Validate new state
            const validation = await this.validateState(newState);
            if (!validation.isValid) {
                throw new Error(`Invalid state update: ${validation.errors.join(', ')}`);
            }

            // Update state
            this.states.set(workflowId, newState);

            // Log update
            this.logInfo(`Updated workflow state: ${workflowId}`);

            // Track metrics
            const metricsManager = this.getMetricsManager();
            await metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - (currentState.metadata.lastUpdated as number || 0),
                timestamp: Date.now(),
                metadata: {
                    workflowId,
                    operation: 'state_update',
                    status: newState.status
                }
            });
        }, 'Update workflow state');
    }

    /**
     * Create state snapshot
     */
    public async createSnapshot(workflowId: string, reason: string): Promise<IHandlerResult<IWorkflowStateSnapshot>> {
        return this.safeExecute(async () => {
            const state = this.states.get(workflowId);
            if (!state) {
                throw new Error(`Workflow state not found: ${workflowId}`);
            }

            const snapshots = this.snapshots.get(workflowId) || [];
            const previousSnapshotId = snapshots.length > 0 ? snapshots[snapshots.length - 1].metadata.snapshotId : undefined;

            const snapshot: IWorkflowStateSnapshot = {
                timestamp: Date.now(),
                version: '1.0.0', // TODO: Get from config
                state: { ...state },
                metadata: {
                    snapshotId: `${workflowId}_${Date.now()}`,
                    reason,
                    triggeredBy: this.constructor.name,
                    previousSnapshotId
                }
            };

            snapshots.push(snapshot);
            this.snapshots.set(workflowId, snapshots);

            this.logInfo(`Created workflow state snapshot: ${snapshot.metadata.snapshotId}`);

            return snapshot;
        }, 'Create workflow state snapshot');
    }

    /**
     * Restore state from snapshot
     */
    public async restoreState(workflowId: string, options: IWorkflowStateRecoveryOptions): Promise<IHandlerResult<IWorkflowStateRecoveryResult>> {
        return this.safeExecute(async () => {
            const snapshots = this.snapshots.get(workflowId) || [];
            if (snapshots.length === 0) {
                throw new Error(`No snapshots found for workflow: ${workflowId}`);
            }

            // Find snapshot based on strategy
            const snapshot = await this.findSnapshot(workflowId, options);
            if (!snapshot) {
                throw new Error(`No suitable snapshot found for workflow: ${workflowId}`);
            }

            // Validate snapshot state if required
            if (!options.validation?.skipValidation) {
                const validation = await this.validateState(snapshot.state);
                if (!validation.isValid && !options.validation?.ignoreWarnings) {
                    const error = new Error(`Invalid snapshot state: ${validation.errors.join(', ')}`);
                    return {
                        success: false,
                        state: undefined,
                        snapshot: undefined,
                        error,
                        validation,
                        metadata: {
                            timestamp: Date.now(),
                            duration: 0,
                            strategy: options.strategy,
                            snapshotId: snapshot.metadata.snapshotId
                        }
                    };
                }
            }

            // Store current state info for metadata
            const currentState = this.states.get(workflowId);
            const previousState = currentState ? {
                status: currentState.status,
                currentStepIndex: currentState.currentStepIndex,
                errors: currentState.errors
            } : undefined;

            // Perform cleanup if requested
            const state = await this.cleanupState(snapshot.state, options.cleanup);

            // Update state
            this.states.set(workflowId, state);

            this.logInfo(`Restored workflow state from snapshot: ${snapshot.metadata.snapshotId}`);

            return {
                success: true,
                state,
                snapshot,
                validation: undefined,
                error: undefined,
                metadata: {
                    timestamp: Date.now(),
                    duration: 0,
                    strategy: options.strategy,
                    snapshotId: snapshot.metadata.snapshotId,
                    previousState
                }
            };
        }, 'Restore workflow state');
    }

    /**
     * Validate workflow state
     */
    private async validateState(state: IWorkflowState): Promise<IWorkflowStateValidation> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!state.id || !state.workflowId || !state.name) {
            errors.push('Missing required fields');
        }

        // Validate status
        if (!['pending', 'running', 'paused', 'completed', 'failed'].includes(state.status)) {
            errors.push('Invalid status');
        }

        // Validate step index
        if (state.currentStepIndex < -1 || state.currentStepIndex >= state.steps.length) {
            errors.push('Invalid step index');
        }

        // Validate metrics
        if (state.metrics) {
            const performanceValidation = WorkflowMetricsValidation.validateWorkflowPerformanceMetrics(state.metrics.performance);
            const resourceValidation = WorkflowMetricsValidation.validateWorkflowResourceMetrics(state.metrics.resources);
            const usageValidation = WorkflowMetricsValidation.validateWorkflowUsageMetrics(state.metrics.usage);

            errors.push(...performanceValidation.errors);
            errors.push(...resourceValidation.errors);
            errors.push(...usageValidation.errors);
            warnings.push(...performanceValidation.warnings);
            warnings.push(...resourceValidation.warnings);
            warnings.push(...usageValidation.warnings);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Return IWorkflowStateValidation directly
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: {
                timestamp: endTime,
                duration,
                validatorName: 'WorkflowStateValidator'
            }
        };
    }

    /**
     * Find snapshot based on recovery options
     */
    private async findSnapshot(workflowId: string, options: IWorkflowStateRecoveryOptions): Promise<IWorkflowStateSnapshot | undefined> {
        const snapshots = this.snapshots.get(workflowId) || [];

        switch (options.strategy) {
            case 'latest':
                return snapshots[snapshots.length - 1];

            case 'specific':
                if (!options.snapshotId) {
                    throw new Error('Snapshot ID required for specific strategy');
                }
                return snapshots.find(s => s.metadata.snapshotId === options.snapshotId);

            case 'timestamp':
                if (!options.timestamp) {
                    throw new Error('Timestamp required for timestamp strategy');
                }
                return [...snapshots].reverse().find(s => s.timestamp <= options.timestamp!);

            case 'version':
                if (!options.version) {
                    throw new Error('Version required for version strategy');
                }
                return [...snapshots].reverse().find(s => s.version === options.version);

            default:
                throw new Error(`Unknown recovery strategy: ${options.strategy}`);
        }
    }

    /**
     * Clean up state based on options
     */
    private async cleanupState(state: IWorkflowState, options?: IWorkflowStateRecoveryOptions['cleanup']): Promise<IWorkflowState> {
        if (!options) {
            return state;
        }

        const newState = { ...state };

        if (options.removeOrphanedTasks) {
            newState.tasks = newState.tasks.filter(task => 
                newState.pendingTasks.includes(task) ||
                newState.activeTasks.includes(task) ||
                newState.completedTasks.includes(task)
            );
        }

        if (options.cleanupIncompleteSteps) {
            Object.keys(newState.stepResults).forEach(stepId => {
                const result = newState.stepResults[stepId];
                if (result.status === 'running') {
                    delete newState.stepResults[stepId];
                }
            });
        }

        if (options.resetFailedSteps) {
            Object.keys(newState.stepResults).forEach(stepId => {
                const result = newState.stepResults[stepId];
                if (result.status === 'failed') {
                    newState.stepResults[stepId] = {
                        ...result,
                        status: 'pending',
                        error: undefined,
                        endTime: undefined
                    };
                }
            });
        }

        return newState;
    }
}

export default WorkflowStateManager.getInstance();
