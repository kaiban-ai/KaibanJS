/**
 * @file agentDomain.test.ts
 * @description Tests for agent domain components after migration
 */

import { AgentStateManager } from '../../src/managers/domain/agent/agentStateManager';
import { AgentMetricsManager } from '../../src/managers/domain/agent/agentMetricsManager';
import { AgentValidator } from '../../src/managers/domain/agent/agentValidator';
import { AgentEventHandler } from '../../src/managers/domain/agent/agentEventHandler';
import { AGENT_STATUS_enum } from '../../src/types/common/commonEnums';
import type { IAgentType } from '../../src/types/agent/agentBaseTypes';
import type { IAgentExecutionState } from '../../src/types/agent/agentStateTypes';

describe('Agent Domain Tests', () => {
    let stateManager: AgentStateManager;
    let metricsManager: AgentMetricsManager;
    let validator: AgentValidator;
    let eventHandler: AgentEventHandler;

    beforeEach(() => {
        stateManager = AgentStateManager.getInstance();
        metricsManager = AgentMetricsManager.getInstance();
        validator = AgentValidator.getInstance();
        eventHandler = AgentEventHandler.getInstance();
    });

    afterEach(() => {
        stateManager.cleanup();
        metricsManager.cleanup();
        validator.cleanup();
        eventHandler.cleanup();
    });

    describe('AgentStateManager', () => {
        const mockAgent: IAgentType = {
            id: 'test-agent',
            name: 'Test Agent',
            role: 'tester',
            goal: 'testing',
            version: '1.0.0',
            status: AGENT_STATUS_enum.INITIAL,
            capabilities: {
                canThink: true,
                canUseTools: true,
                canLearn: true,
                supportedToolTypes: ['test']
            },
            tools: [],
            maxIterations: 10,
            store: null,
            env: null,
            llmInstance: null,
            llmConfig: {},
            llmSystemMessage: null,
            forceFinalAnswer: false,
            promptTemplates: {},
            messageHistory: { messages: [] },
            metadata: {
                id: 'test-agent',
                name: 'Test Agent',
                capabilities: ['test'],
                skills: ['test'],
                created: new Date()
            },
            executionState: {
                status: AGENT_STATUS_enum.INITIAL,
                thinking: false,
                busy: false,
                startTime: new Date(),
                lastActiveTime: new Date(),
                errorCount: 0,
                retryCount: 0,
                maxRetries: 3,
                assignedTasks: [],
                completedTasks: [],
                failedTasks: [],
                blockedTasks: [],
                iterations: 0,
                maxIterations: 10,
                performance: {
                    completedTaskCount: 0,
                    failedTaskCount: 0,
                    averageTaskDuration: 0,
                    successRate: 1,
                    averageIterationsPerTask: 0
                },
                metrics: {
                    resources: {
                        cpuUsage: 0,
                        memoryUsage: 0,
                        diskIO: { read: 0, write: 0 },
                        networkUsage: { upload: 0, download: 0 },
                        gpuMemoryUsage: 0,
                        modelMemoryAllocation: {
                            weights: 0,
                            cache: 0,
                            workspace: 0
                        },
                        timestamp: Date.now()
                    },
                    performance: {
                        executionTime: { total: 0, average: 0, min: 0, max: 0 },
                        latency: { total: 0, average: 0, min: 0, max: 0 },
                        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                        responseTime: { total: 0, average: 0, min: 0, max: 0 },
                        queueLength: 0,
                        errorRate: 0,
                        successRate: 1,
                        errorMetrics: { totalErrors: 0, errorRate: 0 },
                        resourceUtilization: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            gpuMemoryUsage: 0,
                            modelMemoryAllocation: {
                                weights: 0,
                                cache: 0,
                                workspace: 0
                            },
                            timestamp: Date.now()
                        },
                        tokensPerSecond: 0,
                        coherenceScore: 1,
                        temperatureImpact: 0,
                        timestamp: Date.now()
                    },
                    usage: {
                        totalRequests: 0,
                        activeInstances: 0,
                        requestsPerSecond: 0,
                        averageResponseLength: 0,
                        peakMemoryUsage: 0,
                        uptime: 0,
                        rateLimit: {
                            current: 0,
                            limit: 100,
                            remaining: 100,
                            resetTime: Date.now() + 3600000
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
                        timestamp: Date.now()
                    },
                    timestamp: Date.now()
                },
                history: [{
                    timestamp: new Date(),
                    action: 'AGENT_CREATED',
                    details: {
                        agentId: 'test-agent',
                        agentType: 'Test Agent'
                    }
                }]
            }
        };

        test('should add and retrieve agent with blockedTasks and history', async () => {
            await stateManager.addAgent(mockAgent);
            const retrievedAgent = stateManager.getAgent(mockAgent.id);
            
            expect(retrievedAgent).toBeDefined();
            expect(retrievedAgent?.executionState.blockedTasks).toEqual([]);
            expect(retrievedAgent?.executionState.history).toHaveLength(1);
            expect(retrievedAgent?.executionState.history[0].action).toBe('AGENT_CREATED');
        });

        test('should update agent state with new blocked tasks', async () => {
            await stateManager.addAgent(mockAgent);
            
            const updatedState: Partial<IAgentExecutionState> = {
                ...mockAgent.executionState,
                blockedTasks: [{
                    id: 'blocked-task',
                    type: 'test',
                    status: 'blocked',
                    priority: 1,
                    created: new Date()
                }]
            };

            await stateManager.updateAgent(mockAgent.id, {
                ...mockAgent,
                executionState: updatedState as IAgentExecutionState
            });

            const retrievedAgent = stateManager.getAgent(mockAgent.id);
            expect(retrievedAgent?.executionState.blockedTasks).toHaveLength(1);
            expect(retrievedAgent?.executionState.blockedTasks[0].id).toBe('blocked-task');
        });

        test('should maintain history when updating agent state', async () => {
            await stateManager.addAgent(mockAgent);
            
            const newHistoryEntry = {
                timestamp: new Date(),
                action: 'TEST_ACTION',
                details: { test: true }
            };

            const updatedState: Partial<IAgentExecutionState> = {
                ...mockAgent.executionState,
                history: [...mockAgent.executionState.history, newHistoryEntry]
            };

            await stateManager.updateAgent(mockAgent.id, {
                ...mockAgent,
                executionState: updatedState as IAgentExecutionState
            });

            const retrievedAgent = stateManager.getAgent(mockAgent.id);
            expect(retrievedAgent?.executionState.history).toHaveLength(2);
            expect(retrievedAgent?.executionState.history[1]).toEqual(newHistoryEntry);
        });
    });

    describe('AgentMetricsManager', () => {
        test('should track blocked tasks in metrics', async () => {
            const metrics = await metricsManager.getCurrentMetrics();
            expect(metrics.usage.state.blockedTaskCount).toBeDefined();
            expect(metrics.usage.state.blockedTaskCount).toBe(0);
        });

        test('should track history entries in metrics', async () => {
            const metrics = await metricsManager.getCurrentMetrics();
            expect(metrics.usage.state.historyEntryCount).toBeDefined();
            expect(metrics.usage.state.historyEntryCount).toBe(0);
            expect(metrics.usage.state.lastHistoryUpdate).toBeDefined();
            expect(metrics.usage.state.lastHistoryUpdate).toBeLessThanOrEqual(Date.now());
        });
    });

    describe('AgentValidator', () => {
        test('should validate blocked tasks array', async () => {
            const invalidAgent = {
                ...mockAgent,
                executionState: {
                    ...mockAgent.executionState,
                    blockedTasks: 'not-an-array' as any
                }
            };

            const result = await validator.validateAgent(invalidAgent);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('blockedTasks must be an array');
        });

        test('should validate history array', async () => {
            const invalidAgent = {
                ...mockAgent,
                executionState: {
                    ...mockAgent.executionState,
                    history: 'not-an-array' as any
                }
            };

            const result = await validator.validateAgent(invalidAgent);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('history must be an array');
        });

        test('should validate history entry structure', async () => {
            const invalidAgent = {
                ...mockAgent,
                executionState: {
                    ...mockAgent.executionState,
                    history: [{
                        timestamp: 'not-a-date',
                        action: 123,
                        details: 'not-an-object'
                    }] as any
                }
            };

            const result = await validator.validateAgent(invalidAgent);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('history[0].timestamp must be a Date object');
            expect(result.errors).toContain('history[0].action must be a string');
            expect(result.errors).toContain('history[0].details must be an object');
        });
    });

    describe('AgentEventHandler', () => {
        test('should handle agent creation with history', async () => {
            await eventHandler.onAgentCreated({
                id: 'test-event',
                timestamp: Date.now(),
                type: 'AGENT_CREATED',
                agentId: mockAgent.id,
                agentType: mockAgent,
                metadata: {
                    source: 'test',
                    target: 'test',
                    timestamp: Date.now(),
                    correlationId: 'test',
                    causationId: 'test',
                    component: 'test',
                    operation: 'test',
                    validation: { isValid: true, errors: [], warnings: [] },
                    performance: {} as any,
                    context: {},
                    agent: {} as any
                }
            });

            const agent = stateManager.getAgent(mockAgent.id);
            expect(agent?.executionState.history).toBeDefined();
            expect(agent?.executionState.history).toHaveLength(1);
            expect(agent?.executionState.history[0].action).toBe('AGENT_CREATED');
        });

        test('should update history on status change', async () => {
            await eventHandler.onAgentCreated({
                id: 'test-event',
                timestamp: Date.now(),
                type: 'AGENT_CREATED',
                agentId: mockAgent.id,
                agentType: mockAgent,
                metadata: {
                    source: 'test',
                    target: 'test',
                    timestamp: Date.now(),
                    correlationId: 'test',
                    causationId: 'test',
                    component: 'test',
                    operation: 'test',
                    validation: { isValid: true, errors: [], warnings: [] },
                    performance: {} as any,
                    context: {},
                    agent: {} as any
                }
            });

            await eventHandler.onAgentStatusChanged({
                id: 'test-event',
                timestamp: Date.now(),
                type: 'AGENT_STATUS_CHANGED',
                agentId: mockAgent.id,
                previousStatus: AGENT_STATUS_enum.INITIAL,
                newStatus: AGENT_STATUS_enum.ACTIVE,
                reason: 'test',
                metadata: {
                    source: 'test',
                    target: 'test',
                    timestamp: Date.now(),
                    correlationId: 'test',
                    causationId: 'test',
                    component: 'test',
                    operation: 'test',
                    validation: { isValid: true, errors: [], warnings: [] },
                    performance: {} as any,
                    context: {},
                    agent: {} as any
                }
            });

            const agent = stateManager.getAgent(mockAgent.id);
            expect(agent?.executionState.history).toHaveLength(2);
            expect(agent?.executionState.history[1].action).toBe('STATUS_CHANGED');
            expect(agent?.executionState.history[1].details.previousStatus).toBe(AGENT_STATUS_enum.INITIAL);
            expect(agent?.executionState.history[1].details.newStatus).toBe(AGENT_STATUS_enum.ACTIVE);
        });
    });
});
