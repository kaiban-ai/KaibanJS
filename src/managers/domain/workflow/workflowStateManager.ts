import { CoreManager } from '../../core/coreManager';
import { 
    IWorkflowState,
    IWorkflowStateSnapshot,
    IWorkflowStateUpdate,
    IWorkflowStateValidation,
    IWorkflowStateRecoveryOptions,
    IWorkflowStateRecoveryResult
} from '../../../types/workflow/workflowStateTypes';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { WorkflowMetricsValidation } from '../../../types/workflow/workflowMetricTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { IHandlerResult } from '../../../types/common/commonHandlerTypes';

/**
 * Workflow State Manager
 * Manages workflow state, snapshots, and recovery
 */
export class WorkflowStateManager extends CoreManager {
    private static instance: WorkflowStateManager;
    private states: Map<string, IWorkflowState>;
    private snapshots: Map<string, IWorkflowStateSnapshot[]>;

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
            this.logInfo(`Updated workflow state: ${workflowId}`, null, workflowId);

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

            this.logInfo(`Created workflow state snapshot: ${snapshot.metadata.snapshotId}`, null, workflowId);

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

            this.logInfo(`Restored workflow state from snapshot: ${snapshot.metadata.snapshotId}`, null, workflowId);

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

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: {
                timestamp: Date.now(),
                duration: 0,
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
                return snapshots.reverse().find(s => s.timestamp <= options.timestamp!);

            case 'version':
                if (!options.version) {
                    throw new Error('Version required for version strategy');
                }
                return snapshots.reverse().find(s => s.version === options.version);

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
