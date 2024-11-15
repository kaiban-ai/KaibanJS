/**
 * @file iteration.ts
 * @path KaibanJS/src/utils/types/agent/iteration.ts
 * @description Types for iteration management in agent operations
 *
 * @packageDocumentation
 * @module @types/agent
 */

import { AgentType } from './base';
import { TaskType } from '../task/base';
import { ErrorType } from '../common';

export interface IterationContext {
    startTime: number;
    endTime?: number;
    iterations: number;
    maxIterations: number;
    lastUpdateTime: number;
    status: 'running' | 'completed' | 'error';
    error?: ErrorType;
}

export interface IterationControl {
    shouldContinue: boolean;
    feedbackMessage?: string;
}

export interface IterationStats {
    startTime: number;
    endTime: number;
    duration: number;
    iterations: number;
    maxIterations: number;
    status: 'running' | 'completed' | 'error';
    error?: ErrorType;
}

export interface IterationHandlerParams {
    agent: AgentType;
    task: TaskType;
    iterations: number;
    maxAgentIterations: number;
}

export interface HandlerResult {
    success: boolean;
    error?: ErrorType;
    data?: IterationStats | IterationContext;
}
