/**
 * @file index.ts
 * @path KaibanJS/src/index.ts
 * @description Main entry point for the KaibanJS library
 */

// Import core classes
import { Agent } from './agents/Agent';
import { Task } from '../tasks/Task';
import { Team } from './team/Team';
import { defaultGroqConfig, defaultModelConfig } from './utils/helpers/config';
import { MessageManager } from '@/managers/domain/llm/MessageManager';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum, AGENT_STATUS_enum } from './utils/types/common/enums';

// Core class exports
export {
    Agent,
    Task,
    Team,
    defaultGroqConfig,
    defaultModelConfig,
    MessageHistoryManager
};

// Export enums
export {
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    AGENT_STATUS_enum
};

// Type exports
export type {
    // Agent types
    AgentType,
    IReactChampionAgent,
    BaseAgentConfig,
    ExtendedBaseAgentConfig,
    
    // Task types
    TaskType,
    TaskResult,
    
    // Team types
    TeamStore,
    UseBoundTeamStore,
    TeamState,
    
    // Workflow types
    WorkflowStartResult,
    WorkflowStats,
    AgenticLoopResult,
    
    // Configuration types
    LLMConfig,
    GroqConfig,
    
    // Other types
    FeedbackObject,
    LogLevel
} from './utils/types';