import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { IBaseManager } from '../../../types/agent/agentManagerTypes';

export declare class MemoryManager implements IBaseManager {
    public readonly category: MANAGER_CATEGORY_enum;
    
    shouldCollectMetric(): boolean;
    getUsage(): number;
    getCurrentUsage(): number;
    enforceMemoryLimits(): Promise<void>;
    getMetadata(): {
        name: string;
        category: MANAGER_CATEGORY_enum;
        version: string;
        operation: string;
        duration: number;
        status: string;
        agent: string;
        timestamp: number;
        component: string;
        metrics: {
            memoryUsage: number;
        };
    };
}
