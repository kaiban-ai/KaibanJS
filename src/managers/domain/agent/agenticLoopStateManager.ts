/**
 * @file agenticLoopStateManager.ts
 * @path src/managers/domain/agent/agenticLoopStateManager.ts
 * @description Manages state transitions and history for agentic loops
 *
 * @module @managers/domain/agent
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/errorTypes';
import { AGENT_STATUS_enum, MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { 
    IStateTransaction,
    ILoopContext,
    IStateManager,
    ExecutionStatus
} from '../../../types/agent/agentExecutionFlow';
import type { IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';

const mapExecutionStatusToAgentStatus = (status: ExecutionStatus): AGENT_STATUS_enum => {
    switch (status) {
        case 'running':
            return AGENT_STATUS_enum.EXECUTING_ACTION;
        case 'completed':
            return AGENT_STATUS_enum.TASK_COMPLETED;
        case 'error':
            return AGENT_STATUS_enum.AGENTIC_LOOP_ERROR;
        default:
            return AGENT_STATUS_enum.IDLE;
    }
};

// ─── State Manager ───────────────────────────────────────────────────────────

export class AgenticLoopStateManager extends CoreManager implements IStateManager {
    private static instance: AgenticLoopStateManager;
    private readonly transactions: Map<string, IStateTransaction>;
    private readonly stateHistory: Map<string, ILoopContext[]>;
    private readonly MAX_HISTORY_SIZE = 100;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.STATE;

    private constructor() {
        super();
        this.transactions = new Map();
        this.stateHistory = new Map();
        this.registerDomainManager('AgenticLoopStateManager', this);
    }

    public static getInstance(): AgenticLoopStateManager {
        if (!AgenticLoopStateManager.instance) {
            AgenticLoopStateManager.instance = new AgenticLoopStateManager();
        }
        return AgenticLoopStateManager.instance;
    }

    /**
     * Initialize the state manager
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Initialize state management system
            this.transactions.clear();
            this.stateHistory.clear();
            this.isInitialized = true;
            this.logInfo('State manager initialized');
        } catch (error) {
            throw createError({
                message: 'Failed to initialize state manager',
                type: 'InitializationError',
                context: { error: error as Error }
            });
        }
    }

    /**
     * Validate state parameters
     */
    public async validate(): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                return false;
            }

            // Add specific validation logic here
            return true;
        } catch (error) {
            this.logError('State validation failed', error as Error);
            return false;
        }
    }

    /**
     * Get manager metadata
     */
    public getMetadata(): IBaseManagerMetadata {
        const latestState = Array.from(this.stateHistory.values())[0]?.[0];
        return {
            category: this.category,
            operation: 'state_management',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: latestState ? mapExecutionStatusToAgentStatus(latestState.status) : AGENT_STATUS_enum.IDLE
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }

    // ─── Transaction Management ────────────────────────────────────────────────

    public beginTransaction(loopKey: string, context: ILoopContext): string {
        if (!this.isInitialized) {
            throw createError({
                message: 'State manager not initialized',
                type: 'InitializationError'
            });
        }

        const transactionId = `${loopKey}:${Date.now()}`;
        const transaction: IStateTransaction = {
            id: transactionId,
            timestamp: Date.now(),
            context: { ...context },
            previousContext: this.getLatestState(loopKey),
            status: 'pending'
        };
        this.transactions.set(transactionId, transaction);
        return transactionId;
    }

    public commitTransaction(transactionId: string): void {
        const transaction = this.transactions.get(transactionId);
        if (!transaction) {
            throw createError({
                message: `Transaction ${transactionId} not found`,
                type: 'NotFoundError',
            });
        }

        const loopKey = transactionId.split(':')[0];
        this.addToHistory(loopKey, transaction.context);
        transaction.status = 'committed';
    }

    public rollbackTransaction(transactionId: string): ILoopContext | undefined {
        const transaction = this.transactions.get(transactionId);
        if (!transaction) {
            throw createError({
                message: `Transaction ${transactionId} not found`,
                type: 'NotFoundError',
            });
        }

        transaction.status = 'rolled_back';
        return transaction.previousContext;
    }

    // ─── State History Management ───────────────────────────────────────────────

    private addToHistory(loopKey: string, context: ILoopContext): void {
        let history = this.stateHistory.get(loopKey) || [];
        history = [{ ...context }, ...history].slice(0, this.MAX_HISTORY_SIZE);
        this.stateHistory.set(loopKey, history);
    }

    public getLatestState(loopKey: string): ILoopContext | undefined {
        const history = this.stateHistory.get(loopKey);
        return history?.[0];
    }

    public getStateHistory(loopKey: string): ILoopContext[] {
        return this.stateHistory.get(loopKey) || [];
    }

    public cleanup(loopKey: string): void {
        // Remove old transactions
        const keyPrefix = `${loopKey}:`;
        for (const [id] of this.transactions) {
            if (id.startsWith(keyPrefix)) {
                this.transactions.delete(id);
            }
        }
        this.stateHistory.delete(loopKey);
    }
}

export default AgenticLoopStateManager.getInstance();
