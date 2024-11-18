/**
 * @file metadataFactory.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\factories\metadataFactory.ts
 * @description Factory for creating metadata objects for various system entities
 * 
 * @packageDocumentation
 * @module @factories/metadata
 */

import { 
    TaskLogMetadata,
    WorkflowLogMetadata,
    MessageMetadataFields,
    LLMUsageStats,
    TaskResult,
    CostDetails,
    WorkflowStats,
    TeamState,
    FunctionCall
} from '@/utils/types';
import { DefaultFactory } from './defaultFactory';
import { MessageRole } from '@/utils/types/messaging/base';
import { PrettyError, LLMInvocationError, LLMConfigurationError } from '@/utils/core/errors';

export class MetadataFactory {
    static forTask(
        stats: { 
            llmUsageStats: LLMUsageStats; 
            iterationCount: number; 
            duration: number 
        },
        result: TaskResult,
        costDetails: CostDetails
    ): TaskLogMetadata {
        return {
            llmUsageStats: stats.llmUsageStats,
            iterationCount: stats.iterationCount,
            duration: stats.duration,
            costDetails,
            result
        };
    }

    static forWorkflow(
        state: TeamState,
        stats: WorkflowStats,
        additionalData?: Record<string, unknown>
    ): WorkflowLogMetadata {
        return {
            result: state.workflowResult?.status || '',
            duration: stats.duration,
            llmUsageStats: stats.llmUsageStats,
            iterationCount: stats.iterationCount,
            costDetails: stats.costDetails,
            teamName: state.name,
            taskCount: state.tasks.length,
            agentCount: state.agents.length,
            ...additionalData
        };
    }

    static forMessage(params: {
        role: MessageRole;
        content: string;
        functionCall?: FunctionCall;
        additionalFields?: Record<string, unknown>;
    }): MessageMetadataFields {
        const { role, content, functionCall, additionalFields = {} } = params;

        return {
            messageId: `msg_${Date.now()}`,
            timestamp: Date.now(),
            role,
            content,
            function_call: functionCall ? {
                name: functionCall.name,
                arguments: typeof functionCall.arguments === 'string'
                    ? functionCall.arguments
                    : JSON.stringify(functionCall.arguments)
            } : undefined,
            llmUsageStats: DefaultFactory.createLLMUsageStats(),
            costDetails: DefaultFactory.createCostDetails(),
            ...additionalFields,
        };
    }

    static forStreamingOutput(params: {
        content: string;
        chunk?: string;
        done: boolean;
    }): Record<string, unknown> {
        const { content, chunk, done } = params;
        
        return {
            content,
            chunk,
            isDone: done,
            timestamp: Date.now(),
            llmUsageStats: DefaultFactory.createLLMUsageStats()
        };
    }

    static forToolExecution(params: {
        toolName: string;
        input: unknown;
        output?: unknown;
        error?: Error;
    }): Record<string, unknown> {
        const { toolName, input, output, error } = params;

        return {
            tool: toolName,
            input,
            output,
            error: error ? {
                message: error.message,
                name: error.name,
                stack: error.stack
            } : undefined,
            timestamp: Date.now(),
            llmUsageStats: DefaultFactory.createLLMUsageStats()
        };
    }

    static forError(
        error: Error | Record<string, unknown>,
        additionalMetadata: Record<string, unknown> = {}
    ): Record<string, unknown> {
        // Create base error data depending on the type of input
        const errorData = error instanceof Error 
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack
            }
            : error;

        return {
            error: errorData,
            ...additionalMetadata,
            timestamp: Date.now(),
            llmUsageStats: DefaultFactory.createLLMUsageStats()
        };
    }
}

export default MetadataFactory;