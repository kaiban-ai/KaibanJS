/**
 * @file llmIntegration.test.ts
 * @path tests/llm/integration/llmIntegration.test.ts
 * @description Integration tests for LLM infrastructure
 */

import { jest } from '@jest/globals';
import { BaseMessage } from '@langchain/core/messages';
import { LLM_PROVIDER_enum, GROQ_MODEL_enum } from '../../../src/types/common/commonEnums';
import { LLMInitializationManager } from '../../../src/managers/domain/llm/llmInitializationManager';
import { LLMMetricsCollector } from '../../../src/metrics/LLMMetricsCollector';
import { llmAgentFactory } from '../../../src/managers/domain/llm/agent/llmAgentFactory';
import { providerAdapterFactory } from '../../../src/managers/domain/llm/agent/providers/providerAdapter';
import { IGroqConfig } from '../../../src/types/llm/llmProviderTypes';
import { IMessageHistory } from '../../../src/types/llm/message/messagingHistoryTypes';

describe('LLM Integration Tests', () => {
    let initManager: LLMInitializationManager;
    let metricsCollector: LLMMetricsCollector;

    beforeEach(() => {
        initManager = LLMInitializationManager.getInstance();
        metricsCollector = new LLMMetricsCollector();
    });

    describe('Provider Adapter Factory', () => {
        it('should register all supported providers', () => {
            const registeredProviders = Array.from(providerAdapterFactory['adapters'].keys());
            expect(registeredProviders).toContain(LLM_PROVIDER_enum.GROQ);
            expect(registeredProviders).toContain(LLM_PROVIDER_enum.OPENAI);
            expect(registeredProviders).toContain(LLM_PROVIDER_enum.ANTHROPIC);
            expect(registeredProviders).toContain(LLM_PROVIDER_enum.GOOGLE);
            expect(registeredProviders).toContain(LLM_PROVIDER_enum.MISTRAL);
        });

        it('should create provider-specific adapters', () => {
            const config: IGroqConfig = {
                provider: LLM_PROVIDER_enum.GROQ,
                model: GROQ_MODEL_enum.MIXTRAL,
                temperature: 0.7,
                maxTokens: 1000,
                apiKey: 'test-key'
            };

            const adapter = providerAdapterFactory.createAdapter(config);
            expect(adapter.provider).toBe(LLM_PROVIDER_enum.GROQ);
        });
    });

    describe('LLM Agent Factory', () => {
        it('should create provider-specific agents', async () => {
            const config: IGroqConfig = {
                provider: LLM_PROVIDER_enum.GROQ,
                model: GROQ_MODEL_enum.MIXTRAL,
                temperature: 0.7,
                maxTokens: 1000,
                apiKey: 'test-key'
            };

            const messageHistory: jest.Mocked<IMessageHistory> = {
                length: 0,
                addMessage: jest.fn().mockResolvedValue(undefined),
                getMessages: jest.fn().mockResolvedValue([]),
                clear: jest.fn().mockResolvedValue(undefined),
                addUserMessage: jest.fn().mockResolvedValue(undefined),
                addAIMessage: jest.fn().mockResolvedValue(undefined),
                addSystemMessage: jest.fn().mockResolvedValue(undefined),
                addFunctionMessage: jest.fn().mockResolvedValue(undefined)
            };

            const agent = llmAgentFactory.createAgent({
                llmConfig: config,
                messageHistory,
                metricsCollector
            });

            expect(agent._llmType()).toBe('groq-agent');
        });
    });

    describe('LLM Initialization Manager', () => {
        it('should initialize LLM instances', async () => {
            const config: IGroqConfig = {
                provider: LLM_PROVIDER_enum.GROQ,
                model: GROQ_MODEL_enum.MIXTRAL,
                temperature: 0.7,
                maxTokens: 1000,
                apiKey: 'test-key'
            };

            const result = await initManager.initializeLangchainModel(config);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.provider).toBe(LLM_PROVIDER_enum.GROQ);
        });

        it('should track initialization metrics', async () => {
            const config: IGroqConfig = {
                provider: LLM_PROVIDER_enum.GROQ,
                model: GROQ_MODEL_enum.MIXTRAL,
                temperature: 0.7,
                maxTokens: 1000,
                apiKey: 'test-key'
            };

            const result = await initManager.initializeLangchainModel(config);
            const metrics = initManager.getInitMetrics(result.data!.id);

            expect(metrics).toBeDefined();
            expect(metrics?.steps).toHaveLength(4); // validation, agent creation, instance creation, state sync
            expect(metrics?.duration).toBeGreaterThan(0);
        });

        it('should handle cleanup properly', async () => {
            const config: IGroqConfig = {
                provider: LLM_PROVIDER_enum.GROQ,
                model: GROQ_MODEL_enum.MIXTRAL,
                temperature: 0.7,
                maxTokens: 1000,
                apiKey: 'test-key'
            };

            const result = await initManager.initializeLangchainModel(config);
            const instance = result.data!;

            await instance.cleanup();
            const cleanedInstance = initManager.getInstance(instance.id);
            expect(cleanedInstance).toBeUndefined();
        });
    });

    describe('End-to-End Integration', () => {
        it('should handle a complete LLM interaction cycle', async () => {
            // Initialize
            const config: IGroqConfig = {
                provider: LLM_PROVIDER_enum.GROQ,
                model: GROQ_MODEL_enum.MIXTRAL,
                temperature: 0.7,
                maxTokens: 1000,
                apiKey: 'test-key'
            };

            const result = await initManager.initializeLangchainModel(config);
            const instance = result.data!;

            // Generate
            const response = await instance.generate([{ role: 'user', content: 'Hello!' }]);
            expect(response).toBeDefined();
            expect(response.generations).toHaveLength(1);

            // Stream
            const stream = instance.generateStream([{ role: 'user', content: 'Hello!' }]);
            for await (const chunk of stream) {
                expect(chunk).toBeDefined();
                expect(chunk.text).toBeDefined();
            }

            // Cleanup
            await instance.cleanup();
            const cleanedInstance = initManager.getInstance(instance.id);
            expect(cleanedInstance).toBeUndefined();
        });
    });
});
