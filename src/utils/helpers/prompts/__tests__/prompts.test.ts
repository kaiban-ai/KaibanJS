/**
 * @file prompts.test.ts
 * @path KaibanJS/src/utils/helpers/prompts/__tests__/prompts.test.ts
 * @description Tests for prompt system functionality
 */

import type { IReactChampionAgent } from '../../../../types/agent';
import type { ITaskType } from '../../../../types/task';
import { AGENT_STATUS_enum, TASK_STATUS_enum, BATCH_PRIORITY_enum } from '../../../../types/common/enumTypes';

import {
    defaultPrompts,
    validatePrompts,
    createPrompts,
    combineTemplates,
    withDefaults,
    wrapTemplate,
    selectPrompts,
    formatTemplate
} from '../';
import { ChatGroq } from '@langchain/groq';

const mockAgent: IReactChampionAgent = {
    // IBaseAgent properties
    id: 'test-agent',
    name: 'Test Agent',
    role: 'Test Role',
    goal: 'Test Goal',
    background: 'Test Background',
    version: '1.0.0',
    capabilities: {
        canThink: true,
        canUseTools: true,
        canLearn: true,
        canTeach: true,
        canDelegate: true,
        canCollaborate: true,
        supportedProviders: ['openai'],
        supportedModels: ['gpt-4'],
        supportedToolTypes: ['basic'],
        maxContextSize: 4096,
        maxConcurrentTasks: 1,
        memoryCapacity: 1000,
        features: {
            streaming: true,
            batching: true,
            caching: true,
            recovery: true,
            metrics: true
        }
    },
    tools: [],
    maxIterations: 10,
    status: AGENT_STATUS_enum.INITIAL,
    env: null,
    llmInstance: null,
    llmSystemMessage: null,
    forceFinalAnswer: false,
    promptTemplates: {} as any,
    messageHistory: {} as any,
    metadata: {
        id: 'test-agent',
        name: 'Test Agent',
        version: '1.0.0',
        type: 'react-champion',
        description: 'Test Description',
        capabilities: {
            canThink: true,
            canUseTools: true,
            canLearn: true,
            canTeach: true,
            canDelegate: true,
            canCollaborate: true,
            supportedProviders: ['openai'],
            supportedModels: ['gpt-4'],
            supportedToolTypes: ['basic'],
            maxContextSize: 4096,
            maxConcurrentTasks: 1,
            memoryCapacity: 1000,
            features: {
                streaming: true,
                batching: true,
                caching: true,
                recovery: true,
                metrics: true
            }
        },
        created: new Date(),
        modified: new Date(),
        status: AGENT_STATUS_enum.INITIAL
    },
    executionState: {
        currentStep: 0,
        totalSteps: 0,
        startTime: new Date(),
        lastUpdate: new Date(),
        status: AGENT_STATUS_enum.INITIAL
    },

    // IAgentType properties
    type: 'react-champion',
    description: 'Test Description',
    supportedModels: ['gpt-4'],
    supportedProviders: ['openai'],
    maxContextSize: 4096,
    features: {
        streaming: true,
        batching: true,
        caching: true
    },

    // IReactChampionAgent properties
    messages: [],
    context: '',
    history: {} as any,
    executableAgent: {
        runnable: new ChatGroq
    },
    execute: function (): Promise<void> {
        throw new Error('Function not implemented.');
    },
    pause: function (): Promise<void> {
        throw new Error('Function not implemented.');
    },
    resume: function (): Promise<void> {
        throw new Error('Function not implemented.');
    },
    stop: function (): Promise<void> {
        throw new Error('Function not implemented.');
    },
    reset: function (): Promise<void> {
        throw new Error('Function not implemented.');
    },
    validate: function (): Promise<boolean> {
        throw new Error('Function not implemented.');
    }
};

const mockTask: ITaskType = {
    id: 'test-task',
    title: 'Test Task',
    description: 'Test Description',
    expectedOutput: 'Test Output',
    status: TASK_STATUS_enum.PENDING,
    priority: BATCH_PRIORITY_enum.MEDIUM,
    agent: mockAgent,
    stepId: '1',
    isDeliverable: false,
    externalValidationRequired: false,
    inputs: {},
    metrics: {
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        iterationCount: 0,
        resources: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: {
                read: 0,
                write: 0
            },
            networkUsage: {
                upload: 0,
                download: 0
            },
            timestamp: Date.now()
        },
        performance: {
            executionTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            latency: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            throughput: {
                operationsPerSecond: 0,
                dataProcessedPerSecond: 0,
                requestsPerSecond: 0,
                bytesPerSecond: 0
            },
            responseTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            resourceUtilization: {} as any,
            timestamp: Date.now()
        },
        costs: {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        },
        usage: {
            totalRequests: 0,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: 0
            },
            timestamp: Date.now()
        },
        llmUsageMetrics: {
            totalRequests: 0,
            activeUsers: 0,
            activeInstances: 0,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: 0
            },
            tokenDistribution: {
                prompt: 0,
                completion: 0,
                total: 0
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 0
            },
            timestamp: Date.now(),
            component: '',
            category: '',
            version: ''
        }
    },
    progress: {
        status: TASK_STATUS_enum.PENDING,
        progress: 0,
        timeElapsed: 0
    },
    history: [],
    feedback: [],
    execute: async () => ({
        success: true,
        metadata: {
            taskId: 'test-task',
            taskName: 'Test Task',
            status: TASK_STATUS_enum.PENDING,
            priority: BATCH_PRIORITY_enum.MEDIUM,
            assignedAgent: 'test-agent',
            progress: 0,
            metrics: {
                resources: {} as any,
                usage: {} as any,
                performance: {} as any,
                timestamp: Date.now(),
                component: 'test',
                category: 'test',
                version: '1.0.0'
            },
            dependencies: {
                completed: [],
                pending: [],
                blocked: []
            },
            timestamp: Date.now(),
            performance: {} as any,
            context: {} as any,
            validation: {} as any,
            component: 'test',
            operation: 'test'
        }
    })
};

describe('Prompt System', () => {
    describe('Default Prompts', () => {
        it('should provide valid system message template', () => {
            const result = defaultPrompts.SYSTEM_MESSAGE({ agent: mockAgent, task: mockTask });
            
            expect(result).toContain(mockAgent.name);
            expect(result).toContain(mockAgent.role);
            expect(result).toContain(mockAgent.goal);
            expect(result).toContain(mockTask.expectedOutput);
        });

        it('should provide valid initial message template', () => {
            const result = defaultPrompts.INITIAL_MESSAGE({ 
                agent: mockAgent, 
                task: mockTask,
                context: 'Test Context'
            });
            
            expect(result).toContain(mockAgent.role);
            expect(result).toContain(mockTask.description);
            expect(result).toContain('Test Context');
        });
    });

    describe('Validation', () => {
        it('should validate complete prompts object', () => {
            expect(() => validatePrompts(defaultPrompts)).not.toThrow();
        });

        it('should throw on invalid prompts object', () => {
            const invalidPrompts = {
                SYSTEM_MESSAGE: defaultPrompts.SYSTEM_MESSAGE
            };
            expect(() => validatePrompts(invalidPrompts)).toThrow();
        });
    });

    describe('Creation', () => {
        it('should create prompts with overrides', () => {
            const customSystemMessage = () => 'Custom System Message';
            const prompts = createPrompts({
                SYSTEM_MESSAGE: customSystemMessage
            });

            expect(prompts.SYSTEM_MESSAGE({ agent: mockAgent, task: mockTask }))
                .toBe('Custom System Message');
            expect(prompts.INITIAL_MESSAGE)
                .toBe(defaultPrompts.INITIAL_MESSAGE);
        });
    });

    describe('Utilities', () => {
        it('should combine templates', () => {
            const template1 = () => 'Hello';
            const template2 = () => 'World';
            const combined = combineTemplates([template1, template2], ' ');

            expect(combined({})).toBe('Hello World');
        });

        it('should apply defaults', () => {
            const template = (params: { name: string; greeting?: string }) => 
                `${params.greeting || 'Hello'} ${params.name}`;
            const withDefaultGreeting = withDefaults(template, { greeting: 'Hi' });

            expect(withDefaultGreeting({ name: 'Test' })).toBe('Hi Test');
        });

        it('should wrap template', () => {
            const template = (params: { name: string }) => `Hello ${params.name}`;
            const wrapped = wrapTemplate(
                template,
                params => ({ name: params.name.toUpperCase() }),
                output => `${output}!`
            );

            expect(wrapped({ name: 'test' })).toBe('Hello TEST!');
        });

        it('should select prompts', () => {
            const selected = selectPrompts(defaultPrompts, ['SYSTEM_MESSAGE', 'INITIAL_MESSAGE']);
            
            expect(Object.keys(selected)).toHaveLength(2);
            expect(selected.SYSTEM_MESSAGE).toBeDefined();
            expect(selected.INITIAL_MESSAGE).toBeDefined();
        });

        it('should format template', () => {
            const template = `
                Hello
                  World
                    !
            `;
            const formatted = formatTemplate(template, 2);
            
            expect(formatted).toBe('Hello\n  World\n    !');
        });
    });
});
