//C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\types\types.d.ts

import { AGENT_STATUS_enum } from '../utils/enums';
import { Tool } from 'langchain/tools';

export interface BaseAgentConfig {
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: Tool[];
    llmConfig?: LLMConfig;
    maxIterations?: number;
    forceFinalAnswer?: boolean;
    promptTemplates?: Record<string, any>;
    llmInstance?: any;
}

export interface LLMConfig {
    provider: string;
    model: string;
    maxRetries: number;
    apiBaseUrl?: string;
    [key: string]: any;
}

export interface BaseAgent {
    id: string;
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: Tool[];
    maxIterations: number;
    store: any | null;
    status: keyof typeof AGENT_STATUS_enum;
    env: any | null;
    llmInstance: any | null;
    llmConfig: LLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: Record<string, any>;

    setStore(store: any): void;
    setStatus(status: keyof typeof AGENT_STATUS_enum): void;
    setEnv(env: any): void;
    workOnTask(task: any): Promise<any>;
    normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig;
}