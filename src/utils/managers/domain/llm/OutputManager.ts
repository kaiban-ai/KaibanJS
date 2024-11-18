/**
 * @file outputManager.ts
 * @path src/utils/managers/domain/llm/outputManager.ts
 * @description Output processing and validation for LLM responses with CoreManager integration
 */

import CoreManager from '../../core/coreManager';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { getParsedJSON } from '@/utils/parsers/parser';

import type {
    Output,
    ParsedOutput,
    LLMResponse
} from '@/utils/types/llm/responses';

import type {
    ParsingHandlerParams,
    ParseErrorHandlerParams,
    OutputProcessResult,
    OutputValidationResult
} from '@/utils/types/llm/parsing';

import type { 
    AgentType,
    TaskType 
} from '@/utils/types';

export class OutputManager extends CoreManager {
    private static instance: OutputManager;

    private constructor() {
        super();
        this.registerDomainManager('OutputManager', this);
    }

    public static getInstance(): OutputManager {
        if (!OutputManager.instance) {
            OutputManager.instance = new OutputManager();
        }
        return OutputManager.instance;
    }

    public async processLLMResponse(response: LLMResponse): Promise<Output> {
        return await this.safeExecute(async () => {
            const rawOutput = response.rawOutput?.toString() || '';
            const parsedOutput = getParsedJSON(rawOutput);

            if (!parsedOutput) {
                throw new Error('Failed to parse LLM response');
            }

            return {
                llmOutput: rawOutput,
                llmUsageStats: {
                    inputTokens: response.usage.promptTokens,
                    outputTokens: response.usage.completionTokens,
                    callsCount: 1,
                    callsErrorCount: 0,
                    parsingErrors: 0,
                    totalLatency: response.metadata.latency,
                    averageLatency: response.metadata.latency,
                    lastUsed: Date.now(),
                    memoryUtilization: {
                        peakMemoryUsage: 0,
                        averageMemoryUsage: 0,
                        cleanupEvents: 0
                    },
                    costBreakdown: {
                        input: 0,
                        output: 0,
                        total: 0,
                        currency: 'USD'
                    }
                },
                ...parsedOutput
            };
        }, 'LLM response processing failed');
    }

    public async processOutput(
        output: Output,
        agent: AgentType,
        task: TaskType
    ): Promise<OutputProcessResult> {
        return await this.safeExecute(async () => {
            const parsedOutput = await this.parseOutput(output.llmOutput || '');
            const actionType = this.determineActionType(parsedOutput);

            const validationResult = await this.validateOutput(parsedOutput, agent, task);
            if (!validationResult.isValid) {
                throw validationResult.error || new Error('Invalid output');
            }

            const feedback = await this.generateFeedback(actionType, parsedOutput, output, agent, task);

            this.log('Output processed successfully', agent.name, task.id);

            return {
                actionType,
                parsedOutput,
                feedback,
                shouldContinue: actionType !== AGENT_STATUS_enum.FINAL_ANSWER
            };

        }, 'Output processing failed');
    }

    private async parseOutput(content: string): Promise<ParsedOutput | null> {
        return await this.safeExecute(async () => {
            const parsed = getParsedJSON(content);
            if (!parsed) return null;

            return {
                thought: parsed.thought,
                action: parsed.action,
                actionInput: parsed.actionInput || undefined,
                observation: parsed.observation,
                isFinalAnswerReady: parsed.isFinalAnswerReady,
                finalAnswer: parsed.finalAnswer,
                metadata: {
                    reasoning: parsed.reasoning,
                    confidence: parsed.confidence,
                    alternativeActions: parsed.alternativeActions,
                    metrics: parsed.metrics,
                    context: parsed.context
                }
            };
        }, 'Output parsing failed');
    }

    private async validateOutput(
        parsedOutput: ParsedOutput | null,
        agent: AgentType,
        task: TaskType
    ): Promise<OutputValidationResult> {
        return await this.safeExecute(async () => {
            if (!parsedOutput) {
                return {
                    isValid: false,
                    error: new Error('Failed to parse output')
                };
            }

            if (parsedOutput.finalAnswer && 
                typeof parsedOutput.finalAnswer !== 'string' && 
                typeof parsedOutput.finalAnswer !== 'object') {
                return {
                    isValid: false,
                    error: new Error('Invalid final answer format')
                };
            }

            if (parsedOutput.action && !this.validateActionFormat(parsedOutput)) {
                return {
                    isValid: false,
                    error: new Error('Invalid action format')
                };
            }

            return { isValid: true };
        }, 'Output validation failed');
    }

    private determineActionType(
        parsedOutput: ParsedOutput | null
    ): keyof typeof AGENT_STATUS_enum {
        if (!parsedOutput) {
            return AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT;
        }

        if (parsedOutput.finalAnswer) {
            return AGENT_STATUS_enum.FINAL_ANSWER;
        }

        if (parsedOutput.action === 'self_question') {
            return parsedOutput.thought 
                ? AGENT_STATUS_enum.THOUGHT 
                : AGENT_STATUS_enum.SELF_QUESTION;
        }

        if (parsedOutput.action) {
            return AGENT_STATUS_enum.EXECUTING_ACTION;
        }

        if (parsedOutput.observation) {
            return AGENT_STATUS_enum.OBSERVATION;
        }

        return AGENT_STATUS_enum.WEIRD_LLM_OUTPUT;
    }

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
                return templates.INVALID_JSON_FEEDBACK({ 
                    agent, task, llmOutput: output.llmOutput || '' 
                });

            case AGENT_STATUS_enum.THOUGHT:
                return templates.THOUGHT_FEEDBACK({ 
                    agent, task, thought: parsedOutput?.thought || '' 
                });

            case AGENT_STATUS_enum.SELF_QUESTION:
                return templates.SELF_QUESTION_FEEDBACK({ 
                    agent, task, question: parsedOutput?.actionInput?.question as string || '' 
                });

            case AGENT_STATUS_enum.OBSERVATION:
                return templates.OBSERVATION_FEEDBACK({ agent, task });

            case AGENT_STATUS_enum.WEIRD_LLM_OUTPUT:
                return templates.WEIRD_OUTPUT_FEEDBACK({ agent, task });

            default:
                return '';
        }
    }

    private validateActionFormat(parsedOutput: ParsedOutput): boolean {
        return typeof parsedOutput.action === 'string' && 
               (!parsedOutput.actionInput || typeof parsedOutput.actionInput === 'object');
    }

    private async handleParsingError(params: ParseErrorHandlerParams): Promise<void> {
        const { agent, task, output, llmOutput, error } = params;

        await this.handleStatusTransition({
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT,
            entity: 'agent',
            entityId: agent.id,
            metadata: {
                llmOutput,
                timestamp: Date.now()
            }
        });

        this.log('Output parsing error:', agent.name, task.id, 'error', error);
    }
}

export default OutputManager.getInstance();