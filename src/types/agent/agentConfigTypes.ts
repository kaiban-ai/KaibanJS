/**
 * @file agentConfigTypes.ts
 * @path src/types/agent/agentConfigTypes.ts
 * @description Agent configuration type definitions
 */

import type { IParserConfig } from '../common/baseTypes';
import type { IMetricsCollectionOptions } from '../metrics/base/baseMetrics';

/**
 * Agent configuration interface
 */
export interface IAgentConfig {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly capabilities: {
        readonly canLearn: boolean;
        readonly canTeach: boolean;
        readonly canDelegate: boolean;
        readonly canCollaborate: boolean;
        readonly canThink?: boolean;
        readonly canUseTools?: boolean;
        readonly supportedProviders: string[];
        readonly supportedModels: string[];
        readonly supportedToolTypes?: string[];
        readonly maxContextSize: number;
        readonly maxConcurrentTasks?: number;
        readonly memoryCapacity?: number;
        readonly features: {
            readonly streaming: boolean;
            readonly batching: boolean;
            readonly caching: boolean;
            readonly recovery: boolean;
            readonly metrics: boolean;
        };
    };
    readonly metrics: IMetricsCollectionOptions;
    readonly parser?: IParserConfig;
    readonly maxConcurrentOperations?: number;
    readonly timeout?: number;
    readonly retryLimit?: number;
}

/**
 * Agent configuration validation interface
 */
export interface IAgentConfigValidation {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
}

/**
 * Agent configuration factory interface
 */
export interface IAgentConfigFactory {
    createConfig(params: Record<string, unknown>): IAgentConfig;
    validateConfig(config: IAgentConfig): IAgentConfigValidation;
}
