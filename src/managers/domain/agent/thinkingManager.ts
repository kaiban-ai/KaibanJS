/**
 * @file thinkingManager.ts
 * @description Centralized manager for agent thinking processes and LLM interactions
 */

import { AIMessage, SystemMessage } from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';
import OutputManager from '../llm/outputManager.js';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import { CoreManager } from '../../core/coreManager';
import { AgentManager } from './agentManager';
import { createError } from '../../../types/common/errorTypes';
import { AGENT_STATUS_enum, MANAGER_CATEGORY_enum, LLM_PROVIDER_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { modelsPricing } from '../../../utils/helpers/llm/llmCostCalculator';

import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IThinkingMetricsAccessor } from '../../../types/agent/agentMetricsAccessor';
import type { IThinkingExecutionParams, IThinkingResult, IThinkingHandlerResult, IThinkingMetadata } from '../../../types/agent/agentHandlersTypes';
import type { ICostDetails } from '../../../types/workflow/workflowCostsTypes';
import type { IMetricsManager } from '../../../types/metrics/base/metricsManagerTypes';

export class ThinkingManager extends CoreManager implements IThinkingMetricsAccessor {
    private static instance: ThinkingManager;
    private isInitialized = false;
    private readonly agentManager: AgentManager;
    private readonly metricsManager: IMetricsManager;
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;

    private constructor() {
        super();
        this.agentManager = AgentManager.getInstance();
        this.metricsManager = this.getDomainManager<IMetricsManager>('MetricsManager');
        this.registerDomainManager('ThinkingManager', this);
    }

    public static getInstance(): ThinkingManager {
        if (!ThinkingManager.instance) {
            ThinkingManager.instance = new ThinkingManager();
        }
        return ThinkingManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.safeExecute(async () => {
                this.isInitialized = true;
                this.logInfo('Thinking manager initialized');
            }, 'initialize');
        } catch (error) {
            await this.trackMetric(MetricType.ERROR, error);
            throw createError({
                message: 'Failed to initialize thinking manager',
                type: ERROR_KINDS.InitializationError,
                context: { error }
            });
        }
    }

    public async validate(): Promise<boolean> {
        return this.isInitialized;
    }

    private async trackMetric(type: MetricType, value: unknown, metadata?: Record<string, unknown>): Promise<void> {
        await this.metricsManager.trackMetric({
            domain: MetricDomain.AGENT,
            type,
            value: typeof value === 'number' ? value : 0,
            metadata: {
                component: this.constructor.name,
                ...metadata
            }
        });
    }

    public async executeThinking(params: IThinkingExecutionParams): Promise<IThinkingHandlerResult<IThinkingResult>> {
        const startTime = Date.now();
        
        try {
            const { task, ExecutableAgent, feedbackMessage, agent } = params;
            
            if (!agent) {
                throw new Error('Agent is required for thinking execution');
            }

            const { chain, messageHistory } = await this.setupThinkingChain(agent, ExecutableAgent);
            const result = await this.executeChain(chain, feedbackMessage, task.id);
            const outputResult = await this.processOutput(result);

            await this.trackMetric(MetricType.PERFORMANCE, Date.now() - startTime, {
                agentId: agent.id,
                taskId: task.id,
                tokenUsage: result.llmOutput?.tokenUsage
            });

            const metadata = await this.createThinkingMetadata(agent, task, startTime, result);

            return {
                success: true,
                data: {
                    metrics: {
                        duration: Date.now() - startTime,
                        tokenUsage: result.llmOutput?.tokenUsage
                    },
                    messages: [new AIMessage(outputResult.data || '')],
                    output: result
                },
                metadata,
                error: undefined
            };
        } catch (error) {
            await this.trackMetric(MetricType.ERROR, error);
            const metadata = await this.createErrorMetadata(params, startTime);

            return {
                success: false,
                data: undefined,
                metadata,
                error: createError({
                    message: 'Thinking execution failed',
                    type: ERROR_KINDS.ExecutionError,
                    context: { error }
                })
            };
        }
    }

    private async setupThinkingChain(agent: IAgentType, ExecutableAgent: any) {
        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(agent.llmSystemMessage || ''),
            new MessagesPlaceholder('history'),
            new MessagesPlaceholder('input')
        ]);

        const messageHistory = new ChatMessageHistory();
        for (const message of agent.messageHistory.messages) {
            await messageHistory.addMessage(new AIMessage(message.message.text));
        }

        const chain = new RunnableWithMessageHistory({
            runnable: prompt.pipe(ExecutableAgent),
            getMessageHistory: async () => messageHistory,
            inputMessagesKey: 'input',
            historyMessagesKey: 'history',
            outputMessagesKey: 'output'
        });

        return { chain, messageHistory };
    }

    private async executeChain(chain: any, feedbackMessage: string | undefined, taskId: string): Promise<LLMResult> {
        return chain.invoke(
            { input: feedbackMessage ? [new AIMessage(feedbackMessage)] : [] },
            {
                configurable: {
                    timeout: 60000,
                    metadata: { taskId },
                    tags: ['thinking']
                }
            }
        ) as Promise<LLMResult>;
    }

    private async processOutput(result: LLMResult) {
        return OutputManager.processMessageSequence(
            result.generations[0].map(gen => new AIMessage(gen.text)),
            result.generations[0][0].text
        );
    }

    private calculateModelCosts(tokenDistribution: any, modelCode: string, provider: LLM_PROVIDER_enum): ICostDetails {
        const modelPricing = modelsPricing[provider]?.[modelCode];
        if (!modelPricing) {
            return this.createDefaultCostDetails();
        }

        const inputCost = (tokenDistribution.prompt / 1000) * modelPricing.inputCostPer1K;
        const outputCost = (tokenDistribution.completion / 1000) * modelPricing.outputCostPer1K;

        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: tokenDistribution.prompt, cost: inputCost },
                completionTokens: { count: tokenDistribution.completion, cost: outputCost }
            }
        };
    }

    private createDefaultCostDetails(): ICostDetails {
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        };
    }
}

export default ThinkingManager.getInstance();