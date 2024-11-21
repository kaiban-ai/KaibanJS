/**
 * @file iterationManager.ts
 * @path src/utils/managers/domain/agent/iterationManager.ts
 * @description Centralized iteration management with integrated handler functionality
 *
 * @module @managers/domain/agent
 */

import CoreManager from '../../core/coreManager';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { toErrorType } from '@/utils/types/common/errors';

// Import types from canonical locations
import type { 
    IterationContext,
    IterationControl,
    IterationStats,
    IterationHandlerParams,
    HandlerResult 
} from '@/utils/types/agent/iteration';

import type { 
    AgentType, 
    TaskType,
    Output,
    ParsedOutput 
} from '@/utils/types';

/**
 * Manages iteration control and tracking for agent operations
 */
export class IterationManager extends CoreManager {
    private static instance: IterationManager;
    private readonly activeIterations: Map<string, IterationContext>;

    private constructor() {
        super();
        this.activeIterations = new Map();
        this.registerDomainManager('IterationManager', this);
    }

    public static getInstance(): IterationManager {
        if (!IterationManager.instance) {
            IterationManager.instance = new IterationManager();
        }
        return IterationManager.instance;
    }

    // ─── Iteration Control ────────────────────────────────────────────────────────

    /**
     * Check iteration control conditions
     */
    public async checkIterationControl(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxIterations: number;
        parsedOutput: ParsedOutput | null;
    }): Promise<IterationControl> {
        const { agent, task, iterations, maxIterations, parsedOutput } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);

        return await this.safeExecute(async () => {
            const context = this.getIterationContext(iterationKey);

            // Check for final answer
            if (parsedOutput?.finalAnswer) {
                await this.handleIterationEnd({
                    agent, 
                    task, 
                    iterations, 
                    maxAgentIterations: maxIterations
                });
                return { shouldContinue: false };
            }

            // Check max iterations
            if (iterations >= maxIterations) {
                await this.handleMaxIterationsError({
                    agent,
                    task,
                    iterations,
                    maxIterations,
                    error: new Error(`Maximum iterations [${maxIterations}] reached without final answer`)
                });
                return { shouldContinue: false };
            }

            // Force final answer when approaching max iterations
            if (iterations === maxIterations - 2) {
                const feedback = agent.promptTemplates.FORCE_FINAL_ANSWER_FEEDBACK({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: maxIterations
                });

                return {
                    shouldContinue: true,
                    feedbackMessage: feedback
                };
            }

            // Update context and continue
            context.iterations = iterations;
            context.lastUpdateTime = Date.now();
            this.activeIterations.set(iterationKey, context);

            return { shouldContinue: true };

        }, 'Iteration control check failed');
    }

    /**
     * Handle iteration start
     */
    public async handleIterationStart(params: IterationHandlerParams): Promise<HandlerResult> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);

        return await this.safeExecute(async () => {
            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.ITERATION_START,
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now()
                }
            });

            const context: IterationContext = {
                startTime: Date.now(),
                iterations,
                maxIterations: maxAgentIterations,
                lastUpdateTime: Date.now(),
                status: 'running'
            };

            this.activeIterations.set(iterationKey, context);

            this.logManager.info(`Starting iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent.name}`);

            return {
                success: true,
                data: context
            };

        }, 'Iteration start failed');
    }

    /**
     * Handle iteration end
     */
    public async handleIterationEnd(params: IterationHandlerParams): Promise<HandlerResult> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);

        return await this.safeExecute(async () => {
            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.ITERATION_END,
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now()
                }
            });

            const context = this.getIterationContext(iterationKey);
            context.endTime = Date.now();
            context.status = 'completed';

            const stats = this.calculateIterationStats(context);
            this.cleanupIteration(iterationKey);

            this.logManager.info(`Completed iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent.name}`);

            return {
                success: true,
                data: stats
            };

        }, 'Iteration end failed');
    }

    /**
     * Handle maximum iterations error
     */
    public async handleMaxIterationsError(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxIterations: number;
        error: Error;
    }): Promise<HandlerResult> {
        const { agent, task, iterations, maxIterations, error } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);

        return await this.safeExecute(async () => {
            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.MAX_ITERATIONS_ERROR,
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    iterations,
                    maxIterations,
                    error: error.message,
                    timestamp: Date.now()
                }
            });

            const context = this.getIterationContext(iterationKey);
            context.status = 'error';
            context.error = toErrorType(error);

            const stats = this.calculateIterationStats(context);
            this.cleanupIteration(iterationKey);

            return {
                success: false,
                error: toErrorType(error),
                data: stats
            };

        }, 'Max iterations error handling failed');
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Generate unique iteration key
     */
    private generateIterationKey(agentId: string, taskId: string): string {
        return `${agentId}:${taskId}`;
    }

    /**
     * Get iteration context with validation
     */
    private getIterationContext(iterationKey: string): IterationContext {
        const context = this.activeIterations.get(iterationKey);
        if (!context) {
            throw new Error(`No active iteration found for key: ${iterationKey}`);
        }
        return context;
    }

    /**
     * Calculate iteration statistics
     */
    private calculateIterationStats(context: IterationContext): IterationStats {
        return {
            startTime: context.startTime,
            endTime: context.endTime || Date.now(),
            duration: (context.endTime || Date.now()) - context.startTime,
            iterations: context.iterations,
            maxIterations: context.maxIterations,
            status: context.status,
            error: context.error
        };
    }

    /**
     * Clean up iteration resources
     */
    private cleanupIteration(iterationKey: string): void {
        const context = this.activeIterations.get(iterationKey);
        if (context) {
            context.endTime = context.endTime || Date.now();
            this.activeIterations.delete(iterationKey);
        }
    }
}

export default IterationManager.getInstance();