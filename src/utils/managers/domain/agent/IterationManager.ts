/**
 * @file IterationManager.ts
 * @path src/managers/domain/agent/IterationManager.ts
 * @description Centralized iteration control and management implementation
 *
 * @module @managers/domain/agent
 */

import CoreManager from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';
import { StatusManager } from '../../core/StatusManager';
import { DefaultFactory } from '../../../factories/defaultFactory';

// Import types from canonical locations
import type { AgentType } from '../../../types/agent/base';
import type { TaskType } from '../../../types/task/base';
import type {
    IterationContext,
    IterationControl,
    IterationHandlerParams,
    HandlerResult,
    IterationStats
} from '../../../types/agent/iteration';
import type { ParsedOutput } from '../../../types/llm/responses';
import { AGENT_STATUS_enum } from '../../../types/common/enums';
import { toErrorType, type ErrorType } from '../../../types/common/errors';

/**
 * Manages iteration control and tracking for agent operations
 */
export class IterationManager extends CoreManager {
    private static instance: IterationManager;
    protected readonly errorManager: ErrorManager;
    protected readonly logManager: LogManager;
    protected readonly statusManager: StatusManager;
    private readonly activeIterations: Map<string, IterationContext>;

    private constructor() {
        super();
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.activeIterations = new Map();
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
        const iterationKey = this.generateIterationKey(agent?.id, task?.id);

        try {
            const context = this.getIterationContext(iterationKey);

            // Check for final answer
            if (parsedOutput?.finalAnswer) {
                await this.handleIterationEnd({ agent, task, iterations, maxAgentIterations: maxIterations });
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
                return {
                    shouldContinue: true,
                    feedbackMessage: agent?.promptTemplates.FORCE_FINAL_ANSWER_FEEDBACK({
                        agent,
                        task,
                        iterations,
                        maxAgentIterations: maxIterations
                    })
                };
            }

            // Update context and continue
            context.iterations = iterations;
            context.lastUpdateTime = Date.now();
            this.activeIterations.set(iterationKey, context);

            return { shouldContinue: true };

        } catch (error) {
            await this.handleIterationError(iterationKey, error);
            throw error;
        }
    }

    /**
     * Handle iteration start
     */
    public async handleIterationStart(params: IterationHandlerParams): Promise<HandlerResult> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent?.id, task?.id);

        try {
            await this.statusManager.transition({
                currentStatus: agent?.status,
                targetStatus: AGENT_STATUS_enum.ITERATION_START,
                entity: 'agent',
                entityId: agent?.id,
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

            this.logManager.info(`Starting iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent?.name}`);

            return {
                success: true,
                data: context
            };

        } catch (error) {
            return this.handleIterationError(iterationKey, error);
        }
    }

    /**
     * Handle iteration end
     */
    public async handleIterationEnd(params: IterationHandlerParams): Promise<HandlerResult> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent?.id, task?.id);

        try {
            await this.statusManager.transition({
                currentStatus: agent?.status,
                targetStatus: AGENT_STATUS_enum.ITERATION_END,
                entity: 'agent',
                entityId: agent?.id,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now()
                }
            });

            const context = this.getIterationContext(iterationKey);
            context.endTime = Date.now();
            context.status = 'completed';

            this.logManager.info(`Completed iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent?.name}`);

            const stats = this.calculateIterationStats(context);
            this.cleanupIteration(iterationKey);

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            return this.handleIterationError(iterationKey, error);
        }
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
        const iterationKey = this.generateIterationKey(agent?.id, task?.id);

        try {
            await this.statusManager.transition({
                currentStatus: agent?.status,
                targetStatus: AGENT_STATUS_enum.MAX_ITERATIONS_ERROR,
                entity: 'agent',
                entityId: agent?.id,
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

            this.logManager.error(`Maximum iterations [${maxIterations}] reached for agent ${agent?.name}`);

            const stats = this.calculateIterationStats(context);
            this.cleanupIteration(iterationKey);

            return {
                success: false,
                error: toErrorType(error),
                data: stats
            };

        } catch (innerError) {
            return this.handleIterationError(iterationKey, innerError);
        }
    }

    // ─── Resource Management ───────────────────────────────────────────────────────

    /**
     * Get iteration statistics
     */
    public getIterationStats(iterationKey: string): IterationStats {
        const context = this.activeIterations.get(iterationKey);
        if (!context) {
            return DefaultFactory.createIterationStats();
        }
        return this.calculateIterationStats(context);
    }

    /**
     * Validate manager configuration
     */
    public async validateConfig(): Promise<void> {
        if (!this.errorManager || !this.logManager || !this.statusManager) {
            throw new Error('Required managers not initialized');
        }
    }

    /**
     * Initialize manager resources
     */
    public async initialize(): Promise<void> {
        await this.validateConfig();
        await this.cleanup();
        this.logManager.info('IterationManager initialized successfully');
    }

    /**
     * Clean up manager resources
     */
    public async cleanup(): Promise<void> {
        for (const [key, context] of this.activeIterations.entries()) {
            this.cleanupIteration(key);
        }
        this.activeIterations.clear();
        this.logManager.info('IterationManager cleanup completed');
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────────

    /**
     * Generate unique iteration key
     */
    private generateIterationKey(agentId?: string, taskId?: string): string {
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

    /**
     * Handle iteration error
     */
    protected async handleIterationError(
        iterationKey: string,
        error: unknown
    ): Promise<HandlerResult> {
        const context = this.activeIterations.get(iterationKey);
        if (context) {
            context.status = 'error';
            context.error = toErrorType(error instanceof Error ? error : new Error(String(error)));
        }

        const errorResult = await super.handleError(
            error instanceof Error ? error : new Error(String(error)),
            `Iteration error for key: ${iterationKey}`
        );

        this.cleanupIteration(iterationKey);

        return {
            success: false,
            error: toErrorType(error instanceof Error ? error : new Error(String(error)))
        };
    }
}

export default IterationManager.getInstance();
