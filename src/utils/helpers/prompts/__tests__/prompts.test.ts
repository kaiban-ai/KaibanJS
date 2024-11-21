/**
 * @file prompts.test.ts
 * @path KaibanJS/src/utils/helpers/prompts/__tests__/prompts.test.ts
 * @description Tests for prompt system functionality
 */

import type { IAgentType, IReactChampionAgent } from '../../../../types/agent';
import type { ITaskType } from '../../../../types/task';
import type { IAgenticLoopResult } from '../../../../types/llm';
import { AGENT_STATUS_enum, TASK_STATUS_enum } from '../../../../types/common';

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

// Jest type declarations
declare global {
    namespace jest {
        interface Expect {
            <T = any>(actual: T): jest.Matchers<T>;
        }
        interface Matchers<R> {
            toBe(expected: any): R;
            toContain(expected: string): R;
            toBeDefined(): R;
            toHaveLength(expected: number): R;
            toThrow(expected?: string | Error): R;
            not: Matchers<R>;
        }
    }

    const describe: (name: string, fn: () => void) => void;
    const it: (name: string, fn: () => void | Promise<void>) => void;
    const expect: jest.Expect;
}

describe('Prompt System', () => {
    // Test data
    const mockAgent: IReactChampionAgent = {
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
            supportedToolTypes: ['basic'],
            supportedTools: [],
            maxConcurrentTasks: 1,
            memoryCapacity: 1000
        },
        validationSchema: {
            required: [],
            constraints: {
                name: {
                    minLength: 1,
                    maxLength: 100
                }
            }
        },
        tools: [],
        status: AGENT_STATUS_enum.INITIAL,
        env: null,
        llmConfig: { provider: 'none' },
        llmInstance: null,
        llmSystemMessage: null,
        forceFinalAnswer: false,
        maxIterations: 10,
        promptTemplates: {} as any,
        messageHistory: {} as any,
        store: {} as any,
        metadata: {
            id: 'test-agent',
            name: 'Test Agent',
            capabilities: [],
            skills: [],
            created: new Date()
        },
        executionState: {} as any,
        executableAgent: {} as any,
        initialize: () => {},
        setStore: () => {},
        setStatus: () => {},
        setEnv: () => {},
        workOnTask: async () => ({
            success: true,
            metadata: {
                iterations: 0,
                maxAgentIterations: 10,
                startTime: Date.now(),
                endTime: Date.now()
            }
        }),
        workOnFeedback: async () => {},
        normalizeLlmConfig: (config: any) => config,
        createLLMInstance: () => {},
        handleIterationStart: () => {},
        handleIterationEnd: () => {},
        handleThinkingError: () => {},
        handleMaxIterationsError: () => {},
        handleAgenticLoopError: () => {},
        handleTaskCompleted: () => {},
        handleFinalAnswer: () => {},
        handleIssuesParsingLLMOutput: () => ''
    };

    const mockTask: ITaskType = {
        id: 'test-task',
        title: 'Test Task',
        description: 'Test Description',
        expectedOutput: 'Test Output',
        status: TASK_STATUS_enum.PENDING,
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
                memory: 0,
                cpu: 0,
                tokens: 0
            },
            performance: {
                averageIterationTime: 0,
                averageTokensPerSecond: 0,
                peakMemoryUsage: 0
            },
            costs: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            },
            llmUsage: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0,
                totalLatency: 0,
                averageLatency: 0,
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
            }
        },
        progress: {
            status: TASK_STATUS_enum.PENDING,
            progress: 0,
            timeElapsed: 0
        },
        history: [],
        feedback: [],
        setStore: () => {},
        execute: async () => ({})
    };

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
