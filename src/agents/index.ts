/**
 * @file index.ts
 * @path src/agents/index.ts
 * @description Central export point for agent implementations
 */

export { BaseAgent } from './baseAgent';
export { ReactChampionAgent } from './reactChampionAgent';

// Re-export agent types
export type {
    IBaseAgent,
    IReactChampionAgent,
    AgentType,
    BaseAgentConfig,
    IAgentParams
} from '@/utils/types/agent';
