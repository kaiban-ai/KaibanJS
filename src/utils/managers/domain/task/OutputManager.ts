/**
 * @file OutputManager.ts
 * @path KaibanJS/src/utils/managers/task/OutputManager.ts
 * @description Manages processing and validation of agent outputs, including action type determination and feedback generation.
 */

import CoreManager from '../../core/CoreManager';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import type { 
    Output, 
    ParsedOutput, 
    OutputProcessResult, 
    OutputValidationResult, 
    AgentType, 
    TaskType 
} from '@/utils/types';

export class OutputManager extends CoreManager {
    // Processes the output, parses it, validates it, and generates feedback
    public async processOutput(output: Output, agent: AgentType, task: TaskType): Promise<OutputProcessResult> {
        this.log(`Processing output for agent ID: ${agent.id} and task ID: ${task.id}`, 'info');

        try {
            const parsedOutput = await this.parseOutput(output.llmOutput || '');
            const actionType = this.determineActionType(parsedOutput);

            const validationResult = await this.validateOutput(parsedOutput, agent, task);
            if (!validationResult.isValid) {
                throw validationResult.error || new Error('Invalid output');
            }

            const feedback = await this.generateFeedback(actionType, parsedOutput, output, agent, task);
            this.log(`Output processed with action type: ${actionType}`, 'info');

            return {
                actionType,
                parsedOutput,
                feedback,
                shouldContinue: actionType !== AGENT_STATUS_enum.FINAL_ANSWER
            };

        } catch (error) {
            this.handleError(error as Error, 'Error processing output');
            throw error;
        }
    }

    // Parses the LLM output to a structured format
    private async parseOutput(content: string): Promise<ParsedOutput | null> {
        try {
            const parsed = JSON.parse(content);  // Simplified parsing logic as example
            if (!parsed) return null;

            return {
                thought: parsed.thought,
                action: parsed.action,
                actionInput: parsed.actionInput || undefined,
                observation: parsed.observation,
                isFinalAnswerReady: parsed.isFinalAnswerReady,
                finalAnswer: parsed.finalAnswer,
                metadata: {}  // Placeholder for metadata
            };
        } catch (error) {
            this.log(`Error parsing output: ${error}`, 'error');
            return null;
        }
    }

    // Validates parsed output for required properties and format
    private async validateOutput(parsedOutput: ParsedOutput | null, agent: AgentType, task: TaskType): Promise<OutputValidationResult> {
        if (!parsedOutput) {
            return { isValid: false, error: new Error('Failed to parse output') };
        }

        if (parsedOutput.finalAnswer && typeof parsedOutput.finalAnswer !== 'string' && typeof parsedOutput.finalAnswer !== 'object') {
            return { isValid: false, error: new Error('Invalid final answer format') };
        }

        if (parsedOutput.action && !this.validateActionFormat(parsedOutput)) {
            return { isValid: false, error: new Error('Invalid action format') };
        }

        return { isValid: true };
    }

    // Checks if the action format in parsed output is valid
    private validateActionFormat(parsedOutput: ParsedOutput): boolean {
        return typeof parsedOutput.action === 'string' && 
               (!parsedOutput.actionInput || typeof parsedOutput.actionInput === 'object');
    }

    // Determines the action type based on parsed output properties
    private determineActionType(parsedOutput: ParsedOutput | null): keyof typeof AGENT_STATUS_enum {
        if (!parsedOutput) return AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT;

        if (parsedOutput.finalAnswer) return AGENT_STATUS_enum.FINAL_ANSWER;

        if (parsedOutput.action === 'self_question') {
            return parsedOutput.thought ? AGENT_STATUS_enum.THOUGHT : AGENT_STATUS_enum.SELF_QUESTION;
        }

        if (parsedOutput.action) return AGENT_STATUS_enum.EXECUTING_ACTION;
        if (parsedOutput.observation) return AGENT_STATUS_enum.OBSERVATION;

        return AGENT_STATUS_enum.WEIRD_LLM_OUTPUT;
    }

    // Generates feedback for the current action type and parsed output
    private async generateFeedback(
        actionType: keyof typeof AGENT_STATUS_enum,
        parsedOutput: ParsedOutput | null,
        output: Output,
        agent: AgentType,
        task: TaskType
    ): Promise<string> {
        const templates = agent.promptTemplates;

        switch (actionType) {
            case AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT:
                return templates.INVALID_JSON_FEEDBACK({ agent, task, llmOutput: output.llmOutput || '' });

            case AGENT_STATUS_enum.THOUGHT:
                return templates.THOUGHT_FEEDBACK({ agent, task, thought: parsedOutput?.thought || '' });

            case AGENT_STATUS_enum.SELF_QUESTION:
                return templates.SELF_QUESTION_FEEDBACK({ agent, task, question: parsedOutput?.actionInput?.question as string || '' });

            case AGENT_STATUS_enum.OBSERVATION:
                return templates.OBSERVATION_FEEDBACK({ agent, task });

            case AGENT_STATUS_enum.WEIRD_LLM_OUTPUT:
                return templates.WEIRD_OUTPUT_FEEDBACK({ agent, task });

            default:
                return '';
        }
    }
}

export default OutputManager;
