/**
 * @file statusHistoryManager.ts
 * @deprecated This manager is deprecated and will be removed in future versions.
 * Use the following alternatives:
 * - Status transitions: Use EventEmitter
 * - Metrics collection: Use MetricsManager
 * - Performance data: Use PerformanceMetricsManager
 * - Resource usage: Use ResourceMetricsManager
 * - System health: Use SystemHealthManager
 * - Logging: Use LogEventEmitter
 */

import { CoreManager } from './coreManager';
import {
    MANAGER_CATEGORY_enum,
    IStatusChangeEvent,
    IStatusTransitionContext,
    IStatusHistoryEntry,
    IStatusHistoryQuery
} from '../../types/common';

/**
 * @deprecated Use specialized managers instead:
 * - EventEmitter for status transitions
 * - MetricsManager for metrics collection
 * - LogEventEmitter for logging
 */
export class StatusHistoryManager extends CoreManager {
    private static instance: StatusHistoryManager;
    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.registerDomainManager('StatusHistoryManager', this);
        console.warn(
            'StatusHistoryManager is deprecated.\n' +
            'Use these alternatives instead:\n' +
            '- Status transitions: Use EventEmitter\n' +
            '- Metrics collection: Use MetricsManager\n' +
            '- Performance data: Use PerformanceMetricsManager\n' +
            '- Resource usage: Use ResourceMetricsManager\n' +
            '- System health: Use SystemHealthManager\n' +
            '- Logging: Use LogEventEmitter'
        );
    }

    public static getInstance(): StatusHistoryManager {
        if (!StatusHistoryManager.instance) {
            StatusHistoryManager.instance = new StatusHistoryManager();
        }
        return StatusHistoryManager.instance;
    }

    /**
     * @deprecated Use EventEmitter.emit() for status transitions
     */
    public async recordTransition(context: IStatusTransitionContext, event: IStatusChangeEvent): Promise<void> {
        console.warn('recordTransition is deprecated. Use EventEmitter.emit() instead.');
        // Use context and event to maintain type safety and prevent unused variable warnings
        if (context && event) {
            return;
        }
    }

    /**
     * @deprecated Use MetricsManager.getMetrics() for historical data
     */
    public async queryHistory(query: IStatusHistoryQuery): Promise<IStatusHistoryEntry[]> {
        console.warn('queryHistory is deprecated. Use MetricsManager.getMetrics() instead.');
        // Use query to maintain type safety and prevent unused variable warnings
        if (query) {
            return [];
        }
        return [];
    }

    /**
     * @deprecated Use specialized managers for analysis:
     * - PerformanceMetricsManager for performance analysis
     * - ResourceMetricsManager for resource analysis
     * - SystemHealthManager for health analysis
     */
    public async analyzeHistory(): Promise<void> {
        console.warn(
            'analyzeHistory is deprecated. Use specialized managers instead:\n' +
            '- PerformanceMetricsManager for performance analysis\n' +
            '- ResourceMetricsManager for resource analysis\n' +
            '- SystemHealthManager for health analysis'
        );
    }
}

export default StatusHistoryManager.getInstance();
